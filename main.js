// HMZ Launcher : processus principal (Electron).
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const { Store } = require('./src/store');
const { slug, run, exists, cleanRomTitle } = require('./src/util');
const EMU = require('./src/emulators');
const SCAN = require('./src/scan');
const { ArtFinder, fileUrl } = require('./src/art');

const PLATFORMS = {
  pc: { label: 'PC', color: '#7aa2ff' },
  switch2: { label: 'Switch 2', color: '#ff5a4e' },
  switch: { label: 'Switch', color: '#ff7a59' },
  '3ds': { label: '3DS', color: '#f6c344' },
  ds: { label: 'DS', color: '#7fd1b9' },
};
const ROM_FOLDER_NAMES = { ds: 'DS', '3ds': '3DS', switch: 'Switch', switch2: 'Switch 2' };

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
  for (const [p, n] of Object.entries(ROM_FOLDER_NAMES)) romDirs[p] = [path.join(root, 'Jeux', n)];
  return {
    settings: {
      root, romDirs, sgdbKey: '', startInTV: false, emuFullscreen: true, minimizeOnPlay: true,
      scanSteam: true, scanEpic: true,
    },
    emulators: {},
    games: {},
    sessions: [],
    firstRun: true,
  };
}

function ensureFolders() {
  const s = db.data.settings;
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
    const emuId = g.source === 'rom' ? (g.emu || EMU.DEFAULT_EMU[g.platform]) : null;
    return {
      id: g.id, name: g.customName || g.name, originalName: g.name, platform: g.platform, source: g.source,
      favorite: !!g.favorite, hidden: !!g.hidden, addedAt: g.addedAt, size: g.size || 0,
      minutes: Math.round(minutes), sessions: s.sessions, last,
      art: { ...(g.art || {}), ...(g.custom || {}) },
      emu: emuId, emuReady: emuId ? !!(db.data.emulators[emuId] && exists(db.data.emulators[emuId].exe)) : true,
      path: g.path || g.installDir || (g.launch && g.launch.target) || '',
      running: running.has(g.id),
    };
  });
  const emulators = Object.values(EMU.EMULATORS).map((d) => {
    const e = db.data.emulators[d.id] || {};
    const ok = !!(e.exe && exists(e.exe));
    return {
      id: d.id, name: d.name, platforms: d.platforms, blurb: d.blurb, experimental: !!d.experimental, page: d.page,
      installed: ok, version: e.version || null, custom: !!e.custom, latest: e.latest || null,
      needsKeys: d.needsKeys, keys: ok ? EMU.keysStatus(d.id, e) : null, dir: e.dir || null,
    };
  });
  const since = Date.now() - 400 * 864e5;
  return {
    version: CUR_VERSION,
    builtinVersion: process.env.HMZ_BUILTIN_VERSION || CUR_VERSION,
    codeSource: process.env.HMZ_CODE_SOURCE || 'installée',
    updateReady,
    settings: db.data.settings,
    platforms: PLATFORMS,
    games, emulators,
    sessions: db.data.sessions.filter((s) => s.e > since),
    firstRun: db.data.firstRun,
  };
}

// --- Bibliothèque --------------------------------------------------------------
async function scanLibrary() {
  const s = db.data.settings;
  ensureFolders();
  send('scan:progress', 'Recherche des jeux…');
  const found = [...SCAN.scanRoms(s.romDirs)];
  if (process.platform === 'win32') {
    if (s.scanSteam) { try { found.push(...await SCAN.scanSteam()); } catch (e) { console.error(e); } }
    if (s.scanEpic) { try { found.push(...SCAN.scanEpic()); } catch (e) { console.error(e); } }
  }
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
    };
  }
  for (const id of Object.keys(games)) {
    if (!seen.has(id) && games[id].source !== 'manual') delete games[id];
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
    const todo = Object.values(db.data.games).filter((g) =>
      force || !g.art || (!g.art.cover && (!g.artTried || Date.now() - g.artTried > 3 * 864e5)));
    let done = 0;
    const worker = async () => {
      while (todo.length) {
        const g = todo.shift();
        try {
          g.art = { ...(force ? {} : g.art || {}), ...await art.find(g) };
        } catch (e) {
          if (e.status === 401) { toast('Clé SteamGridDB refusée : vérifie-la dans Paramètres.', 'error'); todo.length = 0; }
        }
        g.artTried = Date.now();
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
  if (running.has(id) && running.get(id).kind === 'child') return { already: true };
  const s = db.data.settings;
  let cmd = null, args = [];

  if (g.source === 'rom' || (g.source === 'manual' && g.platform !== 'pc')) {
    const emuId = emuOverride || g.emu || EMU.DEFAULT_EMU[g.platform];
    const emu = db.data.emulators[emuId];
    if (!emu || !exists(emu.exe)) return { needEmu: emuId };
    if (!exists(g.path)) throw new Error('Le fichier du jeu est introuvable. Il a peut-être été déplacé.');
    cmd = emu.exe;
    args = EMU.EMULATORS[emuId].args(g.path, s.emuFullscreen);
  } else if (g.launch && g.launch.type === 'exe') {
    cmd = g.launch.target; args = g.launch.args || [];
    if (!exists(cmd)) throw new Error('Le programme du jeu est introuvable.');
  } else if (g.launch && g.launch.type === 'uri') {
    await shell.openExternal(g.launch.target);
    g.lastLaunched = Date.now();
    db.save(); notifyChange();
    return { ok: true };
  }

  const child = spawn(cmd, args, { cwd: path.dirname(cmd), detached: true, stdio: 'ignore', windowsHide: false });
  child.on('error', (e) => { toast(`Lancement impossible : ${e.message}`, 'error'); endSession(id); });
  child.on('exit', () => {
    endSession(id);
    if (minimizedForGame && win && ![...running.values()].some((r) => r.kind === 'child')) {
      minimizedForGame = false;
      win.restore(); win.focus();
    }
  });
  child.unref();
  startSession(id, 'child');
  if (s.minimizeOnPlay && win) { minimizedForGame = true; setTimeout(() => win && win.minimize(), 1200); }
  return { ok: true };
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
  createWindow();
  setTimeout(() => scanLibrary().catch(console.error), 600);
  setInterval(() => pollProcesses().catch(() => {}), 20000);
  setTimeout(() => checkEmuUpdates().catch(() => {}), 8000);
  setInterval(checkLocalUpdate, 15000);
  setupAutoUpdate();
});

app.on('before-quit', () => {
  for (const id of [...running.keys()]) endSession(id);
  db && db.save(true);
});
app.on('window-all-closed', () => app.quit());

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
    if (SCAN.PLATFORM_OF_EXT[ext]) {
      const platform = SCAN.PLATFORM_OF_EXT[ext];
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
  const g = db.data.games[id]; if (!g || g.source !== 'manual' || !g.path) return;
  g.platform = platform; db.save(); notifyChange();
});

handle('emu:install', async (id) => {
  const prev = db.data.emulators[id];
  const res = await EMU.install(id, db.data.settings.root, prev && !prev.custom ? prev : null, (p) => send('emu:progress', { id, ...p }));
  db.data.emulators[id] = { ...res, latest: res.version };
  db.save(); notifyChange();
  return res;
});
handle('emu:checkUpdates', () => checkEmuUpdates());
handle('emu:locate', async (id) => {
  const d = EMU.EMULATORS[id];
  const r = await dialog.showOpenDialog(win, { title: `Où se trouve ${d.name} ?`, properties: ['openFile'], filters: [{ name: 'Programme', extensions: ['exe'] }] });
  if (r.canceled || !r.filePaths[0]) return;
  db.data.emulators[id] = { installed: true, exe: r.filePaths[0], dir: path.dirname(r.filePaths[0]), version: 'perso', custom: true };
  db.save(); notifyChange();
});
handle('emu:forget', (id) => { delete db.data.emulators[id]; db.save(); notifyChange(); });
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
  if (keyChanged && s.sgdbKey) fetchArt(true);
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
