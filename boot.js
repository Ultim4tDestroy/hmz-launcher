// Point d'entrée de HMZ.
// Si une version plus récente du code se trouve dans C:\Users\<toi>\HMZ\app,
// elle est utilisée à la place de celle installée. Si elle plante au démarrage,
// elle est mise de côté et HMZ repart sur la version installée.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILTIN = require('./package.json').version;
const OVERRIDE = path.join(os.homedir(), 'HMZ', 'app');
const BOOTING = path.join(OVERRIDE, '.demarrage');

function newer(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0), pb = String(b).split('.').map((x) => parseInt(x, 10) || 0); // « 2.11.2-test » → 2, 11, 2
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

function overrideVersion() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(OVERRIDE, 'package.json'), 'utf8')).version;
    return fs.existsSync(path.join(OVERRIDE, 'main.js')) ? v : null;
  } catch { return null; }
}

function setAside(reason) {
  try {
    const dest = path.join(os.homedir(), 'HMZ', `app-ecartee-${Date.now()}`);
    fs.renameSync(OVERRIDE, dest);
    fs.writeFileSync(path.join(dest, 'RAISON.txt'), reason);
  } catch {}
}

let entry = path.join(__dirname, 'main.js');
let version = BUILTIN;
let source = 'installée';

const ov = overrideVersion();
if (ov && newer(ov, BUILTIN)) {
  if (fs.existsSync(BOOTING)) {
    // Le dernier démarrage avec cette version n'est pas allé jusqu'au bout.
    setAside(`La version ${ov} n'a pas réussi à démarrer, HMZ est revenu à la version ${BUILTIN}.`);
  } else {
    try { fs.writeFileSync(BOOTING, String(Date.now())); } catch {}
    entry = path.join(OVERRIDE, 'main.js');
    version = ov;
    source = 'mise à jour';
  }
}

process.env.HMZ_VERSION = version;
process.env.HMZ_BUILTIN_VERSION = BUILTIN;
process.env.HMZ_CODE_SOURCE = source;
process.env.HMZ_OVERRIDE_DIR = OVERRIDE;
process.env.HMZ_BOOT_MARKER = source === 'mise à jour' ? BOOTING : '';

try {
  require(entry);
} catch (e) {
  if (source === 'mise à jour') {
    setAside(`Erreur au chargement de la version ${version} : ${e && e.stack}`);
    process.env.HMZ_VERSION = BUILTIN;
    process.env.HMZ_CODE_SOURCE = 'installée';
    process.env.HMZ_BOOT_MARKER = '';
    app.relaunch();
    app.exit(0);
  } else {
    // Version installée cassée : mode secours (télécharge et installe une version corrigée).
    try { console.error('Erreur au chargement de HMZ :', e); } catch {}
    require('./src/recovery').start(e);
  }
}
