// Mode secours : une version installée qui plante au chargement doit chercher, télécharger
// et installer toute seule la version corrigée.
const Module = require('module'), fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'secours-'));
process.env.HOME = home;
const boom = path.resolve(__dirname, '..', 'main.js') + '.boom';
const ev = { checked: 0, installed: 0, errorBox: 0, exit: null, info: 0 };
const listeners = {};
const updater = {
  on: (n, f) => { listeners[n] = f; },
  checkForUpdates: async () => { ev.checked++; setTimeout(() => listeners['update-downloaded'] && listeners['update-downloaded']({ version: '9.9.9' }), 20); },
  quitAndInstall: () => { ev.installed++; },
};
const electron = {
  app: { isPackaged: true, isReady: () => true, whenReady: async () => {}, getPath: () => path.join(home, 'userData'), exit: (c) => { ev.exit = c; }, relaunch() {} },
  dialog: { showErrorBox: () => { ev.errorBox++; }, showMessageBox: async () => { ev.info++; return {}; } },
};
const orig = Module._load;
Module._load = function (r, parent, ...a) {
  if (r === 'electron') return electron;
  if (r === 'electron-updater') return { autoUpdater: updater };
  const full = r.startsWith('.') || path.isAbsolute(r) ? path.resolve(parent ? path.dirname(parent.filename) : '', r) : r;
  if (/[\\/]main\.js$/.test(full) && fs.existsSync(full + '.boom')) throw new ReferenceError("Cannot access 'handle' before initialization");
  return orig.call(this, r, parent, ...a);
};
fs.writeFileSync(boom, '');
const quiet = console.error; console.error = () => {};
try { require('../boot.js'); } finally { fs.rmSync(boom, { force: true }); Module._load = orig; console.error = quiet; }
setTimeout(() => {
  assert.equal(ev.checked, 1, 'une correction doit être recherchée');
  assert.equal(ev.installed, 1, 'la correction doit être installée');
  assert.equal(ev.errorBox, 0, 'pas de message d\'erreur quand une correction existe');
  const log = fs.readFileSync(path.join(home, 'userData', 'hmz.log'), 'utf8');
  assert.match(log, /SECOURS/);
  console.log('secours OK : correction recherchée, téléchargée et installée');
}, 1500);
