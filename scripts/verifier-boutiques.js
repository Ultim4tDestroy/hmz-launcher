// Lance les lecteurs de boutiques sur une machine Windows : ils doivent finir sans erreur.
const S = require('../src/stores');
(async () => {
  let bad = 0;
  for (const [n, f] of [['GOG', S.scanGog], ['Ubisoft', S.scanUbisoft], ['Battle.net', S.scanBattleNet], ['Xbox', S.scanXbox]]) {
    const t = Date.now();
    try { const r = await f(); console.log(`OK  ${n.padEnd(11)} ${r.length} jeu(x) (${Date.now() - t} ms)`); }
    catch (e) { bad++; console.log(`ÉCHEC ${n} : ${e.message}`); }
  }
  try { console.log(`OK  Epic possédés ${S.epicOwned().length}`); } catch (e) { bad++; console.log('ÉCHEC Epic', e.message); }
  process.exit(bad ? 1 : 0);
})();
