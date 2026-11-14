// Crée renderer/dev.html (l'interface avec des données factices, pour les tests sans Electron).
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const out = src
  .replace("script-src 'self'\">", "script-src 'self' 'unsafe-inline'\">")
  .replace(/(\s*)<script src="core\.js"><\/script>/, '$1<script src="../test/mock-catalog.js"></script>$1<script src="../test/mock.js"></script>$1<script src="core.js"></script>');
if (out === src) throw new Error('index.html a changé : impossible de créer dev.html');
fs.writeFileSync(path.join(__dirname, '..', 'renderer', 'dev.html'), out);
console.log('dev.html créé');
