// Recherche des jaquettes, fonds et logos.
// Ordre : fichiers locaux de Steam → SteamGridDB (si clé) → libretro (DS/3DS)
// → boutique Steam (jeux PC) → Wikipédia.
const fs = require('fs');
const path = require('path');
const { fetchJson, urlExists, normTitle, similarity, strictSimilarity, readText, exists } = require('./util');

const COVERS_URL = 'https://raw.githubusercontent.com/Ultim4tDestroy/hmz-launcher/main/data/covers.json';
const COVERS_BUNDLED = path.join(__dirname, '..', 'data', 'covers.json');
const LIBRETRO = { ds: 'Nintendo_-_Nintendo_DS', '3ds': 'Nintendo_-_Nintendo_3DS' };
const steamCdn = (id, f) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/${f}`;
const { pathToFileURL } = require('url');
const fileUrl = (p) => (p ? pathToFileURL(p).href : null);

class ArtFinder {
  constructor(cacheDir, getKey) {
    this.cacheDir = cacheDir;
    this.getKey = getKey;
    this.libretroLists = {};
  }

  async find(game) {
    const art = {};
    const set = (k, v) => { if (v && !art[k]) art[k] = v; };

    if (game.source === 'steam') {
      const la = game.localArt || {};
      set('cover', fileUrl(la.cover));
      set('hero', fileUrl(la.hero));
      set('logo', fileUrl(la.logo));
      if (!art.cover && await urlExists(steamCdn(game.appid, 'library_600x900_2x.jpg'))) set('cover', steamCdn(game.appid, 'library_600x900_2x.jpg'));
      if (!art.hero && await urlExists(steamCdn(game.appid, 'library_hero.jpg'))) set('hero', steamCdn(game.appid, 'library_hero.jpg'));
      if (!art.logo && await urlExists(steamCdn(game.appid, 'logo.png'))) set('logo', steamCdn(game.appid, 'logo.png'));
      set('header', steamCdn(game.appid, 'header.jpg'));
    }

    if (game.source === 'epic') {
      const e = this.epicArt(game);
      if (e) Object.entries(e).forEach(([k, v]) => set(k, v));
    }

    // Base de jaquettes intégrée (préparée sur GitHub depuis SteamGridDB).
    if (game.source !== 'steam' || !art.cover) {
      const hit = await this.fromCoverDb(game.name);
      if (hit) { set('cover', hit.cover); set('hero', hit.hero); set('logo', hit.logo); }
    }

    if ((!art.cover || !art.hero) && this.getKey()) {
      try { Object.entries(await this.sgdb(game)).forEach(([k, v]) => set(k, v)); } catch (e) { if (e.status === 401) throw e; }
    }

    if (!art.cover && LIBRETRO[game.platform]) {
      try { set('cover', await this.libretro(game)); } catch {}
    }

    if (!art.cover && game.platform === 'pc' && game.source !== 'steam') {
      try {
        const s = await this.steamStore(game.name);
        if (s) {
          if (await urlExists(steamCdn(s, 'library_600x900_2x.jpg'))) set('cover', steamCdn(s, 'library_600x900_2x.jpg'));
          if (await urlExists(steamCdn(s, 'library_hero.jpg'))) set('hero', steamCdn(s, 'library_hero.jpg'));
          set('header', steamCdn(s, 'header.jpg'));
        }
      } catch {}
    }

    if (!art.cover) {
      try { const w = await this.wikipedia(game); if (w) Object.entries(w).forEach(([k, v]) => set(k, v)); } catch {}
    }
    return art;
  }

  async coverDb() {
    if (this.covers && Date.now() - this.coversAt < 6 * 3600e3) return this.covers;
    const cache = path.join(this.cacheDir, 'covers.json');
    let data = null;
    try {
      const st = fs.statSync(cache);
      if (Date.now() - st.mtimeMs < 24 * 3600e3) data = JSON.parse(fs.readFileSync(cache, 'utf8'));
    } catch {}
    if (!data) {
      try {
        data = await fetchJson(COVERS_URL, {}, 20000);
        fs.mkdirSync(this.cacheDir, { recursive: true });
        fs.writeFileSync(cache, JSON.stringify(data));
      } catch {
        try { data = JSON.parse(fs.readFileSync(cache, 'utf8')); } catch {}
      }
    }
    if (!data || !data.games || !Object.keys(data.games).length) {
      try { data = JSON.parse(fs.readFileSync(COVERS_BUNDLED, 'utf8')); } catch { data = { games: {} }; }
    }
    this.covers = data.games || {};
    this.coversAt = Date.now();
    return this.covers;
  }

  async fromCoverDb(name) {
    const db = await this.coverDb();
    const k = normTitle(name);
    if (db[k]) return db[k];
    let best = null, bs = 0;
    for (const [key, v] of Object.entries(db)) {
      const s = strictSimilarity(name, key);
      if (s > bs) { bs = s; best = v; }
    }
    return bs >= 0.9 ? best : null;
  }

  // Propositions d'images (avec la clé SteamGridDB de l'utilisateur).
  async options(game, kind) {
    const key = this.getKey();
    if (!key) return null;
    const h = { headers: { Authorization: `Bearer ${key}` } };
    const base = 'https://www.steamgriddb.com/api/v2';
    let gid = null;
    if (game.source === 'steam') { try { gid = (await fetchJson(`${base}/games/steam/${game.appid}`, h)).data.id; } catch {} }
    if (!gid) {
      const res = (await fetchJson(`${base}/search/autocomplete/${encodeURIComponent(game.name)}`, h)).data || [];
      let best = null, bs = 0;
      for (const r of res.slice(0, 8)) { const sc = strictSimilarity(game.name, r.name); if (sc > bs) { bs = sc; best = r; } }
      if (!best) return [];
      gid = best.id;
    }
    const ep = { cover: 'grids', hero: 'heroes', logo: 'logos' }[kind];
    const q = kind === 'cover' ? 'dimensions=600x900,660x930,342x482&types=static&nsfw=false' : 'types=static&nsfw=false';
    const d = (await fetchJson(`${base}/${ep}/game/${gid}?${q}`, h)).data || [];
    return d.slice(0, 30).map((x) => ({ url: x.url, thumb: x.thumb || x.url }));
  }

  // Le launcher Epic garde en cache les images des jeux de ton compte.
  epicArt(game) {
    if (!this.epicCatalog) {
      this.epicCatalog = {};
      const f = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Catalog', 'catcache.bin');
      try {
        const items = JSON.parse(Buffer.from(fs.readFileSync(f, 'utf8'), 'base64').toString('utf8'));
        for (const it of items) if (it && it.id) this.epicCatalog[it.id] = it;
      } catch {}
    }
    const it = this.epicCatalog[game.catalogItemId];
    if (!it || !Array.isArray(it.keyImages)) return null;
    const img = (t) => (it.keyImages.find((k) => k.type === t) || {}).url || null;
    return { cover: img('DieselGameBoxTall') || img('OfferImageTall'), hero: img('DieselGameBox') || img('OfferImageWide'), logo: img('DieselGameBoxLogo') };
  }

  async sgdb(game) {
    const key = this.getKey();
    const h = { headers: { Authorization: `Bearer ${key}` } };
    const base = 'https://www.steamgriddb.com/api/v2';
    let gid = null;
    if (game.source === 'steam') {
      try { gid = (await fetchJson(`${base}/games/steam/${game.appid}`, h)).data.id; } catch (e) { if (e.status === 401) throw e; }
    }
    if (!gid) {
      const res = (await fetchJson(`${base}/search/autocomplete/${encodeURIComponent(game.name)}`, h)).data || [];
      let best = null, bs = 0;
      for (const r of res.slice(0, 6)) {
        const s = strictSimilarity(game.name, r.name);
        if (s > bs) { bs = s; best = r; }
      }
      if (!best || bs < 0.75) return {};
      gid = best.id;
    }
    const get = async (kind, q) => {
      try {
        const d = (await fetchJson(`${base}/${kind}/game/${gid}?${q}`, h)).data || [];
        return d[0] ? d[0].url : null;
      } catch { return null; }
    };
    const [cover, hero, logo] = await Promise.all([
      get('grids', 'dimensions=600x900,342x482,660x930&types=static&nsfw=false'),
      get('heroes', 'types=static&nsfw=false'),
      get('logos', 'types=static&nsfw=false'),
    ]);
    return { cover, hero, logo };
  }

  async libretroList(platform) {
    if (this.libretroLists[platform]) return this.libretroLists[platform];
    const repo = LIBRETRO[platform];
    const cache = path.join(this.cacheDir, `libretro-${platform}.json`);
    try {
      const st = fs.statSync(cache);
      if (Date.now() - st.mtimeMs < 14 * 864e5) {
        return (this.libretroLists[platform] = JSON.parse(fs.readFileSync(cache, 'utf8')));
      }
    } catch {}
    const gh = { headers: { Accept: 'application/vnd.github+json' } };
    const root = await fetchJson(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/master`, gh);
    const node = root.tree.find((t) => t.path === 'Named_Boxarts');
    const tree = await fetchJson(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/${node.sha}`, gh, 30000);
    const names = tree.tree.filter((t) => /\.png$/i.test(t.path)).map((t) => t.path.replace(/\.png$/i, ''));
    fs.mkdirSync(this.cacheDir, { recursive: true });
    fs.writeFileSync(cache, JSON.stringify(names));
    return (this.libretroLists[platform] = names);
  }

  async libretro(game) {
    const names = await this.libretroList(game.platform);
    const want = normTitle(game.name);
    let best = null, bs = 0;
    for (const n of names) {
      let s = normTitle(n) === want ? 1 : 0;
      if (!s) {
        s = similarity(game.name, n);
        if (s < 0.75) continue;
      }
      // Préférence pour les versions françaises puis européennes.
      if (/France|\bFr\b/.test(n)) s += 0.03;
      else if (/Europe/.test(n)) s += 0.02;
      else if (/USA/.test(n)) s += 0.01;
      if (/Demo|Beta|Proto|Kiosk/i.test(n)) s -= 0.2;
      if (s > bs) { bs = s; best = n; }
    }
    if (!best) return null;
    return `https://raw.githubusercontent.com/libretro-thumbnails/${LIBRETRO[game.platform]}/master/Named_Boxarts/${encodeURIComponent(best)}.png`;
  }

  async steamStore(name) {
    const d = await fetchJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=french&cc=FR`);
    let best = null, bs = 0;
    for (const it of d.items || []) {
      const s = strictSimilarity(name, it.name);
      if (s > bs) { bs = s; best = it; }
    }
    return best && bs >= 0.9 ? best.id : null;
  }

  async wikipedia(game) {
    const hint = { switch: 'Nintendo Switch', switch2: 'Nintendo Switch 2', '3ds': 'Nintendo 3DS', ds: 'Nintendo DS', pc: '' }[game.platform] || '';
    // Wikipédia anglais d'abord (jaquettes plus souvent présentes), puis français.
    const tries = [
      ['en', `${game.name} ${hint} video game`],
      ['en', `${game.name} video game`],
      ['fr', `${game.name} jeu vidéo ${hint}`],
    ];
    for (const [lang, q] of tries) {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search`
        + `&gsrsearch=${encodeURIComponent(q.trim())}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=800&pilicense=any`;
      let d;
      try { d = await fetchJson(url); } catch { continue; }
      const pages = Object.values((d.query && d.query.pages) || {}).sort((x, y) => x.index - y.index);
      for (const p of pages) {
        const title = p.title.replace(/\s*\([^)]*\)\s*$/, '');
        if (strictSimilarity(game.name, title) < 0.9 || !p.thumbnail) continue;
        const src = p.thumbnail.source;
        // Pas de logo vectoriel ni de photo d'entreprise ou de personne.
        if (/\.svg|headquarter|_hq|office|building|campus|ceo|founder|portrait|stadium|arena|tournament|champions|event|esports|logo/i.test(decodeURIComponent(src))) continue;
        // Une jaquette est verticale ; une image horizontale (capture d'écran) sert de fond.
        const { width: w, height: hgt } = p.thumbnail;
        if (w && hgt && hgt / w >= 1.15) return { cover: src };
        if (w && hgt && w / hgt >= 1.4) return { hero: src };
        continue;
      }
    }
    return null;
  }
}

// --- Genres ------------------------------------------------------------------------------
const GENRE_RULES = [
  [/battle royale/i, 'Battle royale'],
  [/multiplayer online battle arena|\bmoba\b/i, 'MOBA'],
  [/shooter|shoot 'em up|first-person shooter/i, 'Tir'],
  [/fighting|beat 'em up|brawler/i, 'Combat'],
  [/racing|kart/i, 'Course'],
  [/sports?\b|football|basketball|soccer|golf|tennis/i, 'Sport'],
  [/role-playing|\brpg\b|gacha/i, 'RPG'],
  [/roguelike|roguelite/i, 'Roguelike'],
  [/metroidvania/i, 'Metroidvania'],
  [/platform/i, 'Plateforme'],
  [/adventure/i, 'Aventure'],
  [/strategy|tactics\b|tower defense|auto battler|4x/i, 'Stratégie'],
  [/simulat|life sim|farming|management|city-building|tycoon/i, 'Simulation'],
  [/survival/i, 'Survie'],
  [/horror/i, 'Horreur'],
  [/puzzle|logic/i, 'Réflexion'],
  [/sandbox|open world|crafting|nonlinear/i, 'Monde ouvert'],
  [/party|social deduction/i, 'Party game'],
  [/rhythm|music/i, 'Rythme'],
  [/card|deck-building/i, 'Cartes'],
  [/massively multiplayer|\bmmo/i, 'MMO'],
  [/visual novel/i, 'Visual novel'],
  [/action/i, 'Action'],
];
function mapGenres(labels) {
  const out = [];
  for (const l of labels) for (const [re, g] of GENRE_RULES) if (re.test(l) && !out.includes(g)) out.push(g);
  // « Action » seulement s'il n'y a rien de plus précis.
  const precise = out.filter((g) => g !== 'Action');
  return (precise.length ? precise : out).slice(0, 4);
}

ArtFinder.prototype.genres = async function genres(game) {
  // Jeux Steam : genres de la boutique Steam.
  if (game.source === 'steam' && game.appid) {
    try {
      const d = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&filters=genres&l=english`);
      const g = d && d[game.appid] && d[game.appid].data && d[game.appid].data.genres;
      if (g && g.length) {
        const m = mapGenres(g.map((x) => x.description).filter((x) => !/indie|free to play|casual|early access/i.test(x)));
        if (m.length) return m;
      }
    } catch {}
  }
  // Tous les autres (et Steam en secours) : Wikidata, via la page Wikipédia du jeu.
  const name = game.name.replace(/\s*\([^)]*\)\s*$/, '');
  const hint = { switch: 'Nintendo Switch', switch2: 'Nintendo Switch 2', '3ds': 'Nintendo 3DS', ds: 'Nintendo DS' }[game.platform] || '';
  for (const q of [`${name} ${hint} video game`, `${name} video game`]) {
    let d;
    try {
      d = await fetchJson('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search'
        + `&gsrsearch=${encodeURIComponent(q.trim())}&gsrlimit=4&prop=pageprops&ppprop=wikibase_item`);
    } catch { continue; }
    const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index);
    const page = pages.find((p) => strictSimilarity(name, p.title.replace(/\s*\([^)]*\)\s*$/, '')) >= 0.9 && p.pageprops && p.pageprops.wikibase_item);
    if (!page) continue;
    try {
      const qid = page.pageprops.wikibase_item;
      const ent = await fetchJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=claims&ids=${qid}`);
      const claims = (ent.entities[qid].claims || {}).P136 || [];
      const ids = claims.map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value.id).filter(Boolean).slice(0, 12);
      if (!ids.length) return [];
      const lab = await fetchJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=labels&languages=en&ids=${ids.join('|')}`);
      return mapGenres(ids.map((id) => lab.entities[id] && lab.entities[id].labels.en && lab.entities[id].labels.en.value).filter(Boolean));
    } catch { return []; }
  }
  return [];
};

module.exports = { ArtFinder, fileUrl, mapGenres };
