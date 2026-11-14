// Lance ESLint sur tout HMZ. Les fichiers de l'interface partagent leurs variables : ils sont
// assemblés dans l'ordre de index.html pour être vérifiés comme le navigateur les voit,
// puis les erreurs sont replacées dans le bon fichier et à la bonne ligne.
const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');

(async () => {
  const root = path.join(__dirname, '..');
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(['main.js', 'boot.js', 'preload.js', 'src/**/*.js', 'scripts/**/*.{js,mjs}', 'test/*.js']);

  // Interface : assemblage dans l'ordre réel de chargement.
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+\.js)"><\/script>/g)].map((m) => m[1]);
  let bundle = '', map = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, 'renderer', f), 'utf8');
    const start = bundle.split('\n').length;
    bundle += text.endsWith('\n') ? text : text + '\n';
    map.push({ f: `renderer/${f}`, start, end: bundle.split('\n').length - 1 });
  }
  fs.mkdirSync(path.join(root, '.lint'), { recursive: true });
  const bundlePath = path.join(root, '.lint', 'renderer.js');
  fs.writeFileSync(bundlePath, bundle);
  // Règle maison : au chargement, un fichier ne peut pas utiliser ce qu'un fichier chargé
  // APRÈS lui déclare (dans le navigateur, chaque fichier s'exécute dans l'ordre).
  const orderRule = {
    meta: { type: 'problem', schema: [{ type: 'array' }] },
    create(context) {
      const ranges = context.options[0] || [];
      const fileOf = (line) => ranges.findIndex((p) => line >= p.start && line <= p.end);
      return {
        'Program:exit'() {
          const scope = context.sourceCode.scopeManager.globalScope;
          for (const ref of scope.references) {
            const v = ref.resolved;
            if (!v || !v.defs.length) continue;
            const useLine = ref.identifier.loc.start.line, defLine = v.defs[0].name.loc.start.line;
            const fu = fileOf(useLine), fd = fileOf(defLine);
            if (fd > fu) context.report({ node: ref.identifier, message: `« ${v.name} » est utilisé au chargement de ${ranges[fu].f}, mais n'est déclaré que plus tard, dans ${ranges[fd].f}.` });
          }
        },
      };
    },
  };
  const bundleLinter = new ESLint({ cwd: root, overrideConfig: [{ files: ['.lint/renderer.js'], plugins: { hmz: { rules: { 'ordre-des-fichiers': orderRule } } }, rules: { 'hmz/ordre-des-fichiers': ['error', map] } }] });
  const [r] = await bundleLinter.lintText(bundle, { filePath: bundlePath });
  for (const m of r.messages) {
    const part = map.find((p) => m.line >= p.start && m.line <= p.end) || map[0];
    m.line = m.line - part.start + 1;
    m.message = `${m.message}`;
    results.push({ filePath: path.join(root, part.f), messages: [m], errorCount: m.severity === 2 ? 1 : 0, warningCount: m.severity === 1 ? 1 : 0 });
  }

  let errors = 0;
  for (const res of results) {
    for (const m of res.messages) {
      if (m.severity !== 2) continue;
      errors++;
      console.log(`${path.relative(root, res.filePath)}:${m.line}:${m.column}  ${m.message}  (${m.ruleId})`);
    }
  }
  console.log(errors ? `\n${errors} erreur(s) dans le code.` : 'Code vérifié : aucune erreur.');
  process.exit(errors ? 1 : 0);
})();
