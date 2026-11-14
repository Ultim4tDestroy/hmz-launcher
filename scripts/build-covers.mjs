// Fabrique data/covers.json : jaquettes, fonds et logos des jeux de
// data/jeux-populaires.txt, depuis SteamGridDB. Lancé par GitHub Actions avec
// la clé rangée dans le secret SGDB_KEY : la clé n'est jamais publiée.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { normTitle, strictSimilarity } = require('../src/util.js');

const KEY = process.env.SGDB_KEY;
if (!KEY) { console.error('Secret SGDB_KEY absent : rien à faire.'); process.exit(0); }
const API = 'https://www.steamgriddb.com/api/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(API + path, { headers: { Authorization: `Bearer ${KEY}` } });
    if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (r.status === 401) throw new Error('Clé SteamGridDB refusée (401).');
    if (!r.ok) return null;
    const j = await r.json();
    return j.success ? j.data : null;
  }
  return null;
}

const names = [...new Set(fs.readFileSync('data/jeux-populaires.txt', 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))];
const old = (() => { try { return JSON.parse(fs.readFileSync('data/covers.json', 'utf8')).games || {}; } catch { return {}; } })();
const out = {};
let ok = 0, miss = [];

async function one(name) {
  const res = await get(`/search/autocomplete/${encodeURIComponent(name)}`) || [];
  let best = null, bs = 0;
  for (const r of res.slice(0, 8)) {
    const s = strictSimilarity(name, r.name);
    if (s > bs) { bs = s; best = r; }
  }
  if (!best || bs < 0.75) { miss.push(name); if (old[normTitle(name)]) out[normTitle(name)] = old[normTitle(name)]; return; }
  const pick = async (kind, q) => { const d = await get(`/${kind}/game/${best.id}?${q}`); return d && d[0] ? d[0].url : null; };
  const [cover, hero, logo] = await Promise.all([
    pick('grids', 'dimensions=600x900,660x930,342x482&types=static&nsfw=false&humor=false'),
    pick('heroes', 'types=static&nsfw=false&humor=false'),
    pick('logos', 'types=static&nsfw=false&humor=false'),
  ]);
  if (!cover && !hero && !logo) { miss.push(name); return; }
  const entry = { name: best.name, sgdb: best.id, cover, hero, logo };
  out[normTitle(name)] = entry;
  if (normTitle(best.name) !== normTitle(name)) out[normTitle(best.name)] = entry;
  ok++;
}

const queue = [...names];
await Promise.all([0, 1, 2].map(async () => {
  while (queue.length) {
    const n = queue.shift();
    try { await one(n); } catch (e) { console.error(e.message); process.exit(1); }
    await sleep(150);
  }
}));

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync('data/covers.json', JSON.stringify({ version: 1, count: ok, games: sorted }, null, 1) + '\n');
console.log(`${ok}/${names.length} jeux trouvés.`);
if (miss.length) console.log('Introuvables :', miss.join(' · '));
