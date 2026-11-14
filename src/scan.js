// Détection des jeux : ROM des consoles émulées, Steam et Epic.
const fs = require('fs');
const path = require('path');
const { slug, cleanRomTitle, switchTitleId, run, exists, readText, walk } = require('./util');

const { ROM_EXT, PLATFORM_OF_EXT, PLATFORMS } = require('./platforms');

// Titre d'un jeu PS3 / PS4 lu dans son fichier PARAM.SFO.
function readSfo(buf) {
  if (buf.length < 20 || buf.readUInt32BE(0) !== 0x00505346) return {};
  const keys = buf.readUInt32LE(8), data = buf.readUInt32LE(12), n = buf.readUInt32LE(16);
  const out = {};
  for (let i = 0; i < n && 20 + i * 16 + 16 <= buf.length; i++) {
    const o = 20 + i * 16;
    const kOff = buf.readUInt16LE(o), fmt = buf.readUInt16LE(o + 2), len = buf.readUInt32LE(o + 4), dOff = buf.readUInt32LE(o + 12);
    const kStart = keys + kOff;
    const key = buf.toString('utf8', kStart, buf.indexOf(0, kStart));
    if (fmt === 0x0204 || fmt === 0x0004) out[key] = buf.toString('utf8', data + dOff, data + dOff + len).replace(/\0+$/, '');
  }
  return out;
}
function sfoInfo(gameDir) {
  for (const rel of ['PS3_GAME/PARAM.SFO', 'PARAM.SFO', 'sce_sys/param.sfo']) {
    try {
      const o = readSfo(fs.readFileSync(path.join(gameDir, rel)));
      if (o.TITLE) return { title: o.TITLE.replace(/[\r\n]+/g, ' ').replace(/[™®]/g, '').trim(), category: o.CATEGORY || '', id: o.TITLE_ID || '' };
    } catch {}
  }
  return null;
}
function sfoTitle(gameDir) { const i = sfoInfo(gameDir); return i ? i.title : null; }

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
      const eboot = PLATFORMS[platform].eboot;
      walk(dir, eboot ? 6 : 3, (full, name) => {
        const ext = path.extname(name).toLowerCase();
        let title;
        if (eboot && /^eboot\.bin$/i.test(name)) {
          // PS3 / PS4 : un jeu est un dossier ; son nom vient du dossier du jeu
          // (…/Mon jeu/PS3_GAME/USRDIR/EBOOT.BIN ou …/CUSA00000/eboot.bin).
          const parts = path.dirname(full).split(/[\\/]/);
          while (parts.length && /^(usrdir|ps3_game|sce_sys)$/i.test(parts[parts.length - 1])) parts.pop();
          if (!parts.length) return;
          const gameDir = parts.join(path.sep);
          if (path.resolve(gameDir) === path.resolve(dir)) return;
          const info = sfoInfo(gameDir);
          // Mise à jour ou contenu additionnel (PS3 : catégorie GD), pas un jeu.
          if (info && /^(GD|AC|AT|CB|HM|SF|WT|gp|ac)$/.test(info.category)) return;
          title = (info && info.title) || cleanRomTitle(parts[parts.length - 1]);
        } else {
          if (!ROM_EXT[platform].includes(ext)) return;
          if (platform.startsWith('switch') && isSwitchExtra(full)) return;
          // Une piste .bin/.iso rangée à côté d'un .cue ou d'un .m3u n'est pas un jeu à part.
          if (platform === 'ps1' && ext === '.iso' && fs.existsSync(full.replace(/\.iso$/i, '.cue'))) return;
          title = cleanRomTitle(name);
        }
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

const NOT_A_GAME = /redistributable|proton|steam linux runtime|steamworks|steamvr|soundtrack|dedicated server|\bsdk\b|benchmark|wallpaper engine|^spacewar$/i;
const NOT_A_GAME_APPID = new Set(['480', '228980', '1070560', '1391110', '1493710', '1628350', '1826330', '2180100']);
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
      if (!appid || !name || NOT_A_GAME.test(name) || NOT_A_GAME_APPID.has(String(appid))) continue;
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
      catalogItemId: m.CatalogItemId,
    });
  }
  return games;
}

// --- Autres launchers : Riot, Roblox, Minecraft et jeux installés ---------------------
const RIOT_NAMES = { league_of_legends: 'League of Legends', valorant: 'VALORANT', bacon: 'Legends of Runeterra', lion: '2XKO', teamfighttactics: 'Teamfight Tactics', tft: 'Teamfight Tactics' };
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
const NOT_GAME_NAME = / for \S+$|roblox|minecraft|studio|hoyoplay|game center|gamecenter|^garena$|ubisoft connect|rockstar games|wargaming\.net|launcher|uninstall|redistributable|runtime|anti-?cheat|helper|update|driver|battle\.net|ea app|origin|connect|agent|client services|vanguard|toolkit|sdk|tool\b|server|editor|bootstrapper/i;

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

// --- Netmarble -----------------------------------------------------------------------------
// Les jeux Netmarble sont installés à côté du launcher Netmarble, un dossier par jeu.
const NETMARBLE_NAMES = {
  '7dsgc': 'The Seven Deadly Sins: Grand Cross', '7dsgb': 'The Seven Deadly Sins: Grand Cross', sevendeadlysinsglobal: 'The Seven Deadly Sins: Grand Cross', solelevelingarise: 'Solo Leveling: ARISE', nanatsunotaizai: 'The Seven Deadly Sins: Grand Cross',
  tog: 'Tower of God: New World', towerofgod: 'Tower of God: New World',
  sololv: 'Solo Leveling: ARISE', sololevelingarise: 'Solo Leveling: ARISE', sla: 'Solo Leveling: ARISE',
  sevenknightsrebirth: 'Seven Knights Re:BIRTH', skr: 'Seven Knights Re:BIRTH',
  ninokuni: 'Ni no Kuni: Cross Worlds', gotkingsroad: 'Game of Thrones: Kingsroad', kingsroad: 'Game of Thrones: Kingsroad',
  mff: 'MARVEL Future Fight', raven2: 'RAVEN2', kofas: "The King of Fighters ALLSTAR", '7dsidle': 'The Seven Deadly Sins: IDLE Adventure',
};
const NETMARBLE_SKIP = /launcher|elevate|update|patch|crash|common|redist|prerequisite|logs?$|cache|temp|downloads?$/i;

function netmarbleRoots() {
  const roots = new Set();
  const PF86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const PF = process.env.ProgramFiles || 'C:\\Program Files';
  const L = process.env.LOCALAPPDATA || '';
  for (const d of ['C:\\Netmarble', 'D:\\Netmarble', 'C:\\Netmarble Games', 'D:\\Netmarble Games', path.join(PF86, 'Netmarble'), path.join(PF, 'Netmarble'), path.join(L, 'Netmarble'), path.join(L, 'Programs', 'Netmarble')]) if (exists(d)) roots.add(d);
  return roots;
}

// Programme principal d'un dossier de jeu : jeu Unity (dossier « X_Data » → X.exe),
// sinon le plus gros .exe.
function mainExe(dir) {
  let subs = [];
  try { subs = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const d of subs) {
    if (!d.isDirectory() || !/_Data$/i.test(d.name)) continue;
    const exe = path.join(dir, d.name.replace(/_Data$/i, '') + '.exe');
    if (exists(exe)) return { exe, unity: d.name.replace(/_Data$/i, '') };
  }
  let best = null, size = 0;
  walk(dir, 4, (full, n) => {
    if (!/\.exe$/i.test(n) || BAD_EXE.test(n) || /launcher|elevate|unitycrash|crashpad|crashsight|wesight|nmss/i.test(n)) return;
    try { const sz = fs.statSync(full).size; if (sz > size) { size = sz; best = full; } } catch {}
  });
  return best && size > 2 * 1024 * 1024 ? { exe: best } : null;
}

async function scanNetmarble() {
  if (process.platform !== 'win32') return [];
  const roots = netmarbleRoots();
  // Dossier du launcher Netmarble (et donc de ses jeux) d'après la liste des programmes.
  for (const r of ['HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall']) {
    let out = '';
    try { out = await run('reg', ['query', r, '/s', '/f', 'Netmarble', '/d']); } catch { continue; }
    for (const e of parseRegQuery(out)) {
      const loc = e.InstallLocation || (e.DisplayIcon || '').replace(/^"|"?,\s*-?\d+$|"$/g, '');
      if (!loc) continue;
      const dir = /\.exe$/i.test(loc) ? path.dirname(loc) : loc;
      if (exists(dir)) { roots.add(dir); roots.add(path.dirname(dir)); }
    }
  }
  // Les jeux sont souvent rangés dans un sous-dossier « Netmarble Game ».
  for (const r of [...roots]) for (const sub of ['Netmarble Game', 'Netmarble Games', 'Games', 'Game']) { const d = path.join(r, sub); if (exists(d)) roots.add(d); }
  // Launcher Netmarble, utilisé si un jeu refuse d'être lancé sans lui.
  let launcherExe = null;
  for (const r of roots) {
    const ld = path.join(r, 'Netmarble Launcher');
    if (!exists(ld)) continue;
    let size = 0;
    walk(ld, 1, (full, n) => { if (/\.exe$/i.test(n) && !/elevate|unins|update|crash/i.test(n)) { try { const sz = fs.statSync(full).size; if (sz > size) { size = sz; launcherExe = full; } } catch {} } });
  }
  const games = [];
  const seen = new Set();
  for (const root of roots) {
    let subs = [];
    try { subs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { continue; }
    for (const sub of subs) {
      if (NETMARBLE_SKIP.test(sub) || /^netmarble game/i.test(sub)) continue;
      const dir = path.join(root, sub);
      const m = mainExe(dir);
      if (!m || seen.has(m.exe.toLowerCase())) continue;
      seen.add(m.exe.toLowerCase());
      const key = sub.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ukey = (m.unity || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const hints = new Set([path.basename(m.exe).toLowerCase()]);
      walk(dir, 3, (full, n) => { if (/shipping\.exe$/i.test(n)) hints.add(n.toLowerCase()); });
      games.push({
        id: `netmarble:${key}`, name: NETMARBLE_NAMES[key] || NETMARBLE_NAMES[ukey] || null, folder: m.unity || sub, platform: 'pc', source: 'netmarble',
        installDir: dir, launch: { type: 'exe', target: m.exe, args: [] }, exeHints: [...hints], launcherExe,
      });
    }
  }
  // Nom du jeu inscrit dans le .exe quand le dossier ne suffit pas.
  const unnamed = games.filter((g) => !g.name);
  if (unnamed.length) {
    try {
      const list = unnamed.map((g) => `'${g.launch.target.replace(/'/g, "''")}'`).join(',');
      const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `@(${list}) | ForEach-Object { $v = (Get-Item -LiteralPath $_).VersionInfo; ($v.ProductName + '|' + $v.FileDescription) }`]);
      out.split(/\r?\n/).filter(Boolean).forEach((line, i) => {
        const [prod, desc] = line.split('|').map((x) => (x || '').trim());
        const g = unnamed[i];
        const n = [prod, desc].find((x) => x && x.length > 2 && !/unity|unreal|launcher|^game$|client|player/i.test(x));
        if (g && n) g.name = n;
      });
    } catch {}
  }
  for (const g of games) if (!g.name) g.name = g.folder.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return games;
}

// --- BlueStacks -------------------------------------------------------------------------------
// BlueStacks crée un raccourci par application installée (menu Démarrer, Bureau).
// Chaque raccourci lance HD-Player.exe avec le nom du paquet Android du jeu.
const BLUESTACKS_SKIP = /^(com\.android\.|com\.google\.android\.(gms|apps)|com\.bluestacks\.|com\.uncube|com\.now\.gg)/i;

function scanBlueStacks(readShortcut) {
  if (process.platform !== 'win32' || !readShortcut) return [];
  const home = require('os').homedir();
  const dirs = [
    path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(home, 'Desktop'), path.join(home, 'OneDrive', 'Desktop'), path.join(home, 'OneDrive', 'Bureau'),
    path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop'),
  ];
  const games = new Map();
  for (const d of dirs) {
    walk(d, 3, (full, name) => {
      if (!/\.lnk$/i.test(name)) return;
      let sc;
      try { sc = readShortcut(full); } catch { return; }
      if (!sc || !/hd-player\.exe$|hd-runapp\.exe$|bluestacks.*\.exe$/i.test(sc.target || '')) return;
      const args = sc.args || '';
      const pkg = (args.match(/(?:--package|-p|-json.*?"package"\s*:\s*)\s*"?([a-z][\w]*(?:\.[\w]+)+)/i) || [])[1];
      if (!pkg || BLUESTACKS_SKIP.test(pkg)) return;
      const title = name.replace(/\.lnk$/i, '').replace(/\s*-\s*BlueStacks.*$/i, '').trim();
      if (games.has(pkg)) return;
      games.set(pkg, {
        id: `android:${pkg}`, name: title, platform: 'mobile', source: 'bluestacks', package: pkg,
        launch: { type: 'exe', target: sc.target, args: (args.match(/(?:[^\s"]+|"[^"]*")+/g) || []).map((a) => a.replace(/^"|"$/g, '')) },
        installDir: path.dirname(sc.target), iconPath: sc.icon || null, exeHints: [],
      });
    });
  }
  return [...games.values()];
}

// Jeux installés dans BlueStacks, d'après ses fichiers (sans raccourci).
const PKG_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/i;
function bluestacksInfo() {
  const PF = process.env.ProgramFiles || 'C:\\Program Files';
  const PD = process.env.ProgramData || 'C:\\ProgramData';
  const player = [path.join(PF, 'BlueStacks_nxt', 'HD-Player.exe'), path.join(PF, 'BlueStacks', 'HD-Player.exe')].find(exists) || null;
  const engine = [path.join(PD, 'BlueStacks_nxt', 'Engine'), path.join(PD, 'BlueStacks', 'Engine')].find(exists) || null;
  const instances = [];
  const pkgs = new Set();
  if (engine) {
    try { for (const d of fs.readdirSync(engine, { withFileTypes: true })) if (d.isDirectory() && !/^(manager|userdata)$/i.test(d.name)) instances.push(d.name); } catch {}
    for (const sub of ['UserData', ...instances]) {
      walk(path.join(engine, sub), 3, (full, name) => {
        const base = name.replace(/\.(cfg|png|jpg|ico|json|xml|txt|webp)$/i, '');
        if (PKG_RE.test(base) && !BLUESTACKS_SKIP.test(base)) pkgs.add(base);
      });
    }
  }
  return { player, instance: instances.find((i) => /pie64|nougat64|rvc64|android/i.test(i)) || instances[0] || 'Pie64', packages: [...pkgs].sort() };
}

module.exports = { readSfo, sfoTitle, bluestacksInfo, scanNetmarble, scanBlueStacks, scanRiot, scanLaunchers, scanRegistry, parseRegQuery, scanSwitchExtras, ROM_EXT, PLATFORM_OF_EXT, scanRoms, scanSteam, scanEpic, parseVdf, getCI, exeHints, isSwitchExtra };
