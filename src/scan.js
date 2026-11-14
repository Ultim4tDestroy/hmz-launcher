// Détection des jeux : ROM des consoles émulées, Steam et Epic.
const fs = require('fs');
const path = require('path');
const { slug, cleanRomTitle, switchTitleId, run, exists, readText, walk } = require('./util');

const ROM_EXT = {
  ds: ['.nds', '.dsi', '.srl'],
  '3ds': ['.3ds', '.cci', '.cxi', '.3dsx', '.app', '.zcci', '.zcxi', '.z3dsx'],
  switch: ['.nsp', '.xci', '.nsz', '.xcz', '.nro'],
  switch2: ['.nsp', '.xci', '.nsz', '.xcz', '.nro'],
};

const PLATFORM_OF_EXT = {};
for (const p of ['ds', '3ds', 'switch']) for (const e of ROM_EXT[p]) PLATFORM_OF_EXT[e] = p;

// Une mise à jour ou un DLC n'est pas un jeu à afficher.
function isSwitchExtra(file) {
  const base = path.basename(file);
  if (/\b(update|upd|dlc)\b|\[(upd|dlc|update)\]/i.test(base)) return true;
  const id = switchTitleId(file);
  if (id && !/000$/.test(id)) return true;
  return false;
}

function scanRoms(romDirs) {
  const games = [];
  for (const platform of Object.keys(ROM_EXT)) {
    const seen = new Map();
    for (const dir of romDirs[platform] || []) {
      if (!exists(dir)) continue;
      walk(dir, 3, (full, name) => {
        const ext = path.extname(name).toLowerCase();
        if (!ROM_EXT[platform].includes(ext)) return;
        if (platform.startsWith('switch') && isSwitchExtra(full)) return;
        const title = cleanRomTitle(name);
        const key = title.toLowerCase();
        let size = 0;
        try { size = fs.statSync(full).size; } catch {}
        // Même jeu en plusieurs fichiers : on garde le plus gros (souvent le jeu complet).
        if (seen.has(key) && seen.get(key).size >= size) return;
        seen.set(key, {
          id: `${platform}:${slug(title)}`,
          name: title,
          platform,
          source: 'rom',
          path: full,
          size,
          titleId: platform.startsWith('switch') ? switchTitleId(name) : null,
        });
      });
    }
    games.push(...seen.values());
  }
  return games;
}

// --- Fichiers VDF de Steam ---------------------------------------------------
function parseVdf(text) {
  const root = {};
  const stack = [root];
  const re = /"((?:[^"\\]|\\.)*)"|([{}])/g;
  let m, key = null;
  while ((m = re.exec(text))) {
    if (m[2] === '{') {
      const obj = {};
      if (key !== null) stack[stack.length - 1][key] = obj;
      stack.push(obj); key = null;
    } else if (m[2] === '}') {
      stack.pop(); key = null;
      if (!stack.length) break;
    } else {
      const s = m[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
      if (key === null) key = s;
      else { stack[stack.length - 1][key] = s; key = null; }
    }
  }
  return root;
}

function getCI(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    const found = Object.keys(cur).find((x) => x.toLowerCase() === k.toLowerCase());
    cur = found === undefined ? undefined : cur[found];
  }
  return cur;
}

async function steamRoot() {
  try {
    const out = await run('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath']);
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m && exists(m[1].trim())) return path.normalize(m[1].trim());
  } catch {}
  for (const p of ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']) if (exists(p)) return p;
  return null;
}

const NOT_A_GAME = /redistributable|proton|steam linux runtime|steamworks|steamvr|soundtrack|dedicated server|\bsdk\b|benchmark|wallpaper engine/i;
const BAD_EXE = /unins|crash|redist|vc_?redist|dxsetup|setup|install|helper|updater|prereq|dotnet|easyanticheat|eac|battleye|cef|webhelper|report|launcherpatcher|vcredist|directx|physx/i;

function exeHints(dir) {
  const out = [];
  if (!exists(dir)) return out;
  walk(dir, 3, (full, name) => {
    if (!/\.exe$/i.test(name) || BAD_EXE.test(name)) return;
    try { if (fs.statSync(full).size < 1.5 * 1024 * 1024) return; } catch { return; }
    out.push(name.toLowerCase());
  });
  return [...new Set(out)].slice(0, 12);
}

function librarycacheArt(root, appid) {
  const dir = path.join(root, 'appcache', 'librarycache', String(appid));
  const art = {};
  const pick = (re) => {
    let f = null;
    walk(dir, 2, (full, name) => { if (!f && re.test(name)) f = full; });
    return f;
  };
  if (exists(dir)) {
    art.cover = pick(/^library_600x900(_2x)?\.jpg$/i);
    art.hero = pick(/^library_hero(_2x)?\.jpg$/i);
    art.logo = pick(/^logo(_2x)?\.png$/i);
  } else {
    // Ancien format : fichiers à plat dans librarycache.
    const flat = path.join(root, 'appcache', 'librarycache');
    const f = (n) => (exists(path.join(flat, n)) ? path.join(flat, n) : null);
    art.cover = f(`${appid}_library_600x900.jpg`);
    art.hero = f(`${appid}_library_hero.jpg`);
    art.logo = f(`${appid}_logo.png`);
  }
  return art;
}

function steamPlaytimes(root) {
  const res = {};
  const ud = path.join(root, 'userdata');
  let users = [];
  try { users = fs.readdirSync(ud).filter((d) => /^\d+$/.test(d)); } catch { return res; }
  for (const u of users) {
    const txt = readText(path.join(ud, u, 'config', 'localconfig.vdf'));
    if (!txt) continue;
    const apps = getCI(parseVdf(txt), 'UserLocalConfigStore', 'Software', 'Valve', 'Steam', 'apps') || {};
    for (const [id, a] of Object.entries(apps)) {
      const minutes = Number(getCI(a, 'Playtime')) || 0;
      const last = Number(getCI(a, 'LastPlayed')) || 0;
      const cur = res[id] || { minutes: 0, last: 0 };
      res[id] = { minutes: Math.max(cur.minutes, minutes), last: Math.max(cur.last, last * 1000) };
    }
  }
  return res;
}

async function scanSteam() {
  const root = await steamRoot();
  if (!root) return [];
  const libs = new Set([root]);
  const lf = readText(path.join(root, 'steamapps', 'libraryfolders.vdf'));
  if (lf) {
    const folders = getCI(parseVdf(lf), 'libraryfolders') || {};
    for (const v of Object.values(folders)) {
      const p = typeof v === 'string' ? v : getCI(v, 'path');
      if (p) libs.add(path.normalize(p));
    }
  }
  const times = steamPlaytimes(root);
  const games = [];
  for (const lib of libs) {
    const sa = path.join(lib, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(sa).filter((f) => /^appmanifest_\d+\.acf$/.test(f)); } catch { continue; }
    for (const f of files) {
      const st = getCI(parseVdf(readText(path.join(sa, f)) || ''), 'AppState');
      if (!st) continue;
      const appid = getCI(st, 'appid'), name = getCI(st, 'name');
      if (!appid || !name || NOT_A_GAME.test(name) || appid === '228980') continue;
      const installDir = path.join(sa, 'common', getCI(st, 'installdir') || '');
      games.push({
        id: `steam:${appid}`,
        name,
        platform: 'pc',
        source: 'steam',
        appid,
        installDir,
        launch: { type: 'uri', target: `steam://rungameid/${appid}` },
        exeHints: exeHints(installDir),
        size: Number(getCI(st, 'SizeOnDisk')) || 0,
        localArt: librarycacheArt(root, appid),
        steamMinutes: times[appid] ? times[appid].minutes : 0,
        steamLast: times[appid] ? times[appid].last : 0,
      });
    }
  }
  return games;
}

function scanEpic() {
  const dir = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
  const games = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => /\.item$/i.test(f)); } catch { return games; }
  for (const f of files) {
    let m;
    try { m = JSON.parse(readText(path.join(dir, f))); } catch { continue; }
    if (!m || m.bIsIncompleteInstall || !m.AppName || /^UE_/.test(m.AppName)) continue;
    if (m.bIsApplication === false) continue;
    const cats = (m.AppCategories || []).join(',');
    if (cats && !/games/i.test(cats)) continue;
    const uri = `com.epicgames.launcher://apps/${encodeURIComponent(`${m.CatalogNamespace}:${m.CatalogItemId}:${m.AppName}`)}?action=launch&silent=true`;
    games.push({
      id: `epic:${m.AppName}`,
      name: m.DisplayName || m.AppName,
      platform: 'pc',
      source: 'epic',
      installDir: m.InstallLocation,
      launch: { type: 'uri', target: uri },
      exeHints: [m.LaunchExecutable ? path.basename(m.LaunchExecutable).toLowerCase() : null, ...exeHints(m.InstallLocation)].filter(Boolean),
      size: Number(m.InstallSize) || 0,
    });
  }
  return games;
}

// --- Autres launchers : Riot, Roblox, Minecraft et jeux installés ---------------------
const RIOT_NAMES = { league_of_legends: 'League of Legends', valorant: 'VALORANT', bacon: 'Legends of Runeterra', lion: '2XKO' };
const RIOT_HINTS = { league_of_legends: ['league of legends.exe'], valorant: ['valorant-win64-shipping.exe'], bacon: ['lor.exe'], lion: [] };

function scanRiot() {
  const pd = process.env.ProgramData || 'C:\\ProgramData';
  let rc = null;
  try {
    const j = JSON.parse(readText(path.join(pd, 'Riot Games', 'RiotClientInstalls.json')) || '{}');
    rc = [j.rc_default, j.rc_live, j.rc_beta].find((p) => p && exists(p)) || null;
  } catch {}
  if (!rc) return [];
  const games = [];
  const meta = path.join(pd, 'Riot Games', 'Metadata');
  let dirs = [];
  try { dirs = fs.readdirSync(meta).filter((d) => /\.live$/.test(d)); } catch {}
  for (const d of dirs) {
    const product = d.replace(/\.live$/, '');
    if (product === 'riot_client') continue;
    const yaml = readText(path.join(meta, d, `${d}.product_settings.yaml`)) || '';
    const m = yaml.match(/product_install_full_path:\s*"?([^"\r\n]+)"?/);
    const installDir = m ? path.normalize(m[1].trim()) : null;
    if (installDir && !exists(installDir)) continue;
    games.push({
      id: `riot:${product}`,
      name: RIOT_NAMES[product] || product.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      platform: 'pc', source: 'riot', installDir,
      launch: { type: 'exe', target: rc, args: [`--launch-product=${product}`, '--launch-patchline=live'] },
      exeHints: RIOT_HINTS[product] || (installDir ? exeHints(installDir) : []),
      noChildTracking: true,
    });
  }
  return games;
}

function newestSubdirWith(dir, file) {
  let best = null, bt = 0;
  try {
    for (const d of fs.readdirSync(dir)) {
      const f = path.join(dir, d, file);
      try { const t = fs.statSync(f).mtimeMs; if (t > bt) { bt = t; best = f; } } catch {}
    }
  } catch {}
  return best;
}

function scanLaunchers() {
  const L = process.env.LOCALAPPDATA || '';
  const A = process.env.APPDATA || '';
  const PF86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const PF = process.env.ProgramFiles || 'C:\\Program Files';
  const games = [];
  const add = (id, name, target, hints, extra = {}) => {
    if (!target) return;
    games.push({ id, name, platform: 'pc', source: 'launcher', installDir: path.dirname(target), launch: { type: 'exe', target, args: [] }, exeHints: hints, ...extra });
  };

  // Roblox (le dossier de version change à chaque mise à jour de Roblox).
  const bloxstrap = path.join(L, 'Bloxstrap', 'Bloxstrap.exe');
  const roblox = newestSubdirWith(path.join(L, 'Roblox', 'Versions'), 'RobloxPlayerBeta.exe');
  if (exists(bloxstrap)) add('launcher:roblox', 'Roblox', bloxstrap, ['robloxplayerbeta.exe'], { noChildTracking: true });
  else if (roblox) add('launcher:roblox', 'Roblox', roblox, ['robloxplayerbeta.exe']);

  // Minecraft : launcher officiel et launchers alternatifs.
  const mcStore = path.join(L, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe');
  const mcExe = ['C:\\XboxGames\\Minecraft Launcher\\Content\\Minecraft.exe', path.join(PF86, 'Minecraft Launcher', 'MinecraftLauncher.exe'), path.join(PF86, 'Minecraft', 'MinecraftLauncher.exe')].find(exists);
  if (mcExe) add('launcher:minecraft', 'Minecraft', mcExe, ['javaw.exe', 'minecraft.windows.exe']);
  else if (exists(mcStore)) games.push({ id: 'launcher:minecraft', name: 'Minecraft', platform: 'pc', source: 'launcher', launch: { type: 'shell', target: 'shell:AppsFolder\\Microsoft.4297127D64EC6_8wekyb3d8bbwe!Minecraft' }, exeHints: ['javaw.exe'] });
  const alt = [
    ['lunar', 'Minecraft (Lunar Client)', path.join(L, 'Programs', 'lunarclient', 'Lunar Client.exe')],
    ['prism', 'Minecraft (Prism Launcher)', path.join(L, 'Programs', 'PrismLauncher', 'prismlauncher.exe')],
    ['modrinth', 'Minecraft (Modrinth)', [path.join(L, 'Programs', 'Modrinth App', 'Modrinth App.exe'), path.join(PF, 'Modrinth App', 'Modrinth App.exe')].find(exists)],
    ['tlauncher', 'Minecraft (TLauncher)', path.join(A, '.minecraft', 'TLauncher.exe')],
    ['curseforge', 'CurseForge', [path.join(L, 'Programs', 'CurseForge Windows', 'CurseForge.exe'), path.join(PF, 'CurseForge Windows', 'CurseForge.exe')].find(exists)],
  ];
  for (const [k, name, exe] of alt) if (exe && exists(exe)) add(`launcher:${k}`, name, exe, ['javaw.exe']);
  return games;
}

// Jeux installés hors Steam/Epic, repérés par leur éditeur dans la liste des programmes de Windows.
const PUBLISHERS = /netmarble|hoyoverse|mihoyo|cognosphere|kuro games|level infinite|nexon|smilegate|garena|ncsoft|pearl abyss|kakao games|grinding gear|sandbox interactive|wargaming|gameforge|blizzard|electronic arts|ubisoft|riot games|mojang|roblox|square enix|bandai namco|sega|capcom|krafton|hypergryph|yostar|nexters|playstation pc|rockstar games/i;
const NOT_GAME_NAME = /launcher|uninstall|redistributable|runtime|anti-?cheat|helper|update|driver|battle\.net|ea app|origin|connect|agent|client services|vanguard|toolkit|sdk|tool\b|server|editor|bootstrapper/i;

async function scanRegistry() {
  if (process.platform !== 'win32') return [];
  const roots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];
  const entries = [];
  for (const r of roots) {
    let out = '';
    try { out = await run('reg', ['query', r, '/s']); } catch { continue; }
    entries.push(...parseRegQuery(out));
  }
  const games = [];
  for (const e of entries) {
    const name = (e.DisplayName || '').trim();
    if (!name || !PUBLISHERS.test(e.Publisher || '') || NOT_GAME_NAME.test(name)) continue;
    if (/steam:\/\/|steamapps|epicgames|com\.epicgames|riotclient/i.test(`${e.UninstallString || ''} ${e.InstallLocation || ''}`)) continue;
    if (e.SystemComponent === '0x1') continue;
    let exe = (e.DisplayIcon || '').replace(/^"|"?,\s*-?\d+$|"$/g, '').trim();
    if (!/\.exe$/i.test(exe) || !exists(exe) || BAD_EXE.test(path.basename(exe))) exe = null;
    const dir = e.InstallLocation && exists(e.InstallLocation) ? e.InstallLocation : (exe ? path.dirname(exe) : null);
    if (!exe && dir) {
      let best = null, size = 0;
      walk(dir, 2, (full, n) => {
        if (!/\.exe$/i.test(n) || BAD_EXE.test(n) || /launcher/i.test(n)) return;
        try { const s = fs.statSync(full).size; if (s > size) { size = s; best = full; } } catch {}
      });
      exe = best;
    }
    if (!exe) continue;
    games.push({
      id: `installed:${slugify(name)}`, name, platform: 'pc', source: 'installed', installDir: dir || path.dirname(exe),
      launch: { type: 'exe', target: exe, args: [] }, exeHints: [path.basename(exe).toLowerCase()],
    });
  }
  return games;
}

function parseRegQuery(out) {
  const res = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (/^HKEY_/.test(line)) { cur = {}; res.push(cur); continue; }
    const m = line.match(/^\s{4}(\S[^\t]*?)\s{4}(REG_\w+)\s{4}(.*)$/);
    if (m && cur) cur[m[1]] = m[3];
  }
  return res;
}

function slugify(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// Mises à jour et DLC Switch rangés avec les jeux (pour les signaler sur la fiche).
function scanSwitchExtras(romDirs) {
  const extras = {};
  for (const p of ['switch', 'switch2']) {
    for (const dir of romDirs[p] || []) {
      walk(dir, 3, (full, name) => {
        if (!ROM_EXT[p].includes(path.extname(name).toLowerCase()) || !isSwitchExtra(full)) return;
        const id = switchTitleId(name);
        if (!id) return;
        const key = id.slice(0, 12);
        (extras[key] = extras[key] || []).push({ file: full, kind: /800$/.test(id) ? 'update' : 'dlc' });
      });
    }
  }
  return extras;
}

module.exports = { scanRiot, scanLaunchers, scanRegistry, parseRegQuery, scanSwitchExtras, ROM_EXT, PLATFORM_OF_EXT, scanRoms, scanSteam, scanEpic, parseVdf, getCI, exeHints, isSwitchExtra };
