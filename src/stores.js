// Boutiques PC en plus de Steam et Epic : GOG, Ubisoft Connect, Battle.net, Xbox / Game Pass.
// Plus les jeux Steam et Epic possédés mais pas installés.
// Tout est lu sur le PC (registre, fichiers des boutiques) : aucun compte à connecter.
const fs = require('fs');
const path = require('path');
const { run, exists, readText } = require('./util');

function slug(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// « reg query /s » avec le nom de chaque clé.
function parseRegTree(out) {
  const res = [];
  let cur = null;
  for (const line of String(out).split(/\r?\n/)) {
    if (/^HKEY_/.test(line)) { cur = { __key: line.trim() }; res.push(cur); continue; }
    const m = line.match(/^\s{4}(\S[^\t]*?)\s{4}(REG_\w+)\s{4}(.*)$/);
    if (m && cur) cur[m[1]] = m[3];
  }
  return res;
}
async function regTree(key) {
  try { return parseRegTree(await run('reg', ['query', key, '/s'])); } catch { return []; }
}
const lastPart = (k) => k.split('\\').pop();

function bigExes(dir, max = 8) {
  const out = [];
  const walk = (d, depth) => {
    let list = [];
    try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { if (depth > 0 && !/^(redist|_commonredist|directx|vcredist|support|__installer|installer)$/i.test(e.name)) walk(full, depth - 1); continue; }
      if (!/\.exe$/i.test(e.name) || /unins|crash|report|setup|redist|launcher|helper|update|easyanticheat|battleye/i.test(e.name)) continue;
      try { if (fs.statSync(full).size > 1.5e6) out.push(e.name.toLowerCase()); } catch {}
    }
  };
  if (dir && exists(dir)) walk(dir, 3);
  return [...new Set(out)].slice(0, max);
}

// --- GOG ------------------------------------------------------------------------------------
async function scanGog() {
  const games = [];
  for (const e of await regTree('HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games')) {
    const id = e.gameID || lastPart(e.__key);
    if (!/^\d+$/.test(id) || !e.gameName) continue;
    if (e.dependsOn && e.dependsOn.trim()) continue; // contenu additionnel
    const dir = e.path || e.PATH;
    const exe = e.exe || e.EXE || e.launchCommand;
    if (!dir || !exists(dir)) continue;
    const target = exe && exists(exe.replace(/^"|"$/g, '')) ? exe.replace(/^"|"$/g, '') : null;
    if (!target) continue;
    games.push({
      id: `gog:${id}`, name: e.gameName.trim(), platform: 'pc', source: 'gog', installDir: dir,
      launch: { type: 'exe', target, args: e.launchParam ? e.launchParam.match(/(?:[^\s"]+|"[^"]*")+/g).map((a) => a.replace(/^"|"$/g, '')) : [], cwd: e.workingDir && exists(e.workingDir) ? e.workingDir : dir },
      exeHints: [path.basename(target).toLowerCase(), ...bigExes(dir)],
    });
  }
  return games;
}

// --- Ubisoft Connect ------------------------------------------------------------------------
async function scanUbisoft() {
  const games = [];
  const installs = await regTree('HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs');
  if (!installs.length) return games;
  const names = {};
  for (const root of ['HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall']) {
    for (const e of await regTree(root)) {
      const m = lastPart(e.__key).match(/^Uplay Install (\d+)$/i);
      if (m && e.DisplayName) names[m[1]] = e.DisplayName.trim();
    }
  }
  for (const e of installs) {
    const id = lastPart(e.__key);
    if (!/^\d+$/.test(id) || !e.InstallDir) continue;
    const dir = path.normalize(e.InstallDir.replace(/\//g, '\\'));
    if (!exists(dir)) continue;
    games.push({
      id: `ubisoft:${id}`, name: names[id] || path.basename(dir), platform: 'pc', source: 'ubisoft', installDir: dir,
      launch: { type: 'uri', target: `uplay://launch/${id}/0` },
      exeHints: bigExes(dir),
    });
  }
  return games;
}

// --- Battle.net (codes produit repris de Playnite) ----------------------------------------
const BNET = {
  wow: 'WoW', wow_classic: 'WoWC', diablo3: 'D3', s2: 'S2', s1: 'S1', hs_beta: 'WTCG', heroes: 'Hero', prometheus: 'Pro',
  viper: 'VIPR', odin: 'ODIN', w3: 'W3', lazarus: 'LAZR', zeus: 'ZEUS', wlby: 'WLBY', osi: 'OSI', rtro: 'RTRO', fore: 'FORE',
  anbs: 'ANBS', auks: 'AUKS', fen: 'Fen', d1: 'D1', w1r: 'W1R', w2r: 'W2R', w1: 'W1', w2: 'W2', gryphon: 'GRY', aris: 'ARIS',
  scorpio: 'SCOR', arkansas: 'ARK', libra: 'LBRA', pinta: 'PNTA', aqua: 'AQUA',
};
async function scanBattleNet() {
  const games = [];
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const client = [path.join(pf86, 'Battle.net', 'Battle.net.exe'), path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Battle.net', 'Battle.net.exe')].find(exists);
  if (!client) return games;
  const seen = new Set();
  for (const root of ['HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall']) {
    for (const e of await regTree(root)) {
      const m = `${e.UninstallString || ''} `.match(/Battle\.net.*--uid=(.*?)\s/i);
      if (!m || !e.DisplayName) continue;
      const uid = m[1].replace(/"/g, '').toLowerCase();
      const code = BNET[uid] || BNET[uid.split('_')[0]];
      if (!code || seen.has(code)) continue;
      const dir = e.InstallLocation && exists(e.InstallLocation) ? e.InstallLocation : null;
      if (!dir) continue;
      seen.add(code);
      games.push({
        id: `bnet:${code.toLowerCase()}`, name: e.DisplayName.trim(), platform: 'pc', source: 'battlenet', installDir: dir,
        launch: { type: 'exe', target: client, args: [`--exec=launch ${code}`] },
        exeHints: bigExes(dir), noChildTracking: true,
      });
    }
  }
  return games;
}

// --- Xbox / Game Pass (jeux du Microsoft Store reconnaissables à MicrosoftGame.config) ---
const XBOX_PS = `$ErrorActionPreference='SilentlyContinue'
$l = Get-AppxPackage | Where-Object { $_.InstallLocation -and -not $_.IsFramework -and (Test-Path -LiteralPath (Join-Path $_.InstallLocation 'MicrosoftGame.config')) } | ForEach-Object { [pscustomobject]@{ n = $_.Name; f = $_.PackageFamilyName; d = $_.InstallLocation } }
@($l) | ConvertTo-Json -Compress`;

function attr(xml, tag, name) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]+)"`, 'i'));
  return m ? m[1] : null;
}
function xmlUnescape(s) { return String(s || '').replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

function xboxGameFromPackage(p) {
  const cfg = readText(path.join(p.d, 'MicrosoftGame.config')) || '';
  const man = readText(path.join(p.d, 'AppxManifest.xml')) || '';
  let name = attr(cfg, 'ShellVisuals', 'DefaultDisplayName');
  if (!name || /^ms-resource:/i.test(name)) { const dn = (man.match(/<DisplayName>([^<]+)<\/DisplayName>/i) || [])[1]; if (dn && !/^ms-resource:/i.test(dn)) name = dn; }
  if (!name || /^ms-resource:/i.test(name)) name = p.n.replace(/^[^.]+\./, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const appId = attr(man, 'Application', 'Id') || attr(cfg, 'Executable', 'Id') || 'Game';
  const exe = attr(cfg, 'Executable', 'Name');
  return {
    id: `xbox:${p.f.toLowerCase()}`, name: xmlUnescape(name).trim(), platform: 'pc', source: 'xbox', installDir: p.d,
    launch: { type: 'shell', target: `shell:AppsFolder\\${p.f}!${appId}` },
    exeHints: [exe ? path.basename(exe).toLowerCase() : null, ...bigExes(p.d)].filter(Boolean),
  };
}
async function scanXbox() {
  if (process.platform !== 'win32') return [];
  let out = '';
  try { out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', XBOX_PS]); } catch { return []; }
  let list = [];
  try { list = JSON.parse(out.trim() || '[]'); } catch { return []; }
  if (!Array.isArray(list)) list = [list];
  const games = [];
  for (const p of list) { if (p && p.d && p.f) { try { games.push(xboxGameFromPackage(p)); } catch {} } }
  return games;
}

// --- Jeux possédés mais pas installés ----------------------------------------------------
// Steam : jeux déjà lancés (localconfig) et jeux affichés dans la bibliothèque (librarycache).
function steamOwnedIds(root) {
  const ids = new Set();
  const ud = path.join(root, 'userdata');
  try {
    for (const u of fs.readdirSync(ud).filter((d) => /^\d+$/.test(d))) {
      const { parseVdf, getCI } = require('./scan');
      const txt = readText(path.join(ud, u, 'config', 'localconfig.vdf'));
      if (!txt) continue;
      const apps = getCI(parseVdf(txt), 'UserLocalConfigStore', 'Software', 'Valve', 'Steam', 'apps') || {};
      for (const id of Object.keys(apps)) if (/^\d+$/.test(id)) ids.add(id);
    }
  } catch {}
  try {
    for (const d of fs.readdirSync(path.join(root, 'appcache', 'librarycache'))) if (/^\d+$/.test(d)) ids.add(d);
  } catch {}
  return ids;
}

// Epic : catalogue local du launcher (jeux du compte, pas les DLC).
function epicOwned() {
  const f = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Catalog', 'catcache.bin');
  let items = [];
  try { items = JSON.parse(Buffer.from(fs.readFileSync(f, 'utf8'), 'base64').toString('utf8')); } catch { return []; }
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!it || !it.id || it.mainGameItem) continue;
    const cats = (it.categories || []).map((c) => c.path);
    if (!cats.includes('games') || cats.some((c) => /addons|digitalextras|applications|engines|plugins/.test(c))) continue;
    const rel = (it.releaseInfo || []).find((r) => (r.platform || []).includes('Windows')) || (it.releaseInfo || [])[0];
    if (!rel || !rel.appId || seen.has(rel.appId) || /^UE_/.test(rel.appId)) continue;
    seen.add(rel.appId);
    out.push({
      id: `epic:${rel.appId}`, name: (it.title || rel.appId).trim(), platform: 'pc', source: 'epic', notInstalled: true,
      catalogItemId: it.id,
      install: `com.epicgames.launcher://apps/${encodeURIComponent(`${it.namespace}:${it.id}:${rel.appId}`)}?action=install`,
    });
  }
  return out;
}

module.exports = { scanGog, scanUbisoft, scanBattleNet, scanXbox, xboxGameFromPackage, steamOwnedIds, epicOwned, parseRegTree, BNET };
