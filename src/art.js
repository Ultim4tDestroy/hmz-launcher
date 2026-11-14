// Recherche des jaquettes, fonds et logos.
// Ordre : fichiers locaux de Steam → SteamGridDB (si clé) → libretro (DS/3DS)
// → boutique Steam (jeux PC) → Wikipédia.
const fs = require('fs');
const path = require('path');
const { fetchJson, urlExists, normTitle, similarity, strictSimilarity, readText, exists } = require('./util');

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
      try { set('cover', await this.wikipedia(game)); } catch {}
    }
    return art;
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
        return src;
      }
    }
    return null;
  }
}

module.exports = { ArtFinder, fileUrl };
