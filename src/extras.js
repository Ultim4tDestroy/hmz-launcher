// Fiche d'un jeu : succès Steam (lus sur le PC) et durée de vie (HowLongToBeat).
const fs = require('fs');
const path = require('path');
const { fetchWithTimeout } = require('./util');

// --- Format binaire « KeyValues » de Steam ------------------------------------------------
function readKv(buf) {
  let i = 0;
  const cstr = () => { const e = buf.indexOf(0, i); const s = buf.toString('utf8', i, e < 0 ? buf.length : e); i = e < 0 ? buf.length : e + 1; return s; };
  const node = () => {
    const o = {};
    while (i < buf.length) {
      const t = buf[i++];
      if (t === 0x08 || t === 0x0b) return o;
      const k = cstr();
      switch (t) {
        case 0x00: o[k] = node(); break;
        case 0x01: o[k] = cstr(); break;
        case 0x02: case 0x04: case 0x06: o[k] = buf.readInt32LE(i); i += 4; break;
        case 0x03: o[k] = buf.readFloatLE(i); i += 4; break;
        case 0x07: case 0x0a: o[k] = Number(buf.readBigUInt64LE(i)); i += 8; break;
        case 0x05: { const e = buf.indexOf('\0\0', i, 'utf16le'); o[k] = buf.toString('utf16le', i, e); i = e + 2; break; }
        default: return o; // type inconnu : on s'arrête proprement
      }
    }
    return o;
  };
  return node();
}

const lower = (o) => { const r = {}; for (const [k, v] of Object.entries(o || {})) r[k.toLowerCase()] = v; return r; };
const tr = (v) => (typeof v === 'string' ? v : v ? v.french || v.english || Object.values(v).find((x) => typeof x === 'string') || '' : '');

// Succès d'un jeu Steam, d'après les fichiers que Steam garde pour les jeux lancés sur ce PC.
function steamAchievements(steamRoot, appid) {
  const dir = path.join(steamRoot, 'appcache', 'stats');
  let schema;
  try { schema = readKv(fs.readFileSync(path.join(dir, `UserGameStatsSchema_${appid}.bin`))); } catch { return null; }
  const root = schema[String(appid)] || Object.values(schema)[0] || {};
  const stats = lower(root).stats || {};
  // Fichier de progression le plus récent (un par compte Steam).
  let user = {};
  try {
    const files = fs.readdirSync(dir).filter((f) => new RegExp(`^UserGameStats_\\d+_${appid}\\.bin$`).test(f))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (files[0]) user = readKv(fs.readFileSync(path.join(dir, files[0].f))).cache || {};
  } catch {}
  const list = [];
  for (const [sid, st] of Object.entries(stats)) {
    const s = lower(st);
    const type = String(s.type);
    if (!['4', '5', 'ACHIEVEMENTS', 'GROUPACHIEVEMENTS'].includes(type) || !s.bits) continue;
    const u = user[sid] || {};
    const data = Number(u.data) || 0;
    const times = u.AchievementTimes || u.achievementtimes || {};
    for (const [bid, b] of Object.entries(s.bits)) {
      const bb = lower(b);
      const bit = bb.bit !== undefined ? Number(bb.bit) : Number(bid);
      const d = lower(bb.display);
      const got = ((data >>> bit) & 1) === 1;
      const icon = got ? d.icon : (d.icon_gray || d.icon);
      list.push({
        name: tr(d.name) || bb.name || '',
        desc: tr(d.desc),
        hidden: String(d.hidden) === '1',
        unlocked: got,
        time: got && times[String(bit)] ? Number(times[String(bit)]) * 1000 : null,
        icon: icon ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${icon}` : null,
      });
    }
  }
  if (!list.length) return null;
  list.sort((a, b) => (b.unlocked - a.unlocked) || ((b.time || 0) - (a.time || 0)));
  return { total: list.length, unlocked: list.filter((a) => a.unlocked).length, list };
}

// --- HowLongToBeat --------------------------------------------------------------------------
// Le site n'a pas d'API officielle : on reprend l'adresse de recherche que sa propre page
// utilise (elle change de temps en temps, d'où la lecture de son code).
const HLTB = 'https://howlongtobeat.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
let hltbEndpoint = null;

async function findHltbEndpoint() {
  if (hltbEndpoint && Date.now() - hltbEndpoint.at < 6 * 3600e3) return hltbEndpoint;
  const home = await (await fetchWithTimeout(HLTB, { headers: { 'User-Agent': UA, Referer: HLTB + '/' } }, 15000)).text();
  const scripts = [...home.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
  scripts.sort((a, b) => (/_app-|pages\//.test(b) ? 1 : 0) - (/_app-|pages\//.test(a) ? 1 : 0));
  for (const src of scripts.slice(0, 25)) {
    let js = '';
    try { js = await (await fetchWithTimeout(HLTB + src, { headers: { 'User-Agent': UA, Referer: HLTB + '/' } }, 15000)).text(); } catch { continue; }
    // fetch("/api/xxx/".concat("abc").concat("def"), {method:"POST"…
    let m = js.match(/["'`]\/api\/(\w+)\/["'`]\s*\.concat\(\s*["'`](\w+)["'`]\s*\)(?:\s*\.concat\(\s*["'`](\w+)["'`]\s*\))?/);
    if (m) return (hltbEndpoint = { url: `${HLTB}/api/${m[1]}/${m[2]}${m[3] || ''}`, at: Date.now() });
    m = js.match(/["'`]\/api\/(\w+)\/["'`]\s*\+\s*["'`](\w+)["'`](?:\s*\+\s*["'`](\w+)["'`])?/);
    if (m) return (hltbEndpoint = { url: `${HLTB}/api/${m[1]}/${m[2]}${m[3] || ''}`, at: Date.now() });
  }
  throw new Error('adresse de recherche HowLongToBeat introuvable');
}

function hltbBody(name) {
  return {
    searchType: 'games', searchTerms: name.split(/\s+/).filter(Boolean), searchPage: 1, size: 20,
    searchOptions: {
      games: { userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main', rangeTime: { min: null, max: null }, gameplay: { perspective: '', flow: '', genre: '', difficulty: '' }, rangeYear: { min: '', max: '' }, modifier: '' },
      users: { sortCategory: 'postcount' }, lists: { sortCategory: 'follows' }, filter: '', sort: 0, randomizer: 0,
    },
    useCache: true,
  };
}

async function howLongToBeat(name, similarity) {
  const clean = name.replace(/[™®©]/g, '').replace(/[:–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
  let ep = await findHltbEndpoint();
  const post = (url) => fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: '*/*', Origin: HLTB, Referer: HLTB + '/' },
    body: JSON.stringify(hltbBody(clean)),
  }, 15000);
  let r = await post(ep.url);
  if (r.status === 404 || r.status === 403) { hltbEndpoint = null; ep = await findHltbEndpoint(); r = await post(ep.url); }
  if (!r.ok) throw new Error(`HowLongToBeat : HTTP ${r.status}`);
  const j = await r.json();
  let best = null, bs = 0;
  for (const g of j.data || []) {
    const s = Math.max(similarity(name, g.game_name || ''), similarity(name, g.game_alias || ''));
    if (s > bs) { bs = s; best = g; }
  }
  if (!best || bs < 0.72) return null;
  const h = (sec) => (sec > 0 ? Math.round((sec / 3600) * 2) / 2 : null);
  return { id: best.game_id, name: best.game_name, main: h(best.comp_main), plus: h(best.comp_plus), all: h(best.comp_100), url: `${HLTB}/game/${best.game_id}` };
}

module.exports = { readKv, steamAchievements, howLongToBeat, findHltbEndpoint };
