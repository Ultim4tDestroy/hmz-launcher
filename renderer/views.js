// HMZ · Pages : accueil, bibliothèque, émulateurs, statistiques, paramètres.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// Accueil ------------------------------------------------------------------------------------
function heroHTML(g) {
  const h = heroInfo(g);
  const title = g.name;
  const meta = metaParts(g).map((x) => `<span class="mi">${esc(x)}</span>`).join('');
  return `<section class="hero">
      ${h ? `<div class="hero-bg${h.blur ? ' blur' : ''}" style="background-image:url('${esc(h.url)}')"></div>` : `<div class="hero-bg" style="background:radial-gradient(80% 90% at 70% 30%, ${plat(g.platform).color}55, transparent 70%)"></div>`}
      <div class="hero-shade"></div>
      ${h && h.cover ? `<div class="hero-cover"><img src="${esc(h.cover)}" draggable="false"></div>` : ''}
      <div class="hero-content">
        <div class="kicker${g.running ? ' live' : ''}"><i class="dot"></i>${g.running ? 'En cours' : (g.emuReady ? 'Prêt à jouer' : 'Émulateur à installer')}</div>
        ${g.art.logo ? `<img class="hero-logo" src="${esc(g.art.logo)}" alt="${esc(title)}" data-title="${esc(title)}">` : `<h1 class="hero-title${title.length > 22 ? ' long' : ''}">${esc(title)}</h1>`}
        <div class="hero-meta">${meta}</div>
        <div class="hero-actions">
          <button class="btn primary play" data-play="${esc(g.id)}">${playIcon(g)}${playLabel(g)}</button>
          <button class="btn round" data-detail="${esc(g.id)}" title="Voir la fiche">${ICON.info}</button>
          <button class="btn round" data-menu="${esc(g.id)}" title="Plus d'options">${ICON.dots}</button>
        </div>
      </div>
    </section>`;
}
function renderHero() {
  const el = $('.hero');
  const g = featured();
  if (!el || !g) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = heroHTML(g);
  el.replaceWith(tmp.firstElementChild);
  setAmbientFor(g);
  $$('.slot.selected').forEach((x) => x.classList.remove('selected'));
  $$(`.slot[data-game="${CSS.escape(g.id)}"]`).forEach((x) => x.classList.add('selected'));
}

function renderHome() {
  const list = visible();
  if (!list.length) return renderWelcome();
  const g = featured();
  const recent = list.filter((x) => x.last).sort(byRecent).slice(0, 14);
  const shelves = [];
  shelves.push({ title: recent.length ? 'Reprendre' : 'Ta collection', games: recent.length ? recent : [...list].sort(byRecent).slice(0, 14) });
  const favs = list.filter((x) => x.favorite).sort(byRecent);
  if (favs.length) shelves.push({ title: 'Favoris', games: favs.slice(0, 14), more: favs.length > 14 ? 'fav' : null });
  for (const c of S.collections || []) {
    const gs = c.games.map(gameById).filter((x) => x && (ui.showHidden || !x.hidden));
    if (gs.length) shelves.push({ title: c.name, color: c.color, games: gs.slice(0, 14), more: 'c:' + c.id });
  }
  for (const p of ORDER) {
    const gs = list.filter((x) => x.platform === p).sort(byRecent);
    if (gs.length) shelves.push({ title: plat(p).label, color: plat(p).color, games: gs.slice(0, 14), more: p });
  }
  return `<div class="home">
    ${heroHTML(g)}
    <div class="rows">${shelves.map((sh) => shelfHTML({ ...sh, selectedId: g.id })).join('')}</div>
  </div>`;
}

function renderWelcome() {
  const folders = ['switch2', 'switch', '3ds', 'ds'];
  return `<div class="welcome page">
    <div class="kicker"><i class="dot"></i>Bienvenue</div>
    <h1>Tous tes jeux,<br>au même endroit.</h1>
    <p>HMZ trouve tout seul tes jeux Steam et Epic, et lance tes jeux DS, 3DS, Switch et Switch 2 dans le bon émulateur. Trois étapes et c'est prêt.</p>
    <div class="steps">
      <div class="step"><span class="n">1</span><h3>Installe les émulateurs</h3><p>Un clic par console. Ils viennent de leurs pages officielles et se mettent à jour depuis HMZ.</p><div><button class="btn primary sm" data-go="emulators">Ouvrir les émulateurs</button></div></div>
      <div class="step"><span class="n">2</span><h3>Range tes jeux</h3><p>Dépose les fichiers de tes jeux dans le dossier de leur console. HMZ les repère tout seul.</p>
        <div class="folders">${folders.map((p) => `<button class="btn sm" data-opendir="${p}">${ICON.folder}${esc(plat(p).label)}</button>`).join('')}</div></div>
      <div class="step"><span class="n">3</span><h3>Joue</h3><p>Choisis un jeu et appuie sur Jouer. Branche une manette et passe en mode TV pour jouer depuis le canapé.</p><div><button class="btn sm" data-action="rescan">${ICON.refresh}Rechercher mes jeux</button></div></div>
    </div>
  </div>`;
}

// Bibliothèque ---------------------------------------------------------------------------------
const SOURCES = { steam: 'Steam', epic: 'Epic Games', gog: 'GOG', ubisoft: 'Ubisoft Connect', battlenet: 'Battle.net', xbox: 'Xbox', ea: 'EA', riot: 'Riot Games', netmarble: 'Netmarble', bluestacks: 'BlueStacks', launcher: 'Autres launchers', installed: 'Jeux installés', manual: 'Ajoutés à la main', rom: 'Émulés' };
const SOURCE_COLORS = { steam: '#66c0f4', epic: '#d6d6d6', gog: '#b46cff', ubisoft: '#2f8cff', battlenet: '#148eff', xbox: '#3fbf4a', ea: '#ff4747', riot: '#ff4655', netmarble: '#ffc93c', bluestacks: '#3ddc84', launcher: '#c084fc', installed: '#f6c344', manual: '#7fd1b9', rom: '#ff7a59' };

function collFilter(c) {
  const now = Date.now();
  switch (c.type) {
    case 'fav': return (g) => g.favorite;
    case 'recent': return (g) => g.last && now - g.last < 30 * 864e5;
    case 'never': return (g) => !g.minutes && !g.last;
    case 'owned': return () => true;
    case 'platform': return (g) => g.platform === c.key;
    case 'source': return (g) => g.source === c.key;
    case 'genre': return (g) => (g.genres || []).includes(c.key);
    case 'user': { const col = S.collections.find((x) => x.id === c.key); const set = new Set(col ? col.games : []); return (g) => set.has(g.id); }
    default: return () => true;
  }
}
function collInfo(c) {
  switch (c.type) {
    case 'fav': return { label: 'Favoris', icon: ICON.star, color: '#f6c344' };
    case 'recent': return { label: 'Joués ces 30 jours', icon: ICON.clock, color: '#7aa2ff' };
    case 'never': return { label: 'Jamais joués', icon: ICON.sparkle, color: '#5ef0c6' };
    case 'owned': return { label: 'À installer', icon: ICON.download, color: '#9aa4b2' };
    case 'platform': return { label: plat(c.key).label, icon: ICON.pad, color: plat(c.key).color };
    case 'source': return { label: SOURCES[c.key] || c.key, icon: ICON.layers, color: SOURCE_COLORS[c.key] };
    case 'genre': return { label: c.key, icon: ICON.tagic, color: '#c084fc' };
    case 'user': { const col = S.collections.find((x) => x.id === c.key); return { label: col ? col.name : 'Collection', icon: ICON.folder, color: col ? col.color : '#888' }; }
    default: return { label: 'Tous les jeux', icon: ICON.grid, color: 'var(--cream)' };
  }
}
const sameColl = (a, b) => a.type === b.type && (a.key || '') === (b.key || '');

function collItem(c, n, extra = '') {
  const info = collInfo(c);
  const on = sameColl(ui.coll, c);
  const mark = c.type === 'user' ? `<i class="cdot" style="background:${info.color}"></i>` : `<span class="cico">${info.icon}</span>`;
  return `<button class="citem${on ? ' on' : ''}" data-coll="${esc(JSON.stringify(c))}"${c.type === 'user' ? ` data-collid="${esc(c.key)}"` : ''}>
    ${mark}<span class="nm">${esc(info.label)}</span>${extra}<span class="n">${n}</span></button>`;
}
function collPill(c, n) {
  const info = collInfo(c);
  const on = sameColl(ui.coll, c);
  const dot = c.type === 'genre' ? '' : `<i class="pdot2" style="background:${info.color}"></i>`;
  return `<button class="cpill${on ? ' on' : ''}" data-coll="${esc(JSON.stringify(c))}">${dot}${esc(info.label)}<span class="n">${n}</span></button>`;
}
function collSection(key, title, body, addBtn = '') {
  return `<section class="csec"><div class="csec-h"><span>${esc(title)}</span>${addBtn}</div>${body}</section>`;
}

function renderCollPanel(all) {
  const count = (c) => all.filter(collFilter(c)).length;
  const nOwned = owned().length;
  const quick = [{ type: 'all' }, { type: 'fav' }, { type: 'recent' }, { type: 'never' }].map((c) => { const n = ui.coll.type === 'owned' ? visible().filter(collFilter(c)).length : count(c); return c.type === 'all' || n ? collItem(c, n) : ''; }).join('') + (nOwned ? collItem({ type: 'owned' }, nOwned) : '');
  const plats = ORDER.map((p) => ({ type: 'platform', key: p })).map((c) => { const n = count(c); return n ? collPill(c, n) : ''; }).join('');
  const srcs = Object.keys(SOURCES).map((k) => ({ type: 'source', key: k })).map((c) => { const n = count(c); return n ? collPill(c, n) : ''; }).join('');
  const gcount = {};
  for (const g of all) for (const x of g.genres || []) gcount[x] = (gcount[x] || 0) + 1;
  const glist = Object.entries(gcount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  const gshown = ui.allGenres ? glist : glist.slice(0, 10);
  const genres = gshown.map(([k, n]) => collPill({ type: 'genre', key: k }, n)).join('')
    + (glist.length > 10 ? `<button class="cpill more" data-action="toggle-genres">${ui.allGenres ? 'Moins' : `+${glist.length - 10}`}</button>` : '');
  const user = S.collections.map((col) => {
    const games = col.games.map(gameById).filter(Boolean);
    const open = ui.openColl[col.id];
    return collItem({ type: 'user', key: col.id }, games.length, games.length ? `<span class="chev-b" data-collopen="${esc(col.id)}" style="transform:rotate(${open ? 0 : -90}deg)">${ICON.chev}</span>` : '')
      + (open && games.length ? `<div class="coll-games">${games.map((g) => `<button class="coll-game" data-detail="${esc(g.id)}" data-game-ctx="${esc(g.id)}"><span class="mini">${coverHTML(g)}</span><span>${esc(g.name)}</span></button>`).join('')}</div>` : '');
  }).join('');
  const newRow = ui.newColl ? `<div class="coll-new"><input id="newCollName" placeholder="Nom de la collection" maxlength="60"></div>` : '';
  return `<aside class="coll-panel">
    <div class="coll-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="libSearch" placeholder="Filtrer" value="${esc(ui.q)}"></div>
    <nav class="clist">${quick}</nav>
    ${collSection('user', 'Mes collections', `<div class="clist">${user || (ui.newColl ? '' : '<p class="chint">Crée une collection, puis glisse des jeux dessus.</p>')}${newRow}</div>`, `<button class="cadd" data-action="new-coll" title="Nouvelle collection">${ICON.plus}</button>`)}
    ${plats ? collSection('plats', 'Consoles', `<div class="pills">${plats}</div>`) : ''}
    ${srcs ? collSection('srcs', 'Launchers', `<div class="pills">${srcs}</div>`) : ''}
  </aside>`;
}

function listRowHTML(g) {
  return `<div class="lrow" data-game="${esc(g.id)}" draggable="true" role="button" tabindex="0" style="--c:${plat(g.platform).color}">
    <span class="mini">${coverHTML(g)}</span>
    <div style="min-width:0"><div class="nm">${esc(g.name)}${g.running ? ' <span class="kicker live" style="display:inline-flex;font-size:10px;margin-left:8px"><i class="dot"></i>En cours</span>' : ''}</div><div class="sub">${esc([sourceLabel(g), ...(g.genres || []).slice(0, 3)].join(' · '))}</div></div>
    <span class="cell"><span class="tag" style="--c:${plat(g.platform).color}">${esc(plat(g.platform).label)}</span></span>
    <span class="cell">${g.last ? esc(fmtLast(g.last)) : '—'}</span>
    <span class="cell">${g.minutes >= 1 ? fmtTime(g.minutes) : '—'}</span>
    <button class="play-ic" data-play="${esc(g.id)}" title="${playLabel(g)}">${playIcon(g)}</button>
  </div>`;
}

function renderLibrary() {
  const all = ui.coll.type === 'owned' ? owned() : visible();
  let list = all.filter(collFilter(ui.coll));
  const inColl = list;
  if (ui.genre) list = list.filter((g) => (g.genres || []).includes(ui.genre));
  if (ui.q) { const q = ui.q.toLowerCase(); list = list.filter((g) => g.name.toLowerCase().includes(q)); }
  const sorts = {
    recent: byRecent,
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    time: (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'fr'),
    added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
    // Date de sortie (les jeux sans date à la fin) et note.
    released: (a, b) => (b.released || '').localeCompare(a.released || '') || a.name.localeCompare(b.name, 'fr'),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0) || byRecent(a, b),
    status: (a, b) => STATUS_ORDER.indexOf(a.status || '') - STATUS_ORDER.indexOf(b.status || '') || byRecent(a, b),
  };
  list.sort(sorts[ui.sort]);
  const info = collInfo(ui.coll);
  const view = S.settings.libView || 'shelf';
  const isUser = ui.coll.type === 'user';
  const emptyMsg = isUser ? 'Glisse des jeux sur cette collection dans le panneau de gauche, ou fais un clic droit sur un jeu › Ajouter à une collection.'
    : ui.coll.type === 'platform' && ui.coll.key !== 'pc' ? `Dépose tes jeux ${esc(plat(ui.coll.key).label)} dans leur dossier, puis relance la recherche.` : 'Essaie une autre collection ou une autre recherche.';
  return `<div class="lib">
    ${renderCollPanel(all)}
    <div class="lib-main"><div class="page">
      <div class="page-head">
        <div class="lib-head"><span class="big-ic" style="--c:${info.color}">${info.icon}</span><div><h1>${esc(info.label)}</h1><p style="margin-top:4px">${list.length} jeu${list.length > 1 ? 'x' : ''}${ui.genre ? `, genre ${esc(ui.genre)}` : ''}${ui.q ? ` pour « ${esc(ui.q)} »` : ''}</p></div></div>
        <div style="display:flex;gap:8px;align-items:center">
          ${isUser ? `<button class="btn ghost sm" data-collmenu="${esc(ui.coll.key)}">${ICON.dots}</button>` : ''}
          <button class="btn primary" data-action="add-game">${ICON.plus}Ajouter un jeu</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="viewsw"><button class="${view === 'shelf' ? 'on' : ''}" data-libview="shelf" title="Étagère">${ICON.shelf}</button><button class="${view === 'grid' ? 'on' : ''}" data-libview="grid" title="Grille">${ICON.grid}</button><button class="${view === 'list' ? 'on' : ''}" data-libview="list" title="Liste">${ICON.list}</button></div>
        ${view !== 'list' ? `<input type="range" class="range" id="cardSize" min="120" max="260" step="4" value="${S.settings.cardSize || 168}" title="Taille des jaquettes" style="width:150px">` : ''}
        <div class="gsel">
          <button class="btn sm ${ui.genre ? 'on-acc' : 'ghost'}" data-action="genre-menu">${ICON.tagic}${ui.genre ? esc(ui.genre) : 'Tous les genres'}${ICON.chev}</button>
          ${ui.genre ? `<button class="icon-btn" data-action="genre-clear" title="Retirer le filtre">${ICON.x}</button>` : ''}
          ${ui.genreOpen ? (() => { const gc = {}; for (const g of inColl) for (const x of g.genres || []) gc[x] = (gc[x] || 0) + 1; const gl = Object.entries(gc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')); return `<div class="genre-pop">${gl.length ? gl.map(([k, n]) => `<button class="cpill${ui.genre === k ? ' on' : ''}" data-genre-pick="${esc(k)}">${esc(k)}<span class="n">${n}</span></button>`).join('') : '<p class="chint">Les genres apparaissent au fur et à mesure que HMZ les trouve.</p>'}</div>`; })() : ''}
        </div>
        <div class="grow"></div>
        <select class="select" id="libSort">
          ${[['recent', 'Joués récemment'], ['name', 'Nom'], ['time', 'Temps de jeu'], ['added', 'Ajoutés récemment'], ['released', 'Date de sortie'], ['rating', 'Ma note'], ['status', 'Progression']].map(([k, l]) => `<option value="${k}"${ui.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      ${!list.length ? `<div class="empty"><h3>Aucun jeu ici</h3><p>${emptyMsg}</p>${ui.coll.type === 'platform' && ui.coll.key !== 'pc' ? `<button class="btn" data-opendir="${ui.coll.key}">${ICON.folder}Ouvrir le dossier</button>` : ''}</div>`
        : view === 'shelf' ? libShelvesHTML(list)
        : view === 'list' ? `<div class="list"><div class="list-head"><span></span><span>Jeu</span><span>Console</span><span>Dernière partie</span><span>Temps</span><span></span></div>${list.map(listRowHTML).join('')}</div>`
        : `<div class="grid">${list.map((g) => cardHTML(g)).join('')}${ui.coll.type === 'all' && !ui.q ? addCardHTML() : ''}</div>`}
    </div></div>
  </div>`;
}

// Émulateurs ---------------------------------------------------------------------------------
function emuFamily(e) { return (S.platforms[e.platforms[0]] || {}).family || 'nintendo'; }
function emuMatches(e) {
  const f = ui.emu;
  if (f.fam !== 'all' && !e.platforms.some((p) => (S.platforms[p] || {}).family === f.fam)) return false;
  if (f.st === 'installed' && !e.installed) return false;
  if (f.st === 'available' && e.installed) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [e.name, e.blurb, ...e.platforms.map((p) => plat(p).label)].join(' ').toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
function emuSorted(list) {
  const rank = (e) => Math.min(...e.platforms.map((p) => { const i = ORDER.indexOf(p); return i < 0 ? 99 : i; }));
  const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
  if (ui.emu.sort === 'name') return [...list].sort(byName);
  if (ui.emu.sort === 'installed') return [...list].sort((a, b) => (b.installed - a.installed) || rank(a) - rank(b) || byName(a, b));
  return [...list].sort((a, b) => rank(a) - rank(b) || (b.isDefault - a.isDefault) || byName(a, b));
}
function emuResultsHTML() {
  const list = emuSorted(S.emulators.filter(emuMatches));
  if (!list.length) return `<div class="empty"><h3>Aucun émulateur</h3><p>Rien ne correspond${ui.emu.q ? ` à « ${esc(ui.emu.q)} »` : ''}. Essaie un autre filtre.</p><button class="btn" data-emureset="1">Tout afficher</button></div>`;
  if (ui.emu.sort !== 'console' || ui.emu.fam !== 'all') return `<div class="emu-grid">${list.map(emuCard).join('')}</div>`;
  const groups = [];
  for (const e of list) {
    const f = emuFamily(e);
    let g = groups.find((x) => x.f === f);
    if (!g) groups.push((g = { f, items: [] }));
    g.items.push(e);
  }
  return groups.map((g) => `<section class="emu-group"><h2 class="emu-gtitle">${esc(FAMILY[g.f] || g.f)}<span>${g.items.length}</span></h2><div class="emu-grid">${g.items.map(emuCard).join('')}</div></section>`).join('');
}
function renderEmulators() {
  const s = S.settings;
  const nInst = S.emulators.filter((e) => e.installed).length;
  const f = ui.emu;
  const chip = (k, l) => `<button class="${f.fam === k ? 'on' : ''}" data-emufam="${k}">${l}</button>`;
  const st = (k, l) => `<button class="${f.st === k ? 'on' : ''}" data-emust="${k}">${l}</button>`;
  const dirPlats = ORDER.filter((p) => s.romDirs[p] && S.platforms[p]);
  return `<div class="page emu-page">
    <div class="page-head"><div><h1>Émulateurs</h1><p>${S.emulators.length} émulateurs, ${nInst} installé${nInst > 1 ? 's' : ''}. Chacun vient de sa page officielle et s'installe dans <span class="linkish" data-action="open-root">${esc(s.root)}\\Emulateurs</span>.</p></div>
      <button class="btn ghost" data-action="check-updates">${ICON.refresh}Vérifier les mises à jour</button></div>
    <div class="note">${ICON.warn}<div><b>Les jeux, BIOS, clés et firmware ne sont pas fournis.</b> Ils doivent venir de ta propre console et de tes propres jeux. Ne télécharge jamais un émulateur ailleurs que sur sa page officielle : de faux sites distribuent des virus.</div></div>
    <div class="emu-bar">
      <label class="emu-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="emuQ" type="search" placeholder="Chercher un émulateur ou une console" value="${esc(f.q)}" autocomplete="off" spellcheck="false"></label>
      <div class="seg emu-fam">${chip('all', 'Toutes')}${Object.entries(FAMILY).map(([k, l]) => chip(k, l)).join('')}</div>
      <div class="seg emu-st">${st('all', 'Tous')}${st('installed', 'Installés')}${st('available', 'À installer')}</div>
      <select class="select" id="emuSort">${[['console', 'Par console'], ['name', 'Par nom'], ['installed', 'Installés d\'abord']].map(([k, l]) => `<option value="${k}"${f.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="emu-results">${emuResultsHTML()}</div>
    <h2 class="section-title">Jeux mobiles</h2>
    <p class="section-sub">Tes jeux installés dans BlueStacks, rangés dans la catégorie Mobile et lancés directement dans BlueStacks.</p>
    <div class="frow" style="grid-template-columns:120px 1fr auto"><div><span class="tag" style="--c:#3ddc84">BlueStacks</span></div>
      <div class="paths"><div class="path" style="font-family:var(--ui)">HMZ cherche les jeux installés dans BlueStacks et retrouve leur nom sur Google Play.</div></div>
      <div class="acts"><button class="btn sm primary" data-action="bluestacks-add">${ICON.plus}Ajouter mes jeux BlueStacks</button></div></div>
    <h2 class="section-title">Dossiers de jeux</h2>
    <p class="section-sub">Dépose tes jeux dans ces dossiers ; HMZ cherche aussi dans les sous-dossiers. Le dossier d'une console apparaît quand un de ses émulateurs est installé.</p>
    <div class="folders-table">
      ${dirPlats.map((p) => { const P = S.platforms[p]; const ext = P.eboot ? `dossiers de jeux (EBOOT.BIN)${P.ext.length ? ', ' + P.ext.join(' ') : ''}` : P.ext.join(' '); return `<div class="frow">
        <div><span class="tag" style="--c:${plat(p).color}">${esc(plat(p).label)}</span><div class="ext" style="margin-top:6px">${esc(ext)}</div></div>
        <div class="paths">${(s.romDirs[p] || []).map((d, i) => `<div class="path"><span title="${esc(d)}">${esc(d)}</span>${i > 0 ? `<button data-rmdir="${p}" data-dir="${esc(d)}">retirer</button>` : ''}</div>`).join('') || '<div class="path">Aucun dossier</div>'}</div>
        <div class="acts"><button class="btn sm" data-opendir="${p}">${ICON.folder}Ouvrir</button><button class="btn sm ghost" data-adddir="${p}">${ICON.plus}Autre dossier</button></div>
      </div>`; }).join('')}
    </div>
  </div>`;
}

function emuCard(e) {
  const prog = emuProg[e.id];
  const color = plat(e.platforms[0]).color;
  const hasUpdate = e.installed && !e.custom && e.latest && e.version && e.latest !== e.version;
  const status = e.installed ? (hasUpdate ? `<span class="status upd">Mise à jour : ${esc(e.latest)}</span>` : `<span class="status ok">Installé${e.version && e.version !== 'perso' ? ' · ' + esc(e.version) : ''}</span>`) : '';
  const shared = e.isDefault && S.emulators.some((o) => o.id !== e.id && o.platforms.some((p) => e.platforms.includes(p)));
  let body;
  if (prog && prog.step) {
    const pct = prog.total ? Math.min(100, Math.round((prog.done / prog.total) * 100)) : null;
    body = `<div class="progress"><span>${esc(prog.step)}${pct !== null ? ` · ${pct} %` : ''}${prog.total ? ` · ${fmtSize(prog.done)} / ${fmtSize(prog.total)}` : ''}</span>
      <div class="bar${pct === null ? ' indet' : ''}"><i style="width:${pct ?? 35}%"></i></div></div>`;
  } else if (!e.installed) {
    body = `${emuErr[e.id] ? `<div class="emu-err">${ICON.warn}<div><b>Le téléchargement automatique a échoué.</b> ${esc(emuErr[e.id])}<br>Télécharge la version Windows (.zip ou .7z) depuis la <span class="linkish" data-url="${esc(e.page)}">page officielle</span>, puis clique sur « Installer depuis une archive ».</div></div>` : ''}
      <div class="emu-actions"><button class="btn primary" data-install="${e.id}">${ICON.download}${emuErr[e.id] ? 'Réessayer' : 'Installer'}</button>
      <button class="btn${emuErr[e.id] ? ' primary' : ' ghost'}" data-installzip="${e.id}">Depuis une archive</button>
      <button class="btn ghost" data-locate="${e.id}">Je l'ai déjà</button></div>`;
  } else {
    body = `<div class="emu-actions">
      ${hasUpdate ? `<button class="btn primary" data-install="${e.id}">${ICON.download}Mettre à jour</button>` : ''}
      <button class="btn" data-emuopen="${e.id}">${ICON.ext}Ouvrir</button>
      <button class="btn ghost" data-emudir="${e.id}">${ICON.folder}Dossier</button>
      ${e.tuned ? `<button class="btn ghost" data-emucfg="${e.id}" title="Applique des graphismes adaptés à ton PC">${ICON.refresh}Réglages conseillés</button><button class="btn ghost" data-emupad="${e.id}">${ICON.pad}Manette</button>` : ''}
    </div>`;
  }
  const sys = e.needsKeys && e.installed ? `<div class="sys">
      <div class="sys-item"><span class="lbl"><span class="check${e.keys && e.keys.keys ? ' on' : ''}">${e.keys && e.keys.keys ? ICON.check : ''}</span>Clés</span><button class="btn sm" data-keys="${e.id}">${ICON.key}${e.keys && e.keys.keys ? 'Remplacer' : 'Ajouter prod.keys'}</button></div>
      <div class="sys-item"><span class="lbl"><span class="check${e.keys && e.keys.firmware ? ' on' : ''}">${e.keys && e.keys.firmware ? ICON.check : ''}</span>Firmware</span><button class="btn sm" data-fw="${e.id}">${ICON.chip}${e.keys && e.keys.firmware ? 'Remplacer' : 'Installer'}</button></div>
    </div>` : '';
  return `<article class="emu${e.installed ? ' is-inst' : ''}" data-emu="${e.id}" style="--c:${color}">
    <div class="emu-top"><div><h3>${esc(e.name)}</h3><div class="tags">${e.platforms.map((p) => `<span class="tag" style="--c:${plat(p).color}">${esc(plat(p).label)}</span>`).join('')}${e.experimental ? '<span class="tag" style="--c:#f6c344">Expérimental</span>' : ''}${shared ? '<span class="tag" style="--c:var(--cream)">Conseillé</span>' : ''}</div></div>${status}</div>
    <p>${esc(e.blurb)}</p>
    ${e.needs ? `<div class="emu-need">${ICON.info}<span>${esc(e.needs)}</span></div>` : ''}
    ${body}
    ${sys}
    <div class="links"><button data-url="${esc(e.page)}">Page officielle ↗</button>${e.installed ? `<button data-installzip="${e.id}">Depuis une archive</button><button data-locate="${e.id}">Autre .exe</button><span class="grow"></span><button class="danger" data-emudel="${e.id}">${e.custom ? 'Oublier' : 'Supprimer'}</button>` : ''}</div>
  </article>`;
}

// Statistiques -----------------------------------------------------------------------------
function renderStats() {
  const now = Date.now(), today = dayStart(now);
  const perDay = new Map();
  const addRange = (s, e, g) => {
    let t = s;
    while (t < e) {
      const d = dayStart(t), next = Math.min(e, d + 864e5);
      const o = perDay.get(d) || { total: 0, games: {} };
      o.total += (next - t) / 60000;
      o.games[g] = (o.games[g] || 0) + (next - t) / 60000;
      perDay.set(d, o);
      t = next;
    }
  };
  for (const s of S.sessions) addRange(s.s, s.e, s.g);
  const sumDays = (n) => { let m = 0; for (let i = 0; i < n; i++) m += (perDay.get(today - i * 864e5) || { total: 0 }).total; return m; };
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = perDay.get(today - i * 864e5);
    if (d && d.total >= 1) streak++;
    else if (i === 0) continue;
    else break;
  }
  const days = [...Array(30)].map((_, i) => today - (29 - i) * 864e5);
  const max = Math.max(30, ...days.map((d) => (perDay.get(d) || { total: 0 }).total));
  const month = {};
  for (const d of days) for (const [g, m] of Object.entries((perDay.get(d) || { games: {} }).games)) month[g] = (month[g] || 0) + m;
  const top = Object.entries(month).map(([id, m]) => ({ g: gameById(id), m })).filter((x) => x.g).sort((a, b) => b.m - a.m).slice(0, 6);
  const allTop = [...S.games].filter((g) => g.minutes > 0).sort((a, b) => b.minutes - a.minutes).slice(0, 6);
  const show = top.length ? top : allTop.map((g) => ({ g, m: g.minutes }));
  const topMax = Math.max(1, ...show.map((x) => x.m));
  const byPlat = ORDER.map((p) => ({ p, m: S.games.filter((g) => g.platform === p).reduce((a, g) => a + g.minutes, 0) })).filter((x) => x.m > 0);
  const platMax = Math.max(1, ...byPlat.map((x) => x.m));
  const dLabel = (t) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4)}.`; };
  return `<div class="page">
    <div class="page-head"><div><h1>Statistiques</h1><p>Le temps est compté tout seul quand un jeu tourne, même lancé depuis Steam ou Epic, tant que HMZ est ouvert.</p></div></div>
    <div class="tiles">
      <div class="tile"><div class="k">Aujourd'hui</div><div class="v">${fmtHours(sumDays(1))}<small>h</small></div></div>
      <div class="tile"><div class="k">7 derniers jours</div><div class="v">${fmtHours(sumDays(7))}<small>h</small></div></div>
      <div class="tile"><div class="k">30 derniers jours</div><div class="v">${fmtHours(sumDays(30))}<small>h</small></div></div>
      <div class="tile"><div class="k">Série en cours</div><div class="v">${streak}<small>jour${streak > 1 ? 's' : ''}</small></div></div>
    </div>
    <div class="two">
      <div class="panel"><h3>30 derniers jours <span>temps de jeu par jour</span></h3>
        <div class="chart">${days.map((d) => { const m = (perDay.get(d) || { total: 0 }).total; return `<div class="b${m < 1 ? ' zero' : ''}"><i style="height:${Math.max(1.5, (m / max) * 100)}%"></i><span class="tip">${dLabel(d)} · ${fmtTime(m)}</span></div>`; }).join('')}</div>
        <div class="chart-x"><span>${dLabel(days[0])}</span><span>${dLabel(days[15])}</span><span>Aujourd'hui</span></div>
      </div>
      <div class="panel"><h3>${top.length ? 'Top du mois' : 'Les plus joués'} <span>${top.length ? '30 jours' : 'depuis toujours'}</span></h3>
        ${show.length ? `<div class="top-list">${show.map((x) => `<div class="top-item" style="--c:${plat(x.g.platform).color}"><div class="mini">${coverHTML(x.g)}</div><div style="min-width:0"><div class="nm">${esc(x.g.name)}</div><div class="tbar"><i style="width:${(x.m / topMax) * 100}%"></i></div></div><span class="tm">${fmtTime(x.m)}</span></div>`).join('')}</div>` : '<p style="color:var(--muted);margin:0">Lance un jeu et tes stats apparaîtront ici.</p>'}
      </div>
    </div>
    ${byPlat.length ? `<div class="panel" style="margin-top:14px"><h3>Par console <span>depuis toujours</span></h3><div class="top-list">${byPlat.map((x) => `<div class="top-item" style="--c:${plat(x.p).color};grid-template-columns:90px 1fr auto"><span class="tag" style="--c:${plat(x.p).color}">${esc(plat(x.p).label)}</span><div class="tbar" style="margin:0"><i style="width:${(x.m / platMax) * 100}%"></i></div><span class="tm">${fmtTime(x.m)}</span></div>`).join('')}</div></div>` : ''}
  </div>`;
}

// Paramètres ---------------------------------------------------------------------------------
// Regroupe les réglages en sections avec un sommaire à gauche.
function groupSettings(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const list = tpl.content.querySelector('.settings');
  if (!list) return html;
  const sections = [];
  let cur = null;
  for (const el of [...list.children]) {
    if (el.classList.contains('set-group')) { cur = { title: el.textContent.trim(), rows: [] }; sections.push(cur); }
    else if (cur) cur.rows.push(el.outerHTML);
  }
  const id = (t) => 's-' + t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');
  const nav = `<nav class="snav">${sections.map((x) => `<button data-snav="${id(x.title)}">${esc(x.title)}</button>`).join('')}</nav>`;
  const body = `<div class="sbody">${sections.map((x) => `<section class="sgrp" id="${id(x.title)}"><h3>${esc(x.title)}</h3><div class="scard">${x.rows.join('')}</div></section>`).join('')}</div>`;
  list.outerHTML;
  const wrap = document.createElement('div');
  wrap.className = 'swrap';
  wrap.innerHTML = nav + body;
  list.replaceWith(wrap);
  const out = document.createElement('div');
  out.appendChild(tpl.content.cloneNode(true));
  return out.innerHTML;
}

function renderSettings() {
  // Liste des écrans pour le mode TV (chargée une fois).
  if (!ui.displays) { ui.displays = []; api.call('displays:list').then((d) => { ui.displays = d || []; if (ui.view === 'settings') render(); }).catch(() => {}); }
  return groupSettings(renderSettingsRaw());
}

function renderSettingsRaw() {
  const s = S.settings;
  const tg = (k) => `<button class="toggle${s[k] ? ' on' : ''}" data-toggle="${k}" aria-pressed="${!!s[k]}"></button>`;
  return `<div class="page">
    <div class="page-head"><div><h1>Paramètres</h1><p>HMZ Launcher ${esc(S.version)}</p></div></div>
    <div class="settings">
      <div class="set-group">Apparence</div>
      <div class="set" style="display:block"><div class="t" style="margin-bottom:12px">Thème</div>${themeCards()}</div>
      <div class="set"><div><div class="t">Couleur d'accent</div><div class="d">Boutons, sélection et graphiques. Le multicolore reprend la couleur du thème.</div></div>${accentSwatches()}</div>
      <div class="set"><div><div class="t">Taille des jaquettes</div><div class="d">Dans la bibliothèque. Aussi réglable directement depuis la bibliothèque.</div></div><input type="range" class="range" id="cardSize" min="120" max="260" step="4" value="${S.settings.cardSize || 168}"></div>
      <div class="set-group">Version</div>
      <div class="set"><div><div class="t">HMZ Launcher ${esc(S.version)}${S.codeSource === 'mise à jour' ? ' · mise à jour locale' : ''}</div>
        <div class="d">HMZ se met à jour tout seul : il vérifie au démarrage puis toutes les 2 heures, et installe la nouvelle version quand tu le fermes.</div></div>
        <div style="display:flex;gap:8px">${S.updateReady ? `<button class="btn primary" data-action="restart">Installer la ${esc(S.updateReady)}</button>` : '<button class="btn" data-action="check-app-update">Rechercher</button>'}${S.codeSource === 'mise à jour' ? '<button class="btn ghost" data-action="rollback">Version installée</button>' : ''}</div></div>
      <div class="set-group">Dossiers</div>
      <div class="set"><div><div class="t">Dossier principal</div><div class="d">Émulateurs et dossiers de jeux : <span class="linkish" data-action="open-root">${esc(s.root)}</span></div></div><button class="btn" data-action="choose-root">Changer</button></div>
      <div class="set"><div><div class="t">Bibliothèque</div><div class="d">Recherche à nouveau tous tes jeux (Steam, Epic et dossiers de consoles).</div></div><button class="btn" data-action="rescan">${ICON.refresh}Rechercher</button></div>
      <div class="set-group">Jeux PC</div>
      <div class="set"><div><div class="t">Jeux Steam</div><div class="d">Ajoute tes jeux Steam installés et reprend ton temps de jeu Steam.</div></div>${tg('scanSteam')}</div>
      <div class="set"><div><div class="t">Jeux Epic Games</div><div class="d">Ajoute tes jeux Epic installés.</div></div>${tg('scanEpic')}</div>
      <div class="set"><div><div class="t">GOG, Ubisoft, Battle.net et Xbox</div><div class="d">Jeux installés avec GOG Galaxy, Ubisoft Connect, Battle.net et l'application Xbox (Game Pass compris). Les jeux EA sont repérés avec les autres jeux installés.</div></div>${tg('scanStores')}</div>
      <div class="set"><div><div class="t">Jeux pas encore installés</div><div class="d">Tes jeux Steam, Epic et GOG (avec GOG Galaxy) que tu possèdes sans les avoir installés, rangés dans « À installer » avec un bouton pour lancer leur installation.</div></div>${tg('showOwned')}</div>
      <div class="set"><div><div class="t">Autres jeux et launchers</div><div class="d">Riot (League of Legends, VALORANT), Roblox, Minecraft (officiel, Lunar, Prism, Modrinth…) et les jeux installés d'éditeurs comme Netmarble, HoYoverse, Ubisoft ou EA.</div></div>${tg('scanOthers')}</div>
      <div class="set-group">Images</div>
      <div class="set"><div><div class="t">Clé SteamGridDB (conseillée)</div><div class="d">Donne de belles jaquettes, fonds et logos aux jeux Switch et Switch 2. Gratuite : crée un compte sur <a data-url="https://www.steamgriddb.com/profile/preferences/api">steamgriddb.com</a>, puis copie ta clé ici.</div></div><input class="input" id="sgdbKey" type="password" placeholder="Colle ta clé ici" value="${esc(s.sgdbKey)}"></div>
      <div class="set"><div><div class="t">Recharger les images</div><div class="d">Cherche à nouveau les jaquettes de tous les jeux.</div></div><button class="btn" data-action="refresh-art">${ICON.image}Recharger</button></div>
      <div class="set-group">Manette</div>
      <div class="set"><div><div class="t">Manette détectée</div><div class="d">${(() => { const all = allPadKinds(); const bg = all.filter((k) => padKinds.includes(k)); const fg = all.filter((k) => !padKinds.includes(k)); return all.length ? `${all.map((k) => PAD_LABEL[k] || k).join(', ')} : prête.${fg.length ? ' Elle marche dans HMZ ; pour quitter un jeu avec Select + Start, HMZ la cherche encore en arrière-plan (quelques secondes).' : ' Elle marche même quand HMZ est en arrière-plan.'}` : 'Aucune pour l\'instant. Branche ou allume ta manette (Xbox, PlayStation, Switch Pro ou autre), puis appuie sur un bouton.'; })()}</div></div>${allPadKinds().length ? '<span class="status ok">Connectée</span>' : '<span class="status">—</span>'}</div>
      <div class="set"><div><div class="t">Quitter un jeu à la manette</div><div class="d">Maintiens <b>Select + Start</b> pendant 1 seconde (Xbox : View + Menu · PlayStation : Share/Create + Options · Switch : − et +). Le jeu se ferme et HMZ revient.</div></div>${tg('padQuit')}</div>
      <div class="set"><div><div class="t">Bouton Xbox / PS / Home</div><div class="d">Quand aucun jeu ne tourne, il ouvre HMZ en mode TV.</div></div>${tg('padHome')}</div>
      <div class="set-group">Sauvegardes</div>
      <div class="set"><div><div class="t">Sauvegarde automatique</div><div class="d">Après chaque partie, tes sauvegardes sont copiées dans <span class="linkish" data-action="open-backups">${esc(s.backupDirShown || '')}</span>. Les 15 dernières de chaque émulateur sont gardées. Choisis un dossier OneDrive pour les retrouver sur un autre PC.</div></div>${tg('backups')}</div>
      <div class="set"><div><div class="t">Dossier des sauvegardes</div><div class="d">Tu peux aussi sauvegarder tout de suite.</div></div><div style="display:flex;gap:8px"><button class="btn ghost" data-action="backup-dir">Changer</button><button class="btn" data-action="backup-now">Sauvegarder maintenant</button></div></div>
      <div class="set-group">Jeu</div>
      <div class="set"><div><div class="t">Lancer HMZ au démarrage de Windows</div><div class="d">Avec « Démarrer en mode TV », ton PC démarre comme une console.</div></div>${tg('autostart')}</div>
      <div class="set"><div><div class="t">Démarrer en mode TV</div><div class="d">HMZ s'ouvre en plein écran, prêt pour la manette. Touche F11 ou bouton Start pour basculer.</div></div>${tg('startInTV')}</div>
      <div class="set"><div><div class="t">Fermer la boutique après la partie</div><div class="d">Si HMZ a dû ouvrir Steam, Epic, Battle.net, Ubisoft Connect, Riot ou EA pour lancer un jeu, il la referme 1 min 30 après la fin de la partie (le temps de synchroniser tes sauvegardes dans le cloud). Une boutique déjà ouverte avant n'est jamais fermée.</div></div>${tg('closeClients')}</div>
      <div class="set"><div><div class="t">Émulateurs en plein écran</div><div class="d">Les jeux émulés s'ouvrent directement en plein écran.</div></div>${tg('emuFullscreen')}</div>
      <div class="set"><div><div class="t">Réduire HMZ pendant que je joue</div><div class="d">Valable pour tous les jeux (Steam, Epic, Xbox, émulateurs…). HMZ revient tout seul quand tu quittes le jeu.</div></div>${tg('minimizeOnPlay')}</div>
      <div class="set"><div><div class="t">Afficher les jeux masqués</div><div class="d">Pour retrouver un jeu que tu as masqué.</div></div><button class="toggle${ui.showHidden ? ' on' : ''}" data-action="toggle-hidden"></button></div>
      <div class="set"><div><div class="t">Recherche depuis n'importe où</div><div class="d"><b>Ctrl + Alt + Espace</b> ouvre la recherche de HMZ même quand il est réduit, pour lancer un jeu en deux secondes. Clic droit sur l'icône HMZ dans la barre des tâches : tes jeux récents.</div></div>${tg('globalSearch')}</div>
      <div class="set-group">Mode TV</div>
      <div class="set"><div><div class="t">Cacher la souris</div><div class="d">Le pointeur disparaît après 2 secondes sans bouger.</div></div>${tg('tvCursor')}</div>
      <div class="set"><div><div class="t">Écran du mode TV</div><div class="d">Pratique si ta télé est branchée en deuxième écran.</div></div><select class="select" id="tvDisplay"><option value="">Écran actuel</option>${(ui.displays || []).map((d) => `<option value="${esc(d.id)}"${String(s.tvDisplay) === d.id ? ' selected' : ''}>${esc(d.label)}</option>`).join('')}</select></div>
      <div class="set"><div><div class="t">Taille du texte et des jaquettes</div><div class="d">Agrandis tout si tu joues loin de l'écran.</div></div><select class="select" id="tvScale">${[[100, 'Normale'], [115, 'Grande'], [130, 'Très grande']].map(([v, l]) => `<option value="${v}"${Number(s.tvScale || 100) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="set-group">Discord</div>
      <div class="set"><div><div class="t">Afficher le jeu en cours sur Discord</div><div class="d">Ton profil Discord affiche « Joue à … » avec le temps écoulé, même pour les jeux émulés. HMZ parle seulement à l'application Discord ouverte sur ton PC.</div></div>${tg('discord')}</div>
      <div class="set"><div><div class="t">Identifiant de l'application Discord</div><div class="d">Une fois : sur <a data-url="https://discord.com/developers/applications">discord.com/developers</a>, clique sur « New Application », appelle-la <b>HMZ</b> (c'est le nom affiché sur ton profil), puis copie l'« Application ID » ici.</div></div><div style="display:flex;gap:8px"><input class="input" id="discordId" placeholder="Ex. 1234567890123456789" value="${esc(s.discordId || '')}" spellcheck="false" style="width:210px"><button class="btn ghost" data-action="discord-test">Tester</button></div></div>
      <div class="set-group">Bibliothèque</div>
      <div class="set"><div><div class="t">Sauvegarder ma bibliothèque</div><div class="d">Collections, temps de jeu, notes, statuts et images choisies, dans un seul fichier. HMZ en fait aussi une copie chaque jour (les 10 dernières sont gardées).</div></div><div style="display:flex;gap:8px"><button class="btn" data-action="lib-export">Sauvegarder</button><button class="btn ghost" data-action="lib-backups">Copies auto</button></div></div>
      <div class="set"><div><div class="t">Restaurer une bibliothèque</div><div class="d">Remplace ta bibliothèque actuelle par celle du fichier (une copie de l'actuelle est faite avant). HMZ redémarre ensuite.</div></div><button class="btn ghost" data-action="lib-import">Restaurer</button></div>
      <div class="set-group">Aide</div>
      <div class="set"><div><div class="t">Signaler un problème</div><div class="d">Prépare un rapport sur GitHub avec ta version de HMZ et les dernières erreurs notées (ton nom d'utilisateur Windows est retiré). Rien n'est envoyé tant que tu ne valides pas sur la page.</div></div><button class="btn" data-action="report">Signaler</button></div>
      <div class="set"><div><div class="t">Journal d'erreurs</div><div class="d">HMZ note ici ce qui ne s'est pas passé comme prévu, au lieu de planter.</div></div><button class="btn ghost" data-action="open-log">Ouvrir</button></div>
    </div>
  </div>`;
}
