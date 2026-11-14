// Fermeture de la boutique (Steam, Epic…) après la partie, seulement si HMZ l'a ouverte.
// On attend d'abord que la synchronisation des sauvegardes dans le cloud ait le temps de se faire.
const { run } = require('./util');

const CLIENTS = {
  steam: { label: 'Steam', exes: ['steam.exe'], exit: 'steam://exit' },
  epic: { label: 'Epic Games', exes: ['EpicGamesLauncher.exe'] },
  battlenet: { label: 'Battle.net', exes: ['Battle.net.exe'] },
  ubisoft: { label: 'Ubisoft Connect', exes: ['upc.exe', 'UbisoftConnect.exe'] },
  riot: { label: 'Riot Client', exes: ['Riot Client.exe', 'RiotClientServices.exe'] },
  ea: { label: 'EA', exes: ['EADesktop.exe'] },
  gog: { label: 'GOG Galaxy', exes: ['GalaxyClient.exe'] },
};

async function runningSet() {
  if (process.platform !== 'win32') return new Set();
  try {
    const out = await run('tasklist', ['/fo', 'csv', '/nh']);
    return new Set(out.split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map((x) => x.toLowerCase()));
  } catch { return new Set(); }
}

async function isOpen(source) {
  const c = CLIENTS[source];
  if (!c) return true; // inconnu : on ne touche à rien
  const set = await runningSet();
  return c.exes.some((e) => set.has(e.toLowerCase()));
}

// Ferme proprement la boutique ; de force seulement si elle est encore là 20 s plus tard.
async function close(source, openExternal) {
  const c = CLIENTS[source];
  if (!c || process.platform !== 'win32') return false;
  if (c.exit && openExternal) { try { await openExternal(c.exit); } catch {} }
  else for (const e of c.exes) { try { await run('taskkill', ['/IM', e, '/T']); } catch {} }
  await new Promise((r) => setTimeout(r, 20000));
  if (await isOpen(source)) for (const e of c.exes) { try { await run('taskkill', ['/IM', e, '/T', '/F']); } catch {} }
  return true;
}

module.exports = { CLIENTS, isOpen, close };
