// HMZ · Lancement direct des jeux Riot (Valorant, League of Legends…).
// La commande officielle (« --launch-product=valorant ») est ignorée par le Riot Client
// tant qu'il démarre ou se connecte : il s'ouvre alors sur sa page et attend « Jouer ».
// On surveille donc le lancement et on renvoie la même commande une fois le client prêt,
// jusqu'à ce que le jeu apparaisse (comme pour Battle.net).

// Programmes qui montrent que le jeu (ou son salon, pour League of Legends) est bien ouvert.
const STARTED = {
  valorant: ['VALORANT-Win64-Shipping.exe', 'VALORANT.exe'],
  league_of_legends: ['LeagueClient.exe', 'LeagueClientUx.exe', 'League of Legends.exe'],
  bacon: ['LoR.exe'],
  lion: ['2XKO.exe'],
};
const CLIENT = ['Riot Client.exe', 'RiotClientUx.exe'];

function productOf(args) {
  const a = (args || []).find((x) => /^--launch-product=/.test(x));
  return a ? a.split('=')[1] : null;
}

// deps : send() relance la commande ; runningNames() → liste des programmes ouverts (en minuscules) ;
// wait(ms) ; log(texte). Retourne ce qui s'est passé, pour le journal et les tests.
async function ensureStarted(product, deps, opts = {}) {
  const step = opts.step ?? 3000;        // une vérification toutes les 3 s
  const total = opts.total ?? 120000;    // on abandonne après 2 minutes
  const settle = opts.settle ?? 6000;    // le client doit être ouvert depuis ~6 s avant de renvoyer
  const gap = opts.gap ?? 15000;         // au moins 15 s entre deux renvois
  const maxResends = opts.maxResends ?? 3;
  const game = (STARTED[product] || []).map((x) => x.toLowerCase());
  const client = CLIENT.map((x) => x.toLowerCase());
  let clientSince = null, lastSend = 0, resends = 0;
  for (let t = 0; t < total; t += step) {
    await deps.wait(step);
    const names = await deps.runningNames();
    if (game.length && names.some((n) => game.includes(n))) return { started: true, resends };
    if (!names.some((n) => client.includes(n))) { clientSince = null; continue; }
    if (clientSince === null) clientSince = t;
    if (t - clientSince >= settle && t - lastSend >= gap && resends < maxResends) {
      resends++; lastSend = t;
      deps.log(`Riot Client prêt : nouvelle demande de lancement (${product}, essai ${resends})`);
      deps.send();
      if (!game.length) return { started: null, resends }; // jeu inconnu : un seul renvoi
    }
  }
  return { started: false, resends };
}

module.exports = { ensureStarted, productOf, STARTED };
