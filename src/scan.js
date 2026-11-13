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

module.exports = { ROM_EXT, PLATFORM_OF_EXT, scanRoms, scanSteam, scanEpic, parseVdf, getCI, exeHints, isSwitchExtra };
