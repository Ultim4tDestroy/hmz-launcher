// Vérifie que chaque émulateur du catalogue se télécharge et s'installe vraiment
// (lancé sur une machine Windows de GitHub Actions). Usage : node scripts/verifier-emulateurs.js [id…]
const fs = require('fs');
const os = require('os');
const path = require('path');
const EMU = require('../src/emulators');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-verif-'));
  EMU.setToolsDir(path.join(root, 'outils'));
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(EMU.EMULATORS);
  const rows = [];
  for (const id of ids) {
    const t = Date.now();
    try {
      const rel = await EMU.latestRelease(EMU.EMULATORS[id]);
      const res = await EMU.install(id, root, null, () => {});
      const ok = res.exe && fs.existsSync(res.exe);
      rows.push({ id, ok, version: rel.version, fichier: rel.file, exe: res.exe ? path.relative(root, res.exe) : '—', s: Math.round((Date.now() - t) / 1000) });
      // Place libre pour la suite.
      EMU.uninstall(id, res, root);
    } catch (e) {
      rows.push({ id, ok: false, erreur: e.message.slice(0, 300), s: Math.round((Date.now() - t) / 1000) });
    }
    const r = rows[rows.length - 1];
    console.log(`${r.ok ? 'OK ' : 'ÉCHEC'} ${id.padEnd(12)} ${r.ok ? `${r.version} · ${r.fichier} → ${r.exe}` : r.erreur} (${r.s} s)`);
  }
  const bad = rows.filter((r) => !r.ok);
  console.log(`\n${rows.length - bad.length}/${rows.length} émulateurs installés correctement.`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| | Émulateur | Version | Fichier | Programme |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.id} | ${r.version || ''} | ${r.fichier || r.erreur || ''} | ${r.exe || ''} |`).join('\n')}\n`);
  }
  process.exit(bad.length ? 1 : 0);
})();
