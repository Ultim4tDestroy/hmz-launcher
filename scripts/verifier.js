// « npm run verifier » : toutes les vérifications, dans l'ordre, arrêt au premier échec.
// C'est la même série que celle lancée par GitHub avant chaque publication.
const { spawnSync } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');

const steps = [
  ['Code (ESLint + ordre des fichiers de l\'interface)', 'node', ['scripts/lint.js']],
  ['Logique (scan, jaquettes, émulateurs…)', 'node', ['test/logic.test.js']],
  ['Mises à jour et versions', 'node', ['test/v23.test.js']],
  ['Démarrage (boot.js)', 'node', ['test/boot.test.js']],
  ['Démarrage simulé du programme principal', 'node', ['test/main.smoke.js']],
  ['Mode secours (version cassée → réparation automatique)', 'node', ['test/recovery.test.js']],
  ['Jeux qui exigent les droits administrateur', 'node', ['test/elevation.test.js']],
  ['Préparation de l\'interface de test', 'node', ['test/gen-catalog.js']],
  ['', 'node', ['test/make-dev.js']],
  ['Parcours complet de l\'interface dans un navigateur', process.platform === 'win32' ? 'python' : 'python3', ['test/flow.py']],
  ['Grosse bibliothèque (1500 jeux) : vitesse de chaque page', process.platform === 'win32' ? 'python' : 'python3', ['test/perf.py']],
];

let n = 0;
for (const [label, cmd, args] of steps) {
  if (label) console.log(`\n▶ ${++n}. ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 180000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  const flowFailed = args[0] === 'test/flow.py' && !/erreurs: \[\]/.test(out);
  if (r.status !== 0 || flowFailed) {
    console.log(out.split('\n').slice(-25).join('\n'));
    console.log(`\n✖ ÉCHEC à l'étape « ${label || args.join(' ')} ». Rien ne doit être publié.`);
    process.exit(1);
  }
  if (label) console.log(`  ✔ ${out.split('\n').filter(Boolean).slice(-1)[0] || 'OK'}`);
}
console.log('\n✔ Tout est vert.');
