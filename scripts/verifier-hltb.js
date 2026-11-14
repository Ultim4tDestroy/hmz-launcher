// Vérifie que la recherche HowLongToBeat fonctionne toujours (lancé sur GitHub Actions).
const X = require('../src/extras');
const { similarity } = require('../src/util');
(async () => {
  let fail = 0;
  try { console.log('Adresse :', (await X.findHltbEndpoint()).url); } catch (e) { console.log('ÉCHEC adresse :', e.message); process.exit(1); }
  for (const n of ['ELDEN RING', 'The Legend of Zelda: Tears of the Kingdom', 'Hades', 'Counter-Strike 2', 'Pokémon Ultra Sun']) {
    try { const r = await X.howLongToBeat(n, similarity); console.log(r ? 'OK ' : '—  ', n, '→', JSON.stringify(r)); }
    catch (e) { fail++; console.log('ÉCHEC', n, e.message); }
  }
  process.exit(fail ? 1 : 0);
})();
