// Vérification automatique du code de HMZ (lancée par « npm run verifier » et avant chaque publication).
// Elle repère surtout ce qui fait planter au démarrage : nom inconnu, variable utilisée avant
// d'exister, clé en double, code jamais atteint…
const js = require('@eslint/js');
const globals = require('globals');

const rules = {
  ...js.configs.recommended.rules,
  // Variable ou constante utilisée avant sa déclaration au même niveau (cause du bug de la 2.11.0).
  'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
  'no-undef': 'error',
  // Bruit sans risque de plantage : désactivé.
  'no-unused-vars': 'off', 'no-empty': 'off', 'no-useless-escape': 'off', 'no-control-regex': 'off',
  'no-prototype-builtins': 'off', 'no-cond-assign': 'off', 'no-async-promise-executor': 'off', 'no-misleading-character-class': 'off',
};

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'renderer/**', 'test/mock*.js', '.lint/zz-*'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: { ...globals.node } },
    rules,
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules,
  },
  // L'interface : ses fichiers sont vérifiés ensemble, dans l'ordre de index.html (voir scripts/lint.js).
  {
    files: ['.lint/renderer.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser } },
    rules,
  },
];
