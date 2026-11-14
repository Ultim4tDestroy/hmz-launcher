// Mode secours : si HMZ ne peut pas démarrer (erreur dans son code), il cherche tout seul
// une version corrigée sur GitHub, la télécharge et l'installe. L'utilisateur n'a rien à faire.
// Sans correction disponible, un message clair explique quoi faire (au lieu d'un HMZ invisible).
const fs = require('fs');
const path = require('path');

let started = false;

function note(app, err) {
  try {
    const f = path.join(app.getPath('userData'), 'hmz.log');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, `[${new Date().toISOString()}] SECOURS ${err && err.stack ? err.stack : err}\n`);
    return f;
  } catch { return ''; }
}

function start(err) {
  if (started) return;
  started = true;
  const { app, dialog } = require('electron');
  const logFile = note(app, err);
  const giveUp = (why) => {
    try {
      dialog.showErrorBox('HMZ ne peut pas démarrer',
        `${err && err.message ? err.message : err}\n\n${why}\n\nRéinstalle la dernière version depuis :\nhttps://github.com/Ultim4tDestroy/hmz-launcher/releases\n\nDétail noté dans : ${logFile}`);
    } catch {}
    app.exit(1);
  };
  const run = () => {
    let updater = null;
    try { if (app.isPackaged) ({ autoUpdater: updater } = require('electron-updater')); } catch {}
    if (!updater) return giveUp('Aucune correction automatique possible ici.');
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    // Message non bloquant pendant la recherche.
    dialog.showMessageBox({ type: 'info', title: 'HMZ', message: 'HMZ a rencontré un problème au démarrage.', detail: 'Recherche et téléchargement d\'une version corrigée… HMZ redémarrera tout seul dans quelques instants.', buttons: ['OK'] }).catch(() => {});
    updater.on('update-downloaded', () => { setTimeout(() => updater.quitAndInstall(true, true), 800); });
    updater.on('update-not-available', () => giveUp('Aucune version corrigée n\'est encore disponible.'));
    updater.on('error', (e) => giveUp(`La recherche d'une correction a échoué (${e && e.message}).`));
    updater.checkForUpdates().catch((e) => giveUp(`La recherche d'une correction a échoué (${e && e.message}).`));
  };
  if (app.isReady()) run(); else app.whenReady().then(run);
}

module.exports = { start };
