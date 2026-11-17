// Jeu qui exige les droits administrateur (ex. Solo Leveling: ARISE) : Windows refuse de le
// démarrer directement (spawn → EACCES). HMZ doit passer par la confirmation Windows, s'en
// souvenir pour la suite, et ne jamais planter.
const Module = require('module'); const path = require('path'), fs = require('fs'), os = require('os');
const { EventEmitter } = require('events');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hmze-'));
setTimeout(() => { console.error('ÉCHEC : le test ne se termine pas'); process.exit(1); }, 25000).unref();
process.env.HOME = tmp;

const fail = (msg, ...a) => { console.error('ÉCHEC :', msg, ...a); process.exit(1); };
const handlers = {}; let readyCb; const toasts = [];
const fakeWin = { webContents: { send: (c, d) => { if (c === 'toast') toasts.push(d); }, setWindowOpenHandler() {}, once() {} }, isDestroyed: () => false, loadFile() {}, once() {}, on() {}, show() {}, minimize() {}, restore() {}, focus() {}, setFullScreen() {}, isFullScreen: () => false, isMaximized: () => false };
const exe = path.join(tmp, 'Netmarble Game', 'sololv', 'Solo_Leveling_ARISE.exe');
fs.mkdirSync(path.dirname(exe), { recursive: true }); fs.writeFileSync(exe, 'x');
const electron = {
  app: { requestSingleInstanceLock: () => true, quit() {}, exit: (c) => process.exit(c || 0), relaunch() {}, setJumpList() {}, on() {}, getVersion: () => '2.0.0', getPath: () => path.join(tmp, 'userData'), whenReady: () => ({ then: (cb) => { readyCb = cb; } }) },
  BrowserWindow: function () { return fakeWin; },
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  dialog: { showErrorBox: (t, m) => console.error('BOÎTE D\'ERREUR:', t, m), showOpenDialog: async () => ({ canceled: false, filePaths: [exe] }) },
  shell: { openExternal: async () => {}, openPath: async () => '' }, Menu: { setApplicationMenu() {}, buildFromTemplate: () => ({}) },
  globalShortcut: { register: () => true, unregister() {}, unregisterAll() {} }, Tray: function () { return { setToolTip() {}, setContextMenu() {}, on() {}, destroy() {} }; }, nativeImage: { createFromPath: () => ({ resize() { return this; } }) },
};

// Faux Windows : lancer le jeu directement échoue comme sur le vrai PC (erreur 740 → EACCES).
let fakeSpawn = false; const spawned = [];
const realCP = require('child_process');
const cp = { ...realCP, spawn: (cmd, args, opts) => {
  if (!fakeSpawn) return realCP.spawn(cmd, args, opts);
  spawned.push(cmd);
  const child = new EventEmitter(); child.unref = () => {}; child.pid = undefined;
  process.nextTick(() => { const e = new Error(`spawn ${cmd} EACCES`); e.code = 'EACCES'; e.errno = -4092; e.syscall = 'spawn'; child.emit('error', e); });
  return child;
} };
const util = require('../src/util');
const realRun = util.run; const elevated = []; let refuseUac = false;
util.run = (cmd, args, opts) => {
  if (cmd === 'powershell.exe' && args.some((a) => /-Verb RunAs/.test(a))) {
    elevated.push(args[args.length - 1]);
    if (refuseUac) { const e = new Error('Command failed'); e.stderr = "Start-Process : Cette commande ne peut pas être exécutée en raison de l'erreur suivante : L'opération a été annulée par l'utilisateur."; return Promise.reject(e); }
    return Promise.resolve('');
  }
  if (cmd === 'tasklist') return Promise.resolve('');
  return realRun(cmd, args, opts);
};
const orig = Module._load;
Module._load = function (req, ...a) { if (req === 'electron') return electron; if (req === 'child_process') return cp; return orig.call(this, req, ...a); };
global.fetch = async () => { throw new Error('offline'); };
require('../main.js');
readyCb();

(async () => {
  const call = async (ch, ...a) => { const r = await handlers[ch]({}, ...a); if (!r.ok) throw new Error(ch + ': ' + r.error); return r.data; };
  if (await call('game:add') !== 1) fail('jeu non ajouté');
  const id = (await call('state:get')).games.find((g) => g.name === 'Solo_Leveling_ARISE').id;

  Object.defineProperty(process, 'platform', { value: 'win32' });
  fakeSpawn = true;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1er lancement : échec direct → confirmation administrateur automatique, sans plantage.
  await call('game:launch', id);
  await wait(200);
  if (spawned.length !== 1) fail('le jeu aurait dû être tenté une fois directement', spawned);
  if (elevated.length !== 1 || !elevated[0].includes('Solo_Leveling_ARISE.exe')) fail('pas de relance en administrateur', elevated);
  if (toasts.some((t) => /EACCES|spawn /.test(t.text))) fail('message technique montré à l\'utilisateur', toasts);
  let g = (await call('state:get')).games.find((x) => x.id === id);
  if (!g.runAsAdmin) fail('« Lancer en administrateur » non mémorisé');
  console.log('1er lancement : relancé en administrateur et mémorisé ✔');

  // 2e lancement : directement en administrateur, sans échec préalable.
  await call('game:launch', id);
  await wait(100);
  if (spawned.length !== 1 || elevated.length !== 2) fail('2e lancement : devait passer directement en administrateur', spawned, elevated);
  console.log('2e lancement : directement en administrateur ✔');

  // Confirmation refusée : message clair, pas de plantage.
  refuseUac = true;
  const quiet = console.error; console.error = () => {}; // l'erreur attendue est notée dans le journal
  const r = await handlers['game:launch']({}, id);
  console.error = quiet;
  if (r.ok || r.error !== 'Lancement annulé.') fail('refus de la confirmation mal géré', r);
  console.log('confirmation refusée : « Lancement annulé. » ✔');

  const log = fs.readFileSync(path.join(tmp, 'userData', 'hmz.log'), 'utf8');
  if (/PLANTAGE/.test(log)) fail('plantage noté', log.split('\n').filter((l) => /PLANTAGE/.test(l)));
  console.log('Jeux qui exigent les droits administrateur : OK');
  process.exit(0);
})().catch((e) => fail(e.stack || e));
