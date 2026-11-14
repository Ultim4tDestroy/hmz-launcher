// HMZ Launcher : processus principal (Electron).
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const { Store } = require('./src/store');
const { slug, run, exists, cleanRomTitle, fetchWithTimeout } = require('./src/util');
const EMU = require('./src/emulators');
const SCAN = require('./src/scan');
const { ArtFinder, fileUrl } = require('./src/art');
const { PadWatcher } = require('./src/gamepad');
const EMUCFG = require('./src/emuconfig');
const BACKUP = require('./src/backup');
const { normTitle } = require('./src/util');

const PLAT = require('./src/platforms');
const STORES = require('./src/stores');
const EXTRAS = require('./src/extras');
const PLATFORMS = PLAT.publicPlatforms();
const { ROM_FOLDER_NAMES } = PLAT;
// Émulateurs dont HMZ sait régler les graphismes et la manette.
const TUNED = ['melonds', 'azahar', 'eden', 'lichii'];

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null;
let db = null;
let art = null;
const running = new Map();     // id du jeu → { start, kind: 'child' | 'detect' }
let minimizedForGame = false;
const CUR_VERSION = process.env.HMZ_VERSION || app.getVersion();
const OVERRIDE_DIR = process.env.HMZ_OVERRIDE_DIR || path.join(os.homedir(), 'HMZ', 'app');
let updateReady = null;

function versionNewer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

// Une nouvelle version déposée dans HMZ\app pendant que HMZ tourne.
function checkLocalUpdate() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(OVERRIDE_DIR, 'package.json'), 'utf8')).version;
    if (v && versionNewer(v, CUR_VERSION) && exists(path.join(OVERRIDE_DIR, 'main.js')) && updateReady !== v) {
      updateReady = v;
      send('update:ready', { version: v });
      notifyChange();
    }
  } catch {}
}

// Mises à jour automatiques depuis les versions publiées sur GitHub.
let autoUpdater = null;
let updateDownloaded = false;
function setupAutoUpdate() {
  if (!app.isPackaged) return;
  try { ({ autoUpdater } = require('electron-updater')); } catch { return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => toast(`Mise à jour ${i.version} trouvée, téléchargement en cours…`));
  autoUpdater.on('update-downloaded', (i) => {
    updateDownloaded = true;
    updateReady = i.version;
    send('update:ready', { version: i.version });
    notifyChange();
  });
  autoUpdater.on('error', (e) => console.error('Mise à jour', e && e.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);
  setInterval(check, 2 * 3600 * 1000);
}

function restartApp() {
  for (const id of [...running.keys()]) endSession(id);
  db && db.save(true);
  if (autoUpdater && updateDownloaded) { autoUpdater.quitAndInstall(true, true); return; }
  app.relaunch();
  app.exit(0);
}

// ---------------------------------------------------------------------------
function defaults() {
  const root = path.join(os.homedir(), 'HMZ');
  const romDirs = {};
  for (const p of PLAT.CORE) romDirs[p] = [path.join(root, 'Jeux', ROM_FOLDER_NAMES[p])];
  return {
    settings: {
      root, romDirs, sgdbKey: '', startInTV: false, emuFullscreen: true, minimizeOnPlay: true,
      scanSteam: true, scanEpic: true, scanOthers: true, scanStores: true, showOwned: true,
      theme: 'foret', accent: '', cardSize: 168, libView: 'shelf',
      padQuit: true, padHome: true, backups: true, backupDir: '', autostart: false,
    },
    emulators: {},
    games: {},
    collections: [],
    sessions: [],
    firstRun: true,
  };
}

function emuInstalled(id) { const e = db.data.emulators[id]; return !!(e && e.exe && exists(e.exe)); }
function resolveEmu(platform) { return EMU.emuFor(platform, emuInstalled); }

// Dossiers de jeux + jeux installés à l'intérieur des émulateurs (PSN dans RPCS3, Vita3K).
function romDirsWithEmulators() {
  const s = db.data.settings;
  const dirs = { ...s.romDirs };
  const add = (p, d) => { if (exists(d)) dirs[p] = [...(dirs[p] || []), d]; };
  const r = db.data.emulators.rpcs3; if (r && r.exe) add('ps3', path.join(path.dirname(r.exe), 'dev_hdd0', 'game'));
  const v = db.data.emulators.vita3k; if (v && v.exe) add('vita', path.join(path.dirname(v.exe), 'ux0', 'app'));
  return dirs;
}

function ensureFolders() {
  const s = db.data.settings;
  // Un dossier de jeux par console, créé seulement quand un de ses émulateurs est installé.
  for (const d of Object.values(EMU.EMULATORS)) {
    if (!emuInstalled(d.id)) continue;
    for (const p of d.platforms) {
      if (!s.romDirs[p] || !s.romDirs[p].length) s.romDirs[p] = [path.join(s.root, 'Jeux', ROM_FOLDER_NAMES[p])];
    }
  }
  for (const dirs of Object.values(s.romDirs)) for (const d of dirs) { try { fs.mkdirSync(d, { recursive: true }); } catch {} }
  try { fs.mkdirSync(path.join(s.root, 'Emulateurs'), { recursive: true }); } catch {}
}

function send(channel, payload) { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); }
function notifyChange() { send('state:changed', publicState()); }
function toast(text, kind = 'info') { send('toast', { text, kind }); }

// --- État envoyé à l'interface ----------------------------------------------
function gameStats() {
  const st = {};
  for (const s of db.data.sessions) {
    const o = st[s.g] || (st[s.g] = { minutes: 0, sessions: 0, last: 0 });
    o.minutes += (s.e - s.s) / 60000;
    o.sessions++;
    o.last = Math.max(o.last, s.e);
  }
  return st;
}

function publicState() {
  const stats = gameStats();
  const games = Object.values(db.data.games).map((g) => {
    const s = stats[g.id] || { minutes: 0, sessions: 0, last: 0 };
    const minutes = Math.max(s.minutes, g.steamMinutes || 0);
    const last = Math.max(s.last, g.steamLast || 0, g.lastLaunched || 0);
    const emuId = g.source === 'rom' ? (g.emu || resolveEmu(g.platform)) : null;
    return {
      id: g.id, name: g.customName || g.name, originalName: g.name, platform: g.platform, source: g.source,
      favorite: !!g.favorite, hidden: !!g.hidden, addedAt: g.addedAt, size: g.size || 0,
      minutes: Math.round(minutes), sessions: s.sessions, last,
      art: { ...(g.art || {}), ...(g.custom || {}) },
      emu: emuId, emuReady: emuId ? !!(db.data.emulators[emuId] && exists(db.data.emulators[emuId].exe)) : true,
      path: g.path || g.installDir || (g.launch && g.launch.target) || '',
      running: running.has(g.id),
      extras: g.extras || [],
      genres: g.genresManual || g.genres || [],
      notInstalled: !!g.notInstalled,
    };
  });
  const emulators = Object.values(EMU.EMULATORS).map((d) => {
    const e = db.data.emulators[d.id] || {};
    const ok = !!(e.exe && exists(e.exe));
    return {
      id: d.id, name: d.name, platforms: d.platforms, blurb: d.blurb, experimental: !!d.experimental, page: d.page,
      installed: ok, version: e.version || null, custom: !!e.custom, latest: e.latest || null,
      needsKeys: !!d.needsKeys, keys: ok ? EMU.keysStatus(d.id, e) : null, dir: e.dir || null,
      needs: d.needs || '', tuned: TUNED.includes(d.id), isDefault: d.platforms.some((p) => EMU.DEFAULT_EMU[p] === d.id),
    };
  });
  const since = Date.now() - 400 * 864e5;
  return {
    version: CUR_VERSION,
    builtinVersion: process.env.HMZ_BUILTIN_VERSION || CUR_VERSION,
    codeSource: process.env.HMZ_CODE_SOURCE || 'installée',
    updateReady,
    settings: { ...db.data.settings, backupDirShown: backupRoot() },
    padKinds,
    platforms: PLATFORMS,
    games, emulators,
    collections: db.data.collections,
    sessions: db.data.sessions.filter((s) => s.e > since),
    firstRun: db.data.firstRun,
  };
}

// --- Bibliothèque --------------------------------------------------------------
// Une seule recherche à la fois ; une demande pendant une recherche en relance une après.
let scanRun = null, scanAgain = false;
function scanLibrary() {
  if (scanRun) { scanAgain = true; return scanRun; }
  scanRun = scanLibraryNow().finally(() => {
    scanRun = null;
    if (scanAgain) { scanAgain = false; scanLibrary().catch((e) => console.error(e)); }
  });
  return scanRun;
}
// Noms des jeux Steam pas installés : demandés à la boutique Steam, un par un et lentement
// (limite de la boutique), puis gardés en mémoire.
let namesBusy = false;
async function resolveSteamNames(ids) {
  if (namesBusy) return;
  namesBusy = true;
  const names = db.data.steamNames = db.data.steamNames || {};
  let added = 0;
  try {
    for (const id of ids) {
      if (names[id]) continue;
      try {
        const r = await fetchWithTimeout(`https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic`, {}, 15000);
        if (r.status === 429 || r.status === 403) break; // trop de demandes : on reprendra plus tard
        const j = (await r.json())[id];
        names[id] = j && j.success ? { n: j.data.name, t: j.data.type } : { t: 'gone' };
        if (names[id].t === 'game') added++;
      } catch { /* hors ligne : on reprendra plus tard */ break; }
      if (added && added % 15 === 0) { db.save(); scanLibrary().catch(() => {}); }
      await new Promise((res) => setTimeout(res, 1600));
    }
  } finally {
    namesBusy = false;
    db.save();
    if (added) scanLibrary().catch(() => {});
  }
}

async function scanLibraryNow() {
  const s = db.data.settings;
  ensureFolders();
  send('scan:progress', 'Recherche des jeux…');
  const found = [...SCAN.scanRoms(romDirsWithEmulators())];
  if (process.platform === 'win32') {
    if (s.scanSteam) { try { found.push(...await SCAN.scanSteam()); } catch (e) { console.error(e); } }
    if (s.scanEpic) { try { found.push(...SCAN.scanEpic()); } catch (e) { console.error(e); } }
    if (s.scanStores) {
      for (const [label, fn] of [['GOG', STORES.scanGog], ['Ubisoft', STORES.scanUbisoft], ['Battle.net', STORES.scanBattleNet], ['Xbox', STORES.scanXbox]]) {
        try { found.push(...await fn()); } catch (e) { console.error(label, e); }
      }
    }
    // Jeux possédés mais pas installés.
    if (s.showOwned) {
      const ids = new Set(found.map((f) => f.id));
      if (s.scanSteam) {
        try {
          const own = await SCAN.scanSteamOwned(new Set(found.filter((f) => f.source === 'steam').map((f) => String(f.appid))), db.data.steamNames || {});
          for (const g of own.games) if (!ids.has(g.id)) { found.push(g); ids.add(g.id); }
          if (own.unknown.length) setTimeout(() => resolveSteamNames(own.unknown), 2000);
        } catch (e) { console.error(e); }
      }
      if (s.scanEpic) { try { for (const g of STORES.epicOwned()) if (!ids.has(g.id)) { found.push(g); ids.add(g.id); } } catch (e) { console.error(e); } }
    }
    if (s.scanOthers) {
      const known = new Set(found.filter((f) => f.platform === 'pc').map((f) => normTitle(f.name)));
      const others = [];
      try { others.push(...SCAN.scanRiot()); } catch (e) { console.error(e); }
      try { others.push(...SCAN.scanLaunchers()); } catch (e) { console.error(e); }
      try { others.push(...await SCAN.scanNetmarble()); } catch (e) { console.error(e); }
      try { others.push(...await SCAN.scanRegistry()); } catch (e) { console.error(e); }
      try { others.push(...SCAN.scanBlueStacks((f) => { const l = shell.readShortcutLink(f); return { target: l.target, args: l.args, icon: l.icon }; })); } catch (e) { console.error(e); }
      for (const o of others) {
        const k = normTitle(o.name);
        if (known.has(k)) continue;
        known.add(k);
        found.push(o);
      }
    }
  }
  // Mises à jour et DLC Switch rangés à côté des jeux.
  try {
    const extras = SCAN.scanSwitchExtras(s.romDirs);
    for (const f of found) if (f.titleId) f.extras = (extras[f.titleId.slice(0, 12)] || []).map((x) => x.kind);
  } catch (e) { console.error(e); }
  const games = db.data.games;
  const seen = new Set();
  for (const f of found) {
    seen.add(f.id);
    const old = games[f.id] || {};
    games[f.id] = {
      ...f,
      addedAt: old.addedAt || Date.now(),
      favorite: old.favorite, hidden: old.hidden, customName: old.customName, custom: old.custom,
      art: old.art, artTried: old.artTried, emu: old.emu, lastLaunched: old.lastLaunched,
      genres: old.genres, genresTried: old.genresTried, genresManual: old.genresManual,
    };
  }
  for (const id of Object.keys(games)) {
    if (!seen.has(id) && games[id].source !== 'manual' && !games[id].manualMobile) delete games[id];
  }
  db.save();
  notifyChange();
  fetchArt(false);
}

let artBusy = false;
async function fetchArt(force) {
  if (artBusy) return;
  artBusy = true;
  try {
    const needArt = (g) => force || !g.art || (!g.art.cover && (!g.artTried || Date.now() - g.artTried > 3 * 864e5));
    const needGenres = (g) => !g.notInstalled && !g.genresManual && (!g.genresTried || (!(g.genres || []).length && Date.now() - g.genresTried > 7 * 864e5));
    const todo = Object.values(db.data.games).filter((g) => needArt(g) || needGenres(g));
    let done = 0;
    const worker = async () => {
      while (todo.length) {
        const g = todo.shift();
        if (needArt(g)) {
          try {
            g.art = { ...(force ? {} : g.art || {}), ...await art.find(g) };
          } catch (e) {
            if (e.status === 401) { toast('Clé SteamGridDB refusée : vérifie-la dans Paramètres.', 'error'); todo.length = 0; }
          }
          g.artTried = Date.now();
        }
        if (needGenres(g)) {
          try { g.genres = await art.genres(g); } catch {}
          g.genresTried = Date.now();
        }
        done++;
        if (done % 4 === 0) { send('scan:progress', `Images : ${done} jeux traités`); notifyChange(); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    db.save();
  } finally {
    artBusy = false;
    send('scan:progress', null);
    notifyChange();
  }
}

// --- Lancement et temps de jeu ----------------------------------------------
function startSession(id, kind) {
  if (running.has(id)) return;
  running.set(id, { start: Date.now(), kind });
  const g = db.data.games[id];
  if (g) g.lastLaunched = Date.now();
  db.save();
  notifyChange();
}

function endSession(id) {
  const r = running.get(id);
  if (!r) return;
  running.delete(id);
  const e = Date.now();
  if (e - r.start >= 30000) db.data.sessions.push({ g: id, s: r.start, e });
  db.save();
  notifyChange();
}

async function launchGame(id, emuOverride) {
  const g = db.data.games[id];
  if (!g) throw new Error('Jeu introuvable');
  if (g.notInstalled) {
    // Pas installé : la boutique ouvre son installation.
    await shell.openExternal(g.install);
    return { installing: true, store: g.source === 'epic' ? 'Epic Games' : 'Steam' };
  }
  if (running.has(id) && running.get(id).kind === 'child') return { already: true };
  const s = db.data.settings;
  let cmd = null, args = [];

  if (g.source === 'rom' || (g.source === 'manual' && g.platform !== 'pc')) {
    const emuId = emuOverride || g.emu || resolveEmu(g.platform);
    const emu = db.data.emulators[emuId];
    if (!emu || !exists(emu.exe)) return { needEmu: emuId };
    if (!exists(g.path)) throw new Error('Le fichier du jeu est introuvable. Il a peut-être été déplacé.');
    cmd = emu.exe;
    args = EMU.EMULATORS[emuId].args(g.path, s.emuFullscreen);
  } else if (g.launch && g.launch.type === 'exe') {
    cmd = g.launch.target; args = g.launch.args || [];
    if (!exists(cmd)) throw new Error('Le programme du jeu est introuvable.');
  } else if (g.launch && g.launch.type === 'shell') {
    spawn('explorer.exe', [g.launch.target], { detached: true, stdio: 'ignore' }).unref();
    g.lastLaunched = Date.now();
    db.save(); notifyChange();
    return { ok: true };
  } else if (g.launch && g.launch.type === 'uri') {
    await shell.openExternal(g.launch.target);
    g.lastLaunched = Date.now();
    db.save(); notifyChange();
    return { ok: true };
  }

  const child = spawn(cmd, args, { cwd: (g.launch && g.launch.cwd && exists(g.launch.cwd)) ? g.launch.cwd : path.dirname(cmd), detached: true, stdio: 'ignore', windowsHide: false });
  if (g.noChildTracking) {
    // Ce programme lance le jeu puis se ferme : le temps est compté par la détection des jeux.
    child.on('error', (e) => toast(`Lancement impossible : ${e.message}`, 'error'));
    child.unref();
    g.lastLaunched = Date.now();
    db.save(); notifyChange();
    return { ok: true };
  }
  const emuUsed = g.source === 'rom' || (g.source === 'manual' && g.platform !== 'pc') ? (emuOverride || g.emu || resolveEmu(g.platform)) : null;
  child.on('error', (e) => { toast(`Lancement impossible : ${e.message}`, 'error'); endSession(id); });
  const startedAt = Date.now();
  child.on('exit', () => {
    endSession(id);
    // Un jeu Netmarble qui se ferme tout de suite veut être lancé par le launcher Netmarble.
    if (g.source === 'netmarble' && Date.now() - startedAt < 20000 && g.launcherExe && exists(g.launcherExe)) {
      spawn(g.launcherExe, [], { cwd: path.dirname(g.launcherExe), detached: true, stdio: 'ignore' }).unref();
      toast(`${g.customName || g.name} doit être lancé depuis le launcher Netmarble : il vient de s'ouvrir.`);
    }
    if (emuUsed) backupSaves(emuUsed).catch((e) => console.error('Sauvegarde', e));
    if (minimizedForGame && win && ![...running.values()].some((r) => r.kind === 'child')) {
      minimizedForGame = false;
      win.restore(); win.focus();
    }
  });
  child.unref();
  startSession(id, 'child');
  running.get(id).pid = child.pid;
  if (s.minimizeOnPlay && win) { minimizedForGame = true; setTimeout(() => win && win.minimize(), 1200); }
  return { ok: true };
}

// Quitter le jeu lancé par HMZ (Select + Start maintenus sur la manette).
async function quitRunningGame() {
  const kids = [...running.entries()].filter(([, r]) => r.kind === 'child' && r.pid);
  if (!kids.length) return false;
  for (const [, r] of kids) {
    // D'abord une fermeture normale (le jeu peut finir d'écrire), puis forcée.
    run('taskkill', ['/PID', String(r.pid), '/T']).catch(() => {});
    setTimeout(() => {
      try { process.kill(r.pid, 0); run('taskkill', ['/PID', String(r.pid), '/T', '/F']).catch(() => {}); } catch { /* déjà fermé */ }
    }, 4000);
  }
  return true;
}

function bringToFront(tv) {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.setAlwaysOnTop(true); win.focus(); win.setAlwaysOnTop(false);
  if (tv) send('tv:enter');
}

let padKinds = [];
function onPad(ev, data) {
  const s = db.data.settings;
  if (ev === 'PAD') { padKinds = data || []; send('pad:kinds', padKinds); return; }
  if (ev === 'QUIT' && s.padQuit) {
    quitRunningGame().then((did) => { if (did) setTimeout(() => bringToFront(false), 1500); });
  }
  if (ev === 'HOME' && s.padHome) {
    const playing = [...running.values()].some((r) => r.kind === 'child');
    if (!playing) bringToFront(true);
  }
}

function backupRoot() { const s = db.data.settings; return s.backupDir || path.join(s.root, 'Sauvegardes'); }
async function backupSaves(emuId, force) {
  const s = db.data.settings;
  if (!s.backups && !force) return null;
  const emu = db.data.emulators[emuId];
  if (!emu || !exists(emu.exe)) return null;
  db.data.backupState = db.data.backupState || {};
  const r = await BACKUP.backup(emuId, EMU.EMULATORS[emuId].name, emu, s.romDirs, backupRoot(), force ? 0 : db.data.backupState[emuId]);
  db.data.backupState[emuId] = r.mtime;
  db.save();
  return r.file;
}

function applyAutostart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try { app.setLoginItemSettings({ openAtLogin: !!db.data.settings.autostart, args: ['--demarrage-windows'] }); } catch {}
}

async function configureEmu(id) {
  const emu = db.data.emulators[id];
  if (!emu || !exists(emu.exe)) throw new Error("Installe d'abord l'émulateur.");
  const s = db.data.settings;
  const gameDirs = id === 'eden' ? s.romDirs.switch : id === 'lichii' ? [...(s.romDirs.switch2 || []), ...(s.romDirs.switch || [])] : [];
  return EMUCFG.apply(id, emu, { gameDirs, padKinds });
}

// Repère les jeux Steam/Epic en cours, même lancés hors du launcher.
async function pollProcesses() {
  if (process.platform !== 'win32') return;
  const pcGames = Object.values(db.data.games).filter((g) => g.exeHints && g.exeHints.length);
  if (!pcGames.length) return;
  let names;
  try {
    const out = await run('tasklist', ['/fo', 'csv', '/nh']);
    names = new Set(out.split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((x) => x.toLowerCase()));
  } catch { return; }
  const count = {};
  for (const g of pcGames) for (const h of g.exeHints) count[h] = (count[h] || 0) + 1;
  for (const g of pcGames) {
    const on = g.exeHints.some((h) => count[h] === 1 && names.has(h));
    const r = running.get(g.id);
    if (on && !r) startSession(g.id, 'detect');
    else if (!on && r && r.kind === 'detect') endSession(g.id);
  }
}

// --- Fenêtre -----------------------------------------------------------------------
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 880, minWidth: 1000, minHeight: 640,
    backgroundColor: '#0b0f0d', frame: false, show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (db.data.settings.startInTV) win.setFullScreen(true);
    win.show();
  });
  // Démarrage réussi : la version en cours est validée.
  win.webContents.once('did-finish-load', () => setTimeout(() => {
    const marker = process.env.HMZ_BOOT_MARKER;
    if (marker) fs.rm(marker, { force: true }, () => {});
  }, 4000));
  win.on('maximize', () => send('window:state', { maximized: true }));
  win.on('unmaximize', () => send('window:state', { maximized: false }));
  win.on('enter-full-screen', () => send('window:state', { fullscreen: true }));
  win.on('leave-full-screen', () => send('window:state', { fullscreen: false }));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  db = new Store(path.join(app.getPath('userData'), 'hmz.json'), defaults());
  art = new ArtFinder(path.join(app.getPath('userData'), 'cache'), () => db.data.settings.sgdbKey);
  ensureFolders();
  // 2.3.1 : les images des jeux hors Steam sont recherchées à nouveau avec des règles plus strictes.
  if ((db.data.artRules || 1) < 3) {
    for (const g of Object.values(db.data.games)) if (g.source !== 'steam') { delete g.art; delete g.artTried; }
    db.data.artRules = 3;
    db.save();
  }
  // 2.6.0 : l'étagère devient la vue par défaut de la bibliothèque.
  if ((db.data.uiRev || 0) < 1) { db.data.settings.libView = 'shelf'; db.data.uiRev = 1; db.save(); }
  createWindow();
  setTimeout(() => scanLibrary().catch(console.error), 600);
  setInterval(() => pollProcesses().catch(() => {}), 20000);
  setTimeout(() => checkEmuUpdates().catch(() => {}), 8000);
  setTimeout(adoptExistingEmulators, 3000);
  setInterval(checkLocalUpdate, 15000);
  setupAutoUpdate();
  applyAutostart();
  EMU.setToolsDir(path.join(app.getPath('userData'), 'outils'));
  pad = new PadWatcher(path.join(app.getPath('userData'), 'outils'), onPad);
  pad.start();
});

let pad = null;
app.on('before-quit', () => {
  if (pad) pad.stop();
  for (const id of [...running.keys()]) endSession(id);
  db && db.save(true);
});
app.on('window-all-closed', () => app.quit());

// Émulateur déjà installé sur le PC avec son installateur officiel : HMZ le reprend
// tel quel au lieu d'en télécharger un deuxième. Proposé une seule fois par émulateur.
function adoptExistingEmulators() {
  db.data.adoptSeen = db.data.adoptSeen || {};
  const found = EMU.detectExisting();
  const names = [];
  for (const [id, exe] of Object.entries(found)) {
    if (emuInstalled(id) || db.data.adoptSeen[id]) continue;
    db.data.adoptSeen[id] = true;
    db.data.emulators[id] = { installed: true, exe, dir: path.dirname(exe), version: 'perso', custom: true };
    names.push(EMU.EMULATORS[id].name);
  }
  if (!names.length) return;
  toast(`Déjà installé sur ton PC, repris dans HMZ : ${names.join(', ')}.`, 'ok');
  afterEmuChange();
}

async function checkEmuUpdates() {
  for (const id of Object.keys(db.data.emulators)) {
    const e = db.data.emulators[id];
    if (!e || e.custom || !exists(e.exe)) continue;
    try { e.latest = await EMU.checkUpdate(id); } catch {}
  }
  db.save(); notifyChange();
}

// --- Communication avec l'interface ------------------------------------------------
const handle = (ch, fn) => ipcMain.handle(ch, async (_e, ...a) => {
  try { return { ok: true, data: await fn(...a) }; } catch (e) { console.error(ch, e); return { ok: false, error: e.message }; }
});

handle('state:get', () => publicState());
handle('state:seen', () => { db.data.firstRun = false; db.save(); });
handle('library:scan', () => scanLibrary());
handle('art:refresh', (force) => { fetchArt(!!force); });

handle('game:launch', (id, emu) => launchGame(id, emu));
handle('game:update', (id, patch) => {
  const g = db.data.games[id]; if (!g) return;
  const allowed = ['favorite', 'hidden', 'customName', 'emu'];
  for (const k of allowed) if (k in patch) g[k] = patch[k];
  if (patch.customName === '') delete g.customName;
  db.save(); notifyChange();
});
handle('game:remove', (id) => { delete db.data.games[id]; db.save(); notifyChange(); });
handle('game:openFolder', (id) => {
  const g = db.data.games[id]; if (!g) return;
  const p = g.path || (g.launch && g.launch.type === 'exe' && g.launch.target);
  if (p && exists(p)) shell.showItemInFolder(p);
  else if (g.installDir && exists(g.installDir)) shell.openPath(g.installDir);
});
handle('game:setArt', async (id, kind) => {
  const g = db.data.games[id]; if (!g) return;
  const r = await dialog.showOpenDialog(win, { title: kind === 'hero' ? 'Choisir une image de fond' : 'Choisir une jaquette', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }] });
  if (r.canceled || !r.filePaths[0]) return;
  const dir = path.join(app.getPath('userData'), 'art');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${slug(id)}-${kind}-${Date.now()}${path.extname(r.filePaths[0])}`);
  fs.copyFileSync(r.filePaths[0], dest);
  g.custom = { ...(g.custom || {}), [kind]: fileUrl(dest) };
  db.save(); notifyChange();
});
// Image en data URL pour que l'interface puisse lire sa couleur dominante.
handle('art:dataurl', async (url) => {
  if (!url) return null;
  let buf, type = 'image/jpeg';
  if (url.startsWith('file:')) {
    const p = require('url').fileURLToPath(url);
    buf = fs.readFileSync(p);
    if (/\.png$/i.test(p)) type = 'image/png';
    if (/\.webp$/i.test(p)) type = 'image/webp';
  } else if (/^https:/.test(url)) {
    const r = await require('./src/util').fetchWithTimeout(url, {}, 10000);
    if (!r.ok) return null;
    type = (r.headers.get('content-type') || type).split(';')[0];
    buf = Buffer.from(await r.arrayBuffer());
  } else return null;
  if (!buf || buf.length > 8e6) return null;
  return `data:${type};base64,${buf.toString('base64')}`;
});
handle('art:options', async (id, kind) => {
  const g = db.data.games[id]; if (!g) return [];
  const r = await art.options(g, kind);
  if (r === null) throw new Error('Ajoute ta clé SteamGridDB dans Paramètres pour voir les propositions d\'images.');
  return r;
});
handle('game:setArtUrl', (id, kind, url) => {
  const g = db.data.games[id]; if (!g || !/^https:\/\//.test(url)) return;
  g.custom = { ...(g.custom || {}), [kind]: url };
  db.save(); notifyChange();
});
handle('game:resetArt', (id) => { const g = db.data.games[id]; if (g) { delete g.custom; db.save(); notifyChange(); } });
handle('game:add', async () => {
  const exts = [...new Set(Object.values(SCAN.ROM_EXT).flat().map((e) => e.slice(1)))];
  const r = await dialog.showOpenDialog(win, {
    title: 'Ajouter un jeu', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Jeux PC et jeux de console', extensions: ['exe', 'lnk', 'url', ...exts] }, { name: 'Tous les fichiers', extensions: ['*'] }],
  });
  if (r.canceled) return 0;
  let n = 0;
  for (const f of r.filePaths) {
    const ext = path.extname(f).toLowerCase();
    let entry;
    const consoles = Object.keys(SCAN.ROM_EXT).filter((p) => p !== 'switch2' && SCAN.ROM_EXT[p].includes(ext));
    if (consoles.length) {
      // Extension partagée (.iso, .chd…) : console d'un émulateur installé si possible ;
      // elle se change ensuite dans la fiche du jeu.
      const platform = SCAN.PLATFORM_OF_EXT[ext] || consoles.find((p) => emuInstalled(resolveEmu(p))) || consoles[0];
      if (!SCAN.PLATFORM_OF_EXT[ext]) toast(`${path.basename(f)} rangé dans ${PLATFORMS[platform].label}. Si c'est une autre console, change-la dans la fiche du jeu.`, 'info');
      const name = cleanRomTitle(f);
      entry = { id: `manual:${platform}:${slug(name)}`, name, platform, source: 'manual', path: f };
    } else {
      let target = f, args = [];
      if (ext === '.lnk') {
        try { const sc = shell.readShortcutLink(f); target = sc.target; args = sc.args ? sc.args.match(/(?:[^\s"]+|"[^"]*")+/g).map((a) => a.replace(/^"|"$/g, '')) : []; } catch {}
      }
      const name = path.basename(f).replace(/\.[^.]+$/, '');
      entry = ext === '.url'
        ? { id: `manual:pc:${slug(name)}`, name, platform: 'pc', source: 'manual', launch: { type: 'uri', target: ((fs.readFileSync(f, 'utf8').match(/^URL=(.+)$/m) || [])[1] || '').trim() } }
        : { id: `manual:pc:${slug(name)}`, name, platform: 'pc', source: 'manual', path: target, installDir: path.dirname(target), launch: { type: 'exe', target, args }, exeHints: [] };
    }
    db.data.games[entry.id] = { ...entry, addedAt: Date.now() };
    n++;
  }
  db.save(); notifyChange(); fetchArt(false);
  return n;
});
handle('game:setPlatform', (id, platform) => {
  const g = db.data.games[id]; if (!g || g.source !== 'manual' || !g.path || !PLATFORMS[platform]) return;
  g.platform = platform; db.save(); notifyChange();
});

handle('emu:install', async (id) => {
  const prev = db.data.emulators[id];
  const res = await EMU.install(id, db.data.settings.root, prev && !prev.custom ? prev : null, (p) => send('emu:progress', { id, ...p }));
  db.data.emulators[id] = { ...res, latest: res.version };
  db.save();
  if (!prev || prev.custom || !exists(prev.exe)) { try { await configureEmu(id); } catch (e) { console.error(e); } }
  afterEmuChange();
  return res;
});
handle('emu:installZip', async (id) => {
  const d = EMU.EMULATORS[id];
  const r = await dialog.showOpenDialog(win, { title: `Choisis l'archive (.zip ou .7z) de ${d.name} pour Windows`, properties: ['openFile'], filters: [{ name: 'Archive', extensions: ['zip', '7z'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const res = await EMU.installFromZip(id, db.data.settings.root, r.filePaths[0], (p) => send('emu:progress', { id, ...p }));
  send('emu:progress', { id, step: null });
  db.data.emulators[id] = { ...res };
  db.save();
  try { await configureEmu(id); } catch (e) { console.error(e); }
  afterEmuChange();
  return res;
});
handle('emu:configure', (id) => configureEmu(id));
handle('backup:now', async () => {
  const made = [];
  for (const id of Object.keys(db.data.emulators)) { const f = await backupSaves(id, true); if (f) made.push(EMU.EMULATORS[id].name); }
  return made;
});
handle('backup:open', () => { const d = backupRoot(); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); });
handle('backup:chooseDir', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Où ranger les sauvegardes de tes parties ?', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return;
  db.data.settings.backupDir = r.filePaths[0];
  db.save(); notifyChange();
});
handle('pad:kinds', () => padKinds);
let padRefreshAt = 0;
handle('pad:refresh', () => {
  const now = Date.now();
  if (!pad || now - padRefreshAt < 8000) return false;
  padRefreshAt = now;
  pad.refresh();
  return true;
});

// --- Jeux BlueStacks --------------------------------------------------------------------------
const playNames = {};
async function playStoreName(pkg) {
  if (playNames[pkg] !== undefined) return playNames[pkg];
  try {
    const r = await require('./src/util').fetchWithTimeout(`https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=fr`, {}, 12000);
    const html = r.ok ? await r.text() : '';
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let n = m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '';
    n = n.replace(/\s*[-–—]\s*(Applications|Apps) (sur|on) Google Play\s*$/i, '').trim();
    playNames[pkg] = n && !/google play/i.test(n) ? n : null;
  } catch { playNames[pkg] = null; }
  return playNames[pkg];
}
handle('bluestacks:candidates', async () => {
  const info = SCAN.bluestacksInfo();
  if (!info.player) return { installed: false, list: [] };
  const known = new Set(Object.values(db.data.games).filter((g) => g.package).map((g) => g.package));
  const pkgs = info.packages.filter((p) => !known.has(p)).slice(0, 60);
  const list = [];
  const q = [...pkgs];
  await Promise.all([0, 1, 2, 3].map(async () => { while (q.length) { const p = q.shift(); list.push({ pkg: p, name: await playStoreName(p) }); } }));
  // On ne propose que ce qui existe sur Google Play (écarte les composants internes).
  return { installed: true, list: list.filter((x) => x.name).sort((a, b) => a.name.localeCompare(b.name, 'fr')) };
});
handle('bluestacks:add', async (items) => {
  const info = SCAN.bluestacksInfo();
  if (!info.player) throw new Error("BlueStacks n'est pas installé sur ce PC.");
  let n = 0;
  for (const it of items || []) {
    let pkg = String(it.pkg || '').trim();
    const fromUrl = pkg.match(/[?&]id=([\w.]+)/);
    if (fromUrl) pkg = fromUrl[1];
    if (!/^[a-z][\w]*(\.[\w]+)+$/i.test(pkg)) continue;
    const name = it.name || await playStoreName(pkg) || pkg;
    db.data.games[`android:${pkg}`] = {
      id: `android:${pkg}`, name, platform: 'mobile', source: 'bluestacks', package: pkg, manualMobile: true, addedAt: Date.now(),
      launch: { type: 'exe', target: info.player, args: ['--instance', info.instance, '--cmd', 'launchApp', '--package', pkg] },
      installDir: path.dirname(info.player), exeHints: [],
    };
    n++;
  }
  db.save(); notifyChange(); fetchArt(false);
  return n;
});

// --- Collections personnelles ---------------------------------------------------------------
const COLL_COLORS = ['#ff6b5e', '#f6c344', '#5fd38d', '#7aa2ff', '#c084fc', '#ff3ea5', '#5ef0c6', '#ff9f43'];
handle('collection:create', (name, gameId) => {
  const list = db.data.collections;
  const c = { id: 'c' + Date.now().toString(36), name: String(name || 'Nouvelle collection').slice(0, 60), color: COLL_COLORS[list.length % COLL_COLORS.length], games: gameId ? [gameId] : [] };
  list.push(c); db.save(); notifyChange();
  return c;
});
handle('collection:update', (id, patch) => {
  const c = db.data.collections.find((x) => x.id === id); if (!c) return;
  if (patch.name) c.name = String(patch.name).slice(0, 60);
  if (patch.color) c.color = patch.color;
  db.save(); notifyChange();
});
handle('collection:delete', (id) => { db.data.collections = db.data.collections.filter((x) => x.id !== id); db.save(); notifyChange(); });
handle('collection:toggle', (id, gameId, on) => {
  const c = db.data.collections.find((x) => x.id === id); if (!c) return;
  const has = c.games.includes(gameId);
  const want = on === undefined ? !has : !!on;
  if (want && !has) c.games.push(gameId);
  if (!want && has) c.games = c.games.filter((g) => g !== gameId);
  db.save(); notifyChange();
  return want;
});
handle('collection:move', (id, dir) => {
  const l = db.data.collections, i = l.findIndex((x) => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]]; db.save(); notifyChange();
});
handle('game:setGenres', (id, list) => {
  const g = db.data.games[id]; if (!g) return;
  g.genresManual = Array.isArray(list) ? list.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : null;
  if (!g.genresManual || !g.genresManual.length) delete g.genresManual;
  db.save(); notifyChange();
});
handle('emu:checkUpdates', () => checkEmuUpdates());
handle('emu:locate', async (id) => {
  const d = EMU.EMULATORS[id];
  const r = await dialog.showOpenDialog(win, { title: `Où se trouve ${d.name} ?`, properties: ['openFile'], filters: [{ name: 'Programme', extensions: ['exe'] }] });
  if (r.canceled || !r.filePaths[0]) return;
  db.data.emulators[id] = { installed: true, exe: r.filePaths[0], dir: path.dirname(r.filePaths[0]), version: 'perso', custom: true };
  db.save(); afterEmuChange();
});
// Un émulateur vient d'arriver : son dossier de jeux apparaît et les jeux sont recherchés.
function afterEmuChange() {
  ensureFolders();
  db.save(); notifyChange();
  scanLibrary().catch((e) => console.error(e));
}
// Succès Steam (lus dans les fichiers de Steam) et lien HowLongToBeat d'un jeu.
handle('game:extras', async (id) => {
  const g = db.data.games[id];
  if (!g) return null;
  let achievements = null;
  if (g.source === 'steam' && g.appid) {
    try { const root = await SCAN.steamRoot(); if (root) achievements = EXTRAS.steamAchievements(root, g.appid); } catch (e) { console.error(e); }
  }
  return { achievements, hltb: g.platform === 'mobile' ? null : EXTRAS.hltbLink(g.customName || g.name) };
});
handle('emu:forget', (id) => { delete db.data.emulators[id]; db.save(); notifyChange(); });
handle('emu:uninstall', async (id) => {
  const e = db.data.emulators[id];
  if (!e) return { removed: false };
  const busy = [...running.keys()].some((gid) => { const g = db.data.games[gid]; return g && g.platform !== 'pc' && (g.emu || resolveEmu(g.platform)) === id; });
  if (busy) throw new Error('Un jeu tourne encore avec cet émulateur. Ferme-le d\'abord.');
  if (db.data.settings.backups) { try { await backupSaves(id, true); } catch {} }
  let res;
  try { res = EMU.uninstall(id, e, db.data.settings.root); }
  catch (err) { throw new Error(`Suppression impossible : ${err.code === 'EBUSY' || err.code === 'EPERM' ? "l'émulateur est peut-être encore ouvert" : err.message}`); }
  delete db.data.emulators[id];
  db.save(); notifyChange();
  return res;
});
handle('emu:open', (id) => {
  const e = db.data.emulators[id];
  if (!e || !exists(e.exe)) throw new Error("L'émulateur n'est pas installé.");
  spawn(e.exe, [], { cwd: path.dirname(e.exe), detached: true, stdio: 'ignore' }).unref();
});
handle('emu:openDir', (id) => { const e = db.data.emulators[id]; if (e && e.dir) shell.openPath(e.dir); });
handle('emu:keys', async (id) => {
  const r = await dialog.showOpenDialog(win, { title: 'Choisis le fichier prod.keys extrait de ta console', properties: ['openFile'], filters: [{ name: 'Clés', extensions: ['keys'] }, { name: 'Tous', extensions: ['*'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const res = EMU.installKeys(id, db.data.emulators[id], r.filePaths[0]);
  notifyChange();
  return res;
});
handle('emu:firmware', async (id) => {
  const r = await dialog.showOpenDialog(win, { title: 'Choisis le dossier (ou le .zip) du firmware extrait de ta console', properties: ['openDirectory', 'openFile'], filters: [{ name: 'Firmware', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  send('emu:progress', { id, step: 'Installation du firmware…' });
  const res = await EMU.installFirmware(id, db.data.emulators[id], r.filePaths[0]);
  send('emu:progress', { id, step: null });
  notifyChange();
  return res;
});

handle('settings:set', (patch) => {
  const s = db.data.settings;
  const keyChanged = 'sgdbKey' in patch && patch.sgdbKey !== s.sgdbKey;
  Object.assign(s, patch);
  db.save(); ensureFolders(); notifyChange();
  if ('autostart' in patch) applyAutostart();
  if (keyChanged && s.sgdbKey) fetchArt(true);
  // Une source de jeux activée ou coupée : la bibliothèque est mise à jour.
  if (['scanSteam', 'scanEpic', 'scanOthers', 'scanStores', 'showOwned'].some((k) => k in patch)) scanLibrary().catch(() => {});
});
handle('dir:add', async (platform) => {
  const r = await dialog.showOpenDialog(win, { title: `Dossier de jeux ${PLATFORMS[platform].label}`, properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return;
  const list = db.data.settings.romDirs[platform] || (db.data.settings.romDirs[platform] = []);
  if (!list.includes(r.filePaths[0])) list.push(r.filePaths[0]);
  db.save(); await scanLibrary();
});
handle('dir:remove', async (platform, dir) => {
  const s = db.data.settings;
  s.romDirs[platform] = (s.romDirs[platform] || []).filter((d) => d !== dir);
  db.save(); await scanLibrary();
});
handle('dir:open', (platform) => {
  const d = (db.data.settings.romDirs[platform] || [])[0];
  if (d) { fs.mkdirSync(d, { recursive: true }); shell.openPath(d); }
});
handle('root:choose', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Dossier principal de HMZ', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return;
  const s = db.data.settings;
  const oldRoot = s.root;
  s.root = r.filePaths[0];
  for (const [p, n] of Object.entries(ROM_FOLDER_NAMES)) {
    s.romDirs[p] = (s.romDirs[p] || []).map((d) => (d === path.join(oldRoot, 'Jeux', n) ? path.join(s.root, 'Jeux', n) : d));
  }
  db.save(); ensureFolders(); await scanLibrary();
});
handle('root:open', () => { fs.mkdirSync(db.data.settings.root, { recursive: true }); shell.openPath(db.data.settings.root); });
handle('open:url', (url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

handle('app:restart', () => restartApp());
handle('app:checkUpdate', async () => {
  if (!autoUpdater) return { dev: true };
  const r = await autoUpdater.checkForUpdates();
  const v = r && r.updateInfo && r.updateInfo.version;
  return { latest: v || CUR_VERSION, newer: !!(v && versionNewer(v, CUR_VERSION)) };
});
handle('app:rollback', () => {
  if (exists(OVERRIDE_DIR)) fs.renameSync(OVERRIDE_DIR, path.join(path.dirname(OVERRIDE_DIR), `app-ecartee-${Date.now()}`));
  restartApp();
});
handle('win:minimize', () => win.minimize());
handle('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
handle('win:close', () => win.close());
handle('win:fullscreen', (on) => win.setFullScreen(on === undefined ? !win.isFullScreen() : !!on));
