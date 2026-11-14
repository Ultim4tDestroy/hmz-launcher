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
  try { console.log(`OK  GOG possédés ${S.gogOwned().length}`); } catch (e) { bad++; console.log('ÉCHEC GOG Galaxy', e.message); }
  // HDR : le petit programme Windows doit se compiler et répondre (pas d'écran HDR sur la machine de test).
  try { const st = await require('../src/hdr').status(); console.log(`OK  HDR : ${st.length} écran(s) lu(s) ${JSON.stringify(st)}`); }
  catch (e) { bad++; console.log('ÉCHEC HDR', e.message.slice(0, 600)); }
  try { console.log(`OK  Boutique Steam ouverte ? ${await require('../src/clients').isOpen('steam')}`); } catch (e) { bad++; console.log('ÉCHEC boutiques ouvertes', e.message); }
  process.exit(bad ? 1 : 0);
})();
