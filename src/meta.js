// Infos d'un jeu pour sa fiche : résumé, date de sortie, studio, éditeur, captures.
// Jeux Steam : boutique Steam (en français). Autres : Wikipédia en français et Wikidata.
const { fetchWithTimeout, normTitle, similarity } = require('./util');

const UA = { 'User-Agent': 'HMZ-Launcher/2 (https://github.com/Ultim4tDestroy/hmz-launcher)' };
const getJson = async (url) => { const r = await fetchWithTimeout(url, { headers: UA }, 15000); if (!r.ok) { const e = new Error(`HTTP ${r.status}`); e.status = r.status; throw e; } return r.json(); };

const MOIS = { janv: 1, jan: 1, fevr: 2, fev: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, aout: 8, sept: 9, oct: 10, nov: 11, dec: 12 };
// « 25 févr. 2022 » → « 2022-02-25 » (pour trier par date de sortie).
function frDate(txt) {
  const t = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const m = t.match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/);
  if (m && MOIS[m[2]]) return `${m[3]}-${String(MOIS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const y = t.match(/(19|20)\d{2}/);
  return y ? y[0] : '';
}
const clean = (html) => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+\n/g, '\n').trim();

async function fromSteam(appid) {
  const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=french`);
  const d = j && j[appid] && j[appid].success ? j[appid].data : null;
  if (!d) return null;
  return {
    src: 'steam', url: `https://store.steampowered.com/app/${appid}`,
    desc: clean(d.short_description).slice(0, 900),
    released: frDate(d.release_date && d.release_date.date), releasedText: (d.release_date && d.release_date.date) || '',
    dev: (d.developers || []).slice(0, 2).join(', '), pub: (d.publishers || []).slice(0, 2).join(', '),
    shots: (d.screenshots || []).slice(0, 8).map((x) => ({ thumb: x.path_thumbnail, full: x.path_full })),
  };
}

// Wikipédia : on cherche l'article du jeu vidéo, puis ses infos sur Wikidata.
async function fromWikipedia(name, hint) {
  const q = encodeURIComponent(`${name} jeu vidéo ${hint || ''}`.trim());
  const s = await getJson(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=5&format=json&origin=*`);
  const want = normTitle(name);
  const hits = ((s.query || {}).search || []).filter((h) => similarity(name, h.title.replace(/\s*\(.*?\)\s*$/, '')) >= 0.72 || normTitle(h.title).startsWith(want));
  for (const h of hits) {
    const sum = await getJson(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.title.replace(/ /g, '_'))}`).catch(() => null);
    if (!sum || sum.type === 'disambiguation' || !/jeu vid[ée]o/i.test(`${sum.description || ''} ${sum.extract || ''}`.slice(0, 400))) continue;
    const out = { src: 'wikipedia', url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || '', desc: String(sum.extract || '').slice(0, 900), released: '', releasedText: '', dev: '', pub: '', shots: [] };
    if (sum.wikibase_item) {
      try {
        const e = (await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${sum.wikibase_item}.json`)).entities[sum.wikibase_item];
        const claims = e.claims || {};
        const dates = (claims.P577 || []).map((c) => c.mainsnak.datavalue && c.mainsnak.datavalue.value.time).filter(Boolean).sort();
        if (dates[0]) { const m = dates[0].match(/^\+?(\d{4})-(\d{2})-(\d{2})/); if (m) { out.released = m[2] === '00' ? m[1] : `${m[1]}-${m[2]}-${m[3] === '00' ? '01' : m[3]}`; out.releasedText = m[2] === '00' ? m[1] : new Date(`${m[1]}-${m[2]}-${m[3] === '00' ? '01' : m[3]}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } }
        const ids = (p) => (claims[p] || []).map((c) => c.mainsnak.datavalue && c.mainsnak.datavalue.value.id).filter(Boolean).slice(0, 2);
        const all = [...ids('P178'), ...ids('P123')];
        if (all.length) {
          const lab = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${all.join('|')}&props=labels&languages=fr|en&format=json&origin=*`);
          const name2 = (id) => { const l = (lab.entities[id] || {}).labels || {}; return (l.fr || l.en || {}).value || ''; };
          out.dev = ids('P178').map(name2).filter(Boolean).join(', ');
          out.pub = ids('P123').map(name2).filter(Boolean).join(', ');
        }
      } catch {}
    }
    return out;
  }
  return null;
}

async function find(game, hint) {
  if (game.source === 'steam' && game.appid) {
    const m = await fromSteam(game.appid);
    if (m && m.desc) return m;
  }
  return fromWikipedia(game.customName || game.name, hint);
}

module.exports = { find, frDate, fromSteam, fromWikipedia };
