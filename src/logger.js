// Journal d'erreurs de HMZ : un petit fichier texte (hmz.log) dans le dossier de données.
// Les erreurs imprévues y sont notées au lieu de faire planter l'application.
const fs = require('fs');
const path = require('path');

let file = null;
const recent = []; // dernières erreurs, pour le bouton « Signaler un problème »
const MAX = 512 * 1024;

function init(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, 'hmz.log');
    // Le journal reste petit : l'ancien est mis de côté quand il grossit.
    try { if (fs.statSync(file).size > MAX) fs.renameSync(file, file + '.old'); } catch {}
  } catch { file = null; }
  for (const lvl of ['error', 'warn']) {
    const orig = console[lvl].bind(console);
    console[lvl] = (...a) => { orig(...a); write(lvl === 'error' ? 'ERREUR' : 'ATTENTION', a); };
  }
}

function fmt(a) {
  return a.map((x) => (x instanceof Error ? `${x.message}\n${(x.stack || '').split('\n').slice(1, 6).join('\n')}` : typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })())).join(' ');
}

function write(level, args) {
  const line = `[${new Date().toISOString()}] ${level} ${fmt(args)}`;
  if (level !== 'INFO') { recent.push(line); if (recent.length > 30) recent.shift(); }
  if (!file) return;
  try { fs.appendFileSync(file, line + '\n'); } catch {}
}

const info = (...a) => write('INFO', a);
const getFile = () => file;
const lastErrors = (n = 12) => recent.slice(-n);

module.exports = { init, info, write, getFile, lastErrors };
