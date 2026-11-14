/* HMZ Launcher — interface */
'use strict';

const api = window.hmz;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = null;                       // état reçu du processus principal
const ui = { view: 'home', heroId: null, filter: 'all', sort: 'recent', q: '', showHidden: false };
const emuProg = {};                 // progression des installations
const emuErr = {};                  // dernière erreur d'installation par émulateur
let padKinds = [];                  // manettes vues en arrière-plan
const PAD_LABEL = { xbox: 'Xbox', playstation: 'PlayStation', switch: 'Switch Pro', generic: 'manette' };
const PAD_HELP = {
  eden: 'Dans Eden : Émulation › Configurer › Contrôles. Choisis ta manette dans « Périphérique d\'entrée », puis OK.',
  lichii: 'Dans Lichii : Émulation › Configurer › Contrôles. Choisis ta manette dans « Périphérique d\'entrée », puis OK.',
  azahar: 'Dans Azahar : Émulation › Configurer › Contrôles, puis « Configuration automatique » et appuie sur les boutons demandés.',
  melonds: 'Dans melonDS : Config › Input and hotkeys, onglet DS keypad, puis clique sur chaque touche.',
};
const ORDER = ['switch2', 'switch', '3ds', 'ds', 'pc'];

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
  pad: '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18" cy="13.5" r=".8"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></svg>',
  chip: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 10v4M12 17h.01"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

// --- Formats ------------------------------------------------------------------------
const plat = (p) => (S && S.platforms[p]) || { label: p, color: '#888' };
function fmtTime(min) {
  min = Math.round(min || 0);
  if (min < 1) return 'Jamais joué';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return h >= 10 || !m ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
function fmtHours(min) { const h = (min || 0) / 60; return h >= 10 ? Math.round(h) : Math.round(h * 10) / 10; }
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dayStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function fmtLast(t) {
  if (!t) return null;
  const days = Math.round((dayStart(Date.now()) - dayStart(t)) / 864e5);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  const d = new Date(t);
  return `le ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
function fmtSize(b) { if (!b) return '—'; const g = b / 1024 ** 3; return g >= 1 ? `${g.toFixed(g >= 10 ? 0 : 1)} Go` : `${Math.round(b / 1024 ** 2)} Mo`; }
function sourceLabel(g) {
  if (g.source === 'steam') return 'Steam';
  if (g.source === 'epic') return 'Epic Games';
  if (g.platform === 'pc') return 'Ajouté à la main';
  const e = S.emulators.find((x) => x.id === g.emu);
  return e ? `via ${e.name}` : 'Émulé';
}
function metaParts(g) {
  const parts = [plat(g.platform).label];
  parts.push(g.platform === 'pc' ? sourceLabel(g) : sourceLabel(g));
  if (g.last) parts.push(`Dernière partie ${fmtLast(g.last)}`);
  if (g.minutes >= 1) parts.push(`${fmtTime(g.minutes)} de jeu`);
  return parts;
}

// --- Images -----------------------------------------------------------------------------
function coverHTML(g, extra = '') {
  const p = plat(g.platform);
  const src = g.art.cover || g.art.header;
  const contain = !g.art.cover && g.art.header ? ' contain' : '';
  return `<div class="cover${src ? '' : ' noimg'}${contain}" style="--c:${p.color}">
    ${src ? `<img src="${esc(src)}" loading="lazy" draggable="false">` : ''}
    <div class="fb"><span class="fb-plat">${esc(p.label)}</span><span class="fb-name">${esc(g.name)}</span></div>
    ${extra}
  </div>`;
}
function heroInfo(g) {
  if (g.art.hero) return { url: g.art.hero, blur: false };
  if (g.art.header) return { url: g.art.header, blur: false };
  if (g.art.cover) return { url: g.art.cover, blur: true, cover: g.art.cover };
  return null;
}
function cardHTML(g, { selected = false } = {}) {
  const extra = `${g.favorite ? `<span class="fav">${ICON.star}</span>` : ''}
    ${g.running ? '<span class="live"><i class="dot"></i>En cours</span>' : (!g.emuReady ? '<span class="noemu">Émulateur à installer</span>' : '')}`;
  return `<button class="card${selected ? ' selected' : ''}" data-game="${esc(g.id)}" style="--c:${plat(g.platform).color}">
    ${coverHTML(g, extra)}
    <div class="card-name">${esc(g.name)}</div>
    <div class="card-sub"><i class="pdot"></i>${esc(plat(g.platform).label)}${g.minutes >= 1 ? ` · ${fmtTime(g.minutes)}` : ''}</div>
  </button>`;
}
const addCardHTML = () => `<button class="card add" data-action="add-game"><div class="cover"><div><span class="plus">${ICON.plus}</span>Ajouter un jeu<small style="color:var(--faint);font-weight:500">PC ou console</small></div></div></button>`;

// Une image qui ne charge pas : on affiche la version de secours.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  if (img.dataset.title) {
    const h = document.createElement('h1');
    h.className = img.classList.contains('tv-logo') ? 'tv-title' : 'hero-title';
    if (img.dataset.title.length > 20) h.classList.add('long');
    h.textContent = img.dataset.title;
    img.replaceWith(h);
    return;
  }
  const thumb = img.closest('.thumb');
  if (thumb) { thumb.classList.add('noimg'); $$('img', thumb).forEach((i) => i.remove()); $('.bgblur', thumb)?.remove(); return; }
  const cover = img.closest('.cover');
  if (cover) { cover.classList.add('noimg'); img.remove(); return; }
  const big = img.closest('.hero-cover, .tv-cover');
  if (big) big.style.display = 'none';
}, true);

// --- Données ---------------------------------------------------------------------------
const visible = () => S.games.filter((g) => ui.showHidden || !g.hidden);
const byRecent = (a, b) => (b.last || 0) - (a.last || 0) || (b.addedAt || 0) - (a.addedAt || 0) || a.name.localeCompare(b.name, 'fr');
function gameById(id) { return S.games.find((g) => g.id === id); }
function featured() {
  const list = visible();
  return gameById(ui.heroId) || [...list].sort(byRecent)[0] || null;
}

// --- Rendu -------------------------------------------------------------------------------
const VIEWS = { home: renderHome, library: renderLibrary, emulators: renderEmulators, stats: renderStats, settings: renderSettings };
function render() {
  if (!S) return;
  $$('#side button').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  const view = $('#view');
  const st = view.scrollTop;
  view.innerHTML = VIEWS[ui.view]();
  view.scrollTop = st;
  if (!$('#tv').hidden) renderTV(true);
}
function go(v) { ui.view = v; $('#view').scrollTop = 0; render(); }

// Accueil ------------------------------------------------------------------------------------
function renderHome() {
  const list = visible();
  if (!list.length) return renderWelcome();
  const g = featured();
  const h = heroInfo(g);
  const recent = list.filter((x) => x.last).sort(byRecent).slice(0, 16);
  const rows = [];
  rows.push({ key: 'recent', title: recent.length ? 'Reprendre' : 'Ta collection', games: recent.length ? recent : [...list].sort(byRecent).slice(0, 16), add: !recent.length });
  const favs = list.filter((x) => x.favorite).sort(byRecent);
  if (favs.length) rows.push({ key: 'fav', title: 'Favoris', games: favs });
  for (const p of ORDER) {
    const gs = list.filter((x) => x.platform === p).sort(byRecent);
    if (gs.length) rows.push({ key: p, title: plat(p).label, games: gs, color: plat(p).color });
  }
  const title = g.name;
  const meta = metaParts(g).map(esc).join('<span class="sep">·</span>');
  return `<div class="home">
    <section class="hero">
      ${h ? `<div class="hero-bg${h.blur ? ' blur' : ''}" style="background-image:url('${esc(h.url)}')"></div>` : `<div class="hero-bg" style="background:radial-gradient(80% 90% at 70% 30%, ${plat(g.platform).color}55, transparent 70%)"></div>`}
      <div class="hero-shade"></div>
      ${h && h.cover ? `<div class="hero-cover"><img src="${esc(h.cover)}" draggable="false"></div>` : ''}
      <div class="hero-content">
        <div class="kicker${g.running ? ' live' : ''}"><i class="dot"></i>${g.running ? 'En cours' : (g.emuReady ? 'Prêt à jouer' : 'Émulateur à installer')}</div>
        ${g.art.logo ? `<img class="hero-logo" src="${esc(g.art.logo)}" alt="${esc(title)}" data-title="${esc(title)}">` : `<h1 class="hero-title${title.length > 22 ? ' long' : ''}">${esc(title)}</h1>`}
        <div class="hero-meta">${meta}</div>
        <div class="hero-actions">
          <button class="btn primary play" data-play="${esc(g.id)}">${ICON.play}${g.emuReady ? 'Jouer' : 'Installer et jouer'}</button>
          <button class="btn round" data-detail="${esc(g.id)}" title="Voir la fiche">${ICON.info}</button>
          <button class="btn round" data-menu="${esc(g.id)}" title="Plus d'options">${ICON.dots}</button>
        </div>
      </div>
    </section>
    <div class="rows">
      ${rows.map((r) => `<section class="row">
        <div class="row-head"><h2>${r.color ? `<span class="tag" style="--c:${r.color}">${esc(r.title)}</span>` : esc(r.title)}<span class="count">${r.games.length} jeu${r.games.length > 1 ? 'x' : ''}</span></h2>
        ${r.key !== 'recent' ? `<button data-seeall="${r.key}">Tout voir</button>` : ''}</div>
        <div class="row-track">${r.games.map((x) => cardHTML(x, { selected: x.id === g.id })).join('')}${r.add ? addCardHTML() : ''}</div>
      </section>`).join('')}
    </div>
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

// Bibliothèque -------------------------------------------------------------------------------
function renderLibrary() {
  const all = visible();
  const counts = { all: all.length, fav: all.filter((g) => g.favorite).length };
  for (const p of ORDER) counts[p] = all.filter((g) => g.platform === p).length;
  let list = all.filter((g) => ui.filter === 'all' || (ui.filter === 'fav' ? g.favorite : g.platform === ui.filter));
  if (ui.q) { const q = ui.q.toLowerCase(); list = list.filter((g) => g.name.toLowerCase().includes(q)); }
  const sorts = {
    recent: byRecent,
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    time: (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'fr'),
    added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
  };
  list.sort(sorts[ui.sort]);
  const chip = (k, label) => (counts[k] || k === 'all' ? `<button class="chip${ui.filter === k ? ' on' : ''}" data-filter="${k}">${esc(label)}<span class="n">${counts[k] || 0}</span></button>` : '');
  return `<div class="page">
    <div class="page-head"><div><h1>Bibliothèque</h1><p>${all.length} jeu${all.length > 1 ? 'x' : ''} · clic droit sur un jeu pour plus d'options</p></div>
      <button class="btn primary" data-action="add-game">${ICON.plus}Ajouter un jeu</button></div>
    <div class="toolbar">
      <div class="chips">${chip('all', 'Tous')}${chip('fav', 'Favoris')}${ORDER.map((p) => chip(p, plat(p).label)).join('')}</div>
      <div class="grow"></div>
      <input class="input" id="libSearch" placeholder="Filtrer…" value="${esc(ui.q)}" style="width:200px;height:34px">
      <select class="select" id="libSort">
        ${[['recent', 'Joués récemment'], ['name', 'Nom'], ['time', 'Temps de jeu'], ['added', 'Ajoutés récemment']].map(([k, l]) => `<option value="${k}"${ui.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    ${list.length ? `<div class="grid">${list.map((g) => cardHTML(g)).join('')}${ui.filter === 'all' && !ui.q ? addCardHTML() : ''}</div>`
      : `<div class="empty"><h3>Aucun jeu ici</h3><p>${ui.filter !== 'all' && ui.filter !== 'fav' && ui.filter !== 'pc' ? `Dépose tes jeux ${esc(plat(ui.filter).label)} dans leur dossier, puis relance la recherche.` : 'Essaie un autre filtre.'}</p>
        ${ui.filter !== 'all' && ui.filter !== 'fav' && ui.filter !== 'pc' ? `<button class="btn" data-opendir="${ui.filter}">${ICON.folder}Ouvrir le dossier</button>` : ''}</div>`}
  </div>`;
}

// Émulateurs ---------------------------------------------------------------------------------
function renderEmulators() {
  const s = S.settings;
  const EXT = { ds: '.nds', '3ds': '.3ds .cci .cxi .3dsx (déchiffrés)', switch: '.nsp .xci .nsz .xcz', switch2: '.nsp .xci .nsz .xcz' };
  return `<div class="page">
    <div class="page-head"><div><h1>Émulateurs</h1><p>Chaque émulateur est téléchargé depuis sa page officielle et installé dans <span class="linkish" data-action="open-root">${esc(s.root)}\\Emulateurs</span>.</p></div>
      <button class="btn ghost" data-action="check-updates">${ICON.refresh}Vérifier les mises à jour</button></div>
    <div class="note">${ICON.warn}<div><b>Les jeux, les clés et le firmware ne sont pas fournis.</b> Aucun émulateur ne les inclut : ils doivent venir de ta propre console (et de tes propres cartouches). Évite les sites qui proposent de télécharger « Lichii » ou « Eden » ailleurs que sur leur page officielle : de faux sites ont déjà distribué des virus.</div></div>
    <div class="emu-grid">${S.emulators.map(emuCard).join('')}</div>
    <h2 class="section-title">Dossiers de jeux</h2>
    <p class="section-sub">Dépose tes jeux dans ces dossiers. HMZ cherche aussi dans les sous-dossiers.</p>
    <div class="folders-table">
      ${['switch2', 'switch', '3ds', 'ds'].map((p) => `<div class="frow">
        <div><span class="tag" style="--c:${plat(p).color}">${esc(plat(p).label)}</span><div class="ext" style="margin-top:6px">${esc(EXT[p])}</div></div>
        <div class="paths">${(s.romDirs[p] || []).map((d, i) => `<div class="path"><span title="${esc(d)}">${esc(d)}</span>${i > 0 ? `<button data-rmdir="${p}" data-dir="${esc(d)}">retirer</button>` : ''}</div>`).join('') || '<div class="path">Aucun dossier</div>'}</div>
        <div class="acts"><button class="btn sm" data-opendir="${p}">${ICON.folder}Ouvrir</button><button class="btn sm ghost" data-adddir="${p}">${ICON.plus}Autre dossier</button></div>
      </div>`).join('')}
    </div>
  </div>`;
}

function emuCard(e) {
  const prog = emuProg[e.id];
  const color = plat(e.platforms[0]).color;
  const hasUpdate = e.installed && !e.custom && e.latest && e.version && e.latest !== e.version;
  const status = e.installed ? (hasUpdate ? `<span class="status upd">Mise à jour : ${esc(e.latest)}</span>` : `<span class="status ok">Installé${e.version && e.version !== 'perso' ? ' · ' + esc(e.version) : ''}</span>`) : '<span class="status">Non installé</span>';
  let body;
  if (prog && prog.step) {
    const pct = prog.total ? Math.min(100, Math.round((prog.done / prog.total) * 100)) : null;
    body = `<div class="progress"><span>${esc(prog.step)}${pct !== null ? ` · ${pct} %` : ''}${prog.total ? ` · ${fmtSize(prog.done)} / ${fmtSize(prog.total)}` : ''}</span>
      <div class="bar${pct === null ? ' indet' : ''}"><i style="width:${pct ?? 35}%"></i></div></div>`;
  } else if (!e.installed) {
    body = `${emuErr[e.id] ? `<div class="emu-err">${ICON.warn}<div><b>Le téléchargement automatique a échoué.</b> ${esc(emuErr[e.id])}<br>Télécharge la version Windows (.zip) depuis la <span class="linkish" data-url="${esc(e.page)}">page officielle</span>, puis clique sur « Installer depuis un .zip ».</div></div>` : ''}
      <div class="emu-actions"><button class="btn primary" data-install="${e.id}">${ICON.download}${emuErr[e.id] ? 'Réessayer' : `Installer ${esc(e.name)}`}</button>
      <button class="btn${emuErr[e.id] ? ' primary' : ' ghost'}" data-installzip="${e.id}">Installer depuis un .zip</button>
      <button class="btn ghost" data-locate="${e.id}">Je l'ai déjà</button></div>`;
  } else {
    body = `<div class="emu-actions">
      ${hasUpdate ? `<button class="btn primary" data-install="${e.id}">${ICON.download}Mettre à jour</button>` : ''}
      <button class="btn" data-emuopen="${e.id}">${ICON.ext}Ouvrir ${esc(e.name)}</button>
      <button class="btn ghost" data-emudir="${e.id}">${ICON.folder}Dossier</button>
    </div>
    <div class="emu-actions">
      <button class="btn sm ghost" data-emucfg="${e.id}">${ICON.refresh}Réglages conseillés</button>
      <button class="btn sm ghost" data-emupad="${e.id}">${ICON.pad}Configurer la manette</button>
    </div>`;
  }
  const sys = e.needsKeys && e.installed ? `<div class="sys">
      <div class="sys-item"><span class="lbl"><span class="check${e.keys && e.keys.keys ? ' on' : ''}">${e.keys && e.keys.keys ? ICON.check : ''}</span>Clés</span><button class="btn sm" data-keys="${e.id}">${ICON.key}${e.keys && e.keys.keys ? 'Remplacer' : 'Ajouter prod.keys'}</button></div>
      <div class="sys-item"><span class="lbl"><span class="check${e.keys && e.keys.firmware ? ' on' : ''}">${e.keys && e.keys.firmware ? ICON.check : ''}</span>Firmware</span><button class="btn sm" data-fw="${e.id}">${ICON.chip}${e.keys && e.keys.firmware ? 'Remplacer' : 'Installer'}</button></div>
    </div>` : '';
  return `<article class="emu" data-emu="${e.id}" style="--c:${color}">
    <div class="emu-top"><div><h3>${esc(e.name)}</h3><div class="tags">${e.platforms.map((p) => `<span class="tag" style="--c:${plat(p).color}">${esc(plat(p).label)}</span>`).join('')}${e.experimental ? '<span class="tag" style="--c:#f6c344">Expérimental</span>' : ''}</div></div>${status}</div>
    <p>${esc(e.blurb)}</p>
    ${body}
    ${sys}
    <div class="links"><button data-url="${esc(e.page)}">Page officielle ↗</button>${e.installed ? `<button data-installzip="${e.id}">Installer depuis un .zip</button><button data-locate="${e.id}">Utiliser un autre .exe</button>` : ''}${e.installed && e.custom ? `<button data-forget="${e.id}">Oublier</button>` : ''}</div>
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
function renderSettings() {
  const s = S.settings;
  const tg = (k) => `<button class="toggle${s[k] ? ' on' : ''}" data-toggle="${k}" aria-pressed="${!!s[k]}"></button>`;
  return `<div class="page">
    <div class="page-head"><div><h1>Paramètres</h1><p>HMZ Launcher ${esc(S.version)}</p></div></div>
    <div class="settings">
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
      <div class="set"><div><div class="t">Autres jeux et launchers</div><div class="d">Riot (League of Legends, VALORANT), Roblox, Minecraft (officiel, Lunar, Prism, Modrinth…) et les jeux installés d'éditeurs comme Netmarble, HoYoverse, Ubisoft ou EA.</div></div>${tg('scanOthers')}</div>
      <div class="set-group">Images</div>
      <div class="set"><div><div class="t">Clé SteamGridDB (conseillée)</div><div class="d">Donne de belles jaquettes, fonds et logos aux jeux Switch et Switch 2. Gratuite : crée un compte sur <a data-url="https://www.steamgriddb.com/profile/preferences/api">steamgriddb.com</a>, puis copie ta clé ici.</div></div><input class="input" id="sgdbKey" type="password" placeholder="Colle ta clé ici" value="${esc(s.sgdbKey)}"></div>
      <div class="set"><div><div class="t">Recharger les images</div><div class="d">Cherche à nouveau les jaquettes de tous les jeux.</div></div><button class="btn" data-action="refresh-art">${ICON.image}Recharger</button></div>
      <div class="set-group">Manette</div>
      <div class="set"><div><div class="t">Manette détectée</div><div class="d">${padKinds.length ? `${padKinds.map((k) => PAD_LABEL[k] || k).join(', ')} : prête, même quand HMZ est en arrière-plan.` : 'Aucune pour l\'instant. Branche ou allume ta manette (Xbox, PlayStation, Switch Pro ou autre).'}</div></div>${padKinds.length ? '<span class="status ok">Connectée</span>' : '<span class="status">—</span>'}</div>
      <div class="set"><div><div class="t">Quitter un jeu à la manette</div><div class="d">Maintiens <b>Select + Start</b> pendant 1 seconde (Xbox : View + Menu · PlayStation : Share/Create + Options · Switch : − et +). Le jeu se ferme et HMZ revient.</div></div>${tg('padQuit')}</div>
      <div class="set"><div><div class="t">Bouton Xbox / PS / Home</div><div class="d">Quand aucun jeu ne tourne, il ouvre HMZ en mode TV.</div></div>${tg('padHome')}</div>
      <div class="set-group">Sauvegardes de tes parties</div>
      <div class="set"><div><div class="t">Sauvegarde automatique</div><div class="d">Après chaque partie, tes sauvegardes sont copiées dans <span class="linkish" data-action="open-backups">${esc(s.backupDirShown || '')}</span>. Les 15 dernières de chaque émulateur sont gardées. Choisis un dossier OneDrive pour les retrouver sur un autre PC.</div></div>${tg('backups')}</div>
      <div class="set"><div><div class="t">Dossier des sauvegardes</div><div class="d">Tu peux aussi sauvegarder tout de suite.</div></div><div style="display:flex;gap:8px"><button class="btn ghost" data-action="backup-dir">Changer</button><button class="btn" data-action="backup-now">Sauvegarder maintenant</button></div></div>
      <div class="set-group">Jeu</div>
      <div class="set"><div><div class="t">Lancer HMZ au démarrage de Windows</div><div class="d">Avec « Démarrer en mode TV », ton PC démarre comme une console.</div></div>${tg('autostart')}</div>
      <div class="set"><div><div class="t">Démarrer en mode TV</div><div class="d">HMZ s'ouvre en plein écran, prêt pour la manette. Touche F11 ou bouton Start pour basculer.</div></div>${tg('startInTV')}</div>
      <div class="set"><div><div class="t">Émulateurs en plein écran</div><div class="d">Les jeux DS, 3DS et Switch s'ouvrent directement en plein écran.</div></div>${tg('emuFullscreen')}</div>
      <div class="set"><div><div class="t">Réduire HMZ pendant que je joue</div><div class="d">HMZ revient tout seul quand tu quittes un jeu émulé.</div></div>${tg('minimizeOnPlay')}</div>
      <div class="set"><div><div class="t">Afficher les jeux masqués</div><div class="d">Pour retrouver un jeu que tu as masqué.</div></div><button class="toggle${ui.showHidden ? ' on' : ''}" data-action="toggle-hidden"></button></div>
    </div>
  </div>`;
}

// --- Fiche d'un jeu -----------------------------------------------------------------------
function openDetail(id) {
  const g = gameById(id);
  if (!g) return;
  const h = heroInfo(g);
  const days = [...Array(30)].map((_, i) => dayStart(Date.now()) - (29 - i) * 864e5);
  const per = days.map((d) => S.sessions.filter((s) => s.g === id && dayStart(s.s) === d).reduce((a, s) => a + (s.e - s.s) / 60000, 0));
  const pmax = Math.max(20, ...per);
  const isSwitchRom = (g.platform === 'switch' || g.platform === 'switch2') && g.source !== 'steam';
  const emus = isSwitchRom ? S.emulators.filter((e) => e.platforms.includes(g.platform) || e.id === 'eden' || e.id === 'lichii') : [];
  modal(`<div class="modal" style="--c:${plat(g.platform).color}">
    <button class="x" data-close>${ICON.x}</button>
    <div class="d-hero">${h ? `<div class="hero-bg${h.blur ? ' blur' : ''}" style="background-image:url('${esc(h.url)}')"></div>` : `<div class="hero-bg" style="background:radial-gradient(80% 100% at 30% 0%, ${plat(g.platform).color}66, transparent 70%)"></div>`}</div>
    <div class="d-head">
      ${coverHTML(g)}
      <div class="info">
        <div class="row1"><span class="tag" style="--c:${plat(g.platform).color}">${esc(plat(g.platform).label)}</span><span style="color:var(--muted);font-size:13px">${esc(sourceLabel(g))}</span>${g.running ? '<span class="kicker live" style="font-size:11px"><i class="dot"></i>En cours</span>' : ''}</div>
        <h2>${esc(g.name)}</h2>
        <div class="acts">
          <button class="btn primary play" data-play="${esc(g.id)}">${ICON.play}${g.emuReady ? 'Jouer' : 'Installer et jouer'}</button>
          <button class="btn" data-fav="${esc(g.id)}">${ICON.star}${g.favorite ? 'Retirer des favoris' : 'Favori'}</button>
        </div>
      </div>
    </div>
    <div class="d-body">
      <div>
        <div class="kv">
          <div><div class="k">Temps de jeu</div><div class="v">${fmtTime(g.minutes)}</div></div>
          <div><div class="k">Dernière partie</div><div class="v">${g.last ? esc(fmtLast(g.last)) : '—'}</div></div>
          <div><div class="k">Sessions</div><div class="v">${g.sessions || '—'}</div></div>
          <div><div class="k">Taille</div><div class="v">${fmtSize(g.size)}</div></div>
        </div>
        <div class="field-label">30 derniers jours</div>
        <div class="mini-chart">${per.map((m) => `<i class="${m < 1 ? 'z' : ''}" style="height:${Math.max(3, (m / pmax) * 100)}%" title="${fmtTime(m)}"></i>`).join('')}</div>
        ${emus.length ? `<div class="field-label">Lancer avec</div><div class="seg">${emus.map((e) => `<button class="${g.emu === e.id ? 'on' : ''}" data-setemu="${e.id}" data-id="${esc(g.id)}">${esc(e.name)}${e.installed ? '' : ' (à installer)'}</button>`).join('')}</div>` : ''}
        ${g.source === 'manual' && g.platform !== 'pc' ? `<div class="field-label">Console</div><div class="seg">${['switch2', 'switch', '3ds', 'ds'].map((p) => `<button class="${g.platform === p ? 'on' : ''}" data-setplat="${p}" data-id="${esc(g.id)}">${esc(plat(p).label)}</button>`).join('')}</div>` : ''}
        ${g.extras && g.extras.length ? `<div class="field-label">Contenu supplémentaire</div><div class="extras">${g.extras.filter((x) => x === 'update').length ? `<span class="tag" style="--c:#5fd38d">${g.extras.filter((x) => x === 'update').length} mise${g.extras.filter((x) => x === 'update').length > 1 ? 's' : ''} à jour</span>` : ''}${g.extras.filter((x) => x === 'dlc').length ? `<span class="tag" style="--c:#7aa2ff">${g.extras.filter((x) => x === 'dlc').length} DLC</span>` : ''}<span style="color:var(--muted);font-size:12.5px">Trouvés dans tes dossiers et signalés à l'émulateur. Si le jeu ne les voit pas : ouvre l'émulateur › Fichier › Installer des fichiers.</span></div>` : ''}
        <div class="path-box">${esc(g.path)}</div>
      </div>
      <div class="side-list">
        <button data-rename="${esc(g.id)}">${ICON.edit}Renommer</button>
        <button data-art="cover" data-id="${esc(g.id)}">${ICON.image}Changer la jaquette</button>
        <button data-art="hero" data-id="${esc(g.id)}">${ICON.image}Changer l'image de fond</button>
        <button data-resetart="${esc(g.id)}">${ICON.refresh}Images d'origine</button>
        <button data-openfolder="${esc(g.id)}">${ICON.folder}Ouvrir l'emplacement</button>
        <button data-hide="${esc(g.id)}">${ICON.eye}${g.hidden ? 'Afficher dans la bibliothèque' : 'Masquer ce jeu'}</button>
        ${g.source === 'manual' ? `<button class="danger" data-remove="${esc(g.id)}">${ICON.trash}Retirer de HMZ</button>` : ''}
      </div>
    </div>
  </div>`, { detail: id });
}

let modalState = null;
function modal(html, state = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg">${html}</div>`;
  modalState = state;
  const bg = root.firstElementChild;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) closeModal(); });
}
function closeModal() { $('#modal-root').innerHTML = ''; modalState = null; }
function refreshModal() { if (modalState && modalState.detail) { const st = $('.modal')?.scrollTop; openDetail(modalState.detail); if (st) $('.modal').scrollTop = st; } }

function askText(title, text, value) {
  return new Promise((resolve) => {
    modal(`<div class="modal dialog"><h3>${esc(title)}</h3><p>${esc(text)}</p><input class="input" id="askInput" value="${esc(value)}">
      <div class="acts"><button class="btn ghost" id="askNo">Annuler</button><button class="btn primary" id="askYes">Valider</button></div></div>`);
    const inp = $('#askInput');
    inp.focus(); inp.select();
    const done = (v) => { closeModal(); resolve(v); };
    $('#askNo').onclick = () => done(null);
    $('#askYes').onclick = () => done(inp.value.trim());
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(null); };
  });
}

function confirmBox(title, text, yes = 'Continuer') {
  return new Promise((resolve) => {
    modal(`<div class="modal dialog"><h3>${esc(title)}</h3><p>${text}</p>
      <div class="acts"><button class="btn ghost" id="cNo">Annuler</button><button class="btn primary" id="cYes">${esc(yes)}</button></div></div>`);
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
    $('#cYes').focus();
  });
}

// --- Recherche rapide (Ctrl+K) -------------------------------------------------------------
function openPalette() {
  modal('<div class="palette"><input id="palIn" placeholder="Rechercher un jeu, puis Entrée pour jouer"><div class="res" id="palRes"></div></div>');
  let sel = 0, results = [];
  const draw = () => {
    const q = $('#palIn').value.trim().toLowerCase();
    results = visible().filter((g) => !q || g.name.toLowerCase().includes(q)).sort(byRecent).slice(0, 30);
    sel = Math.min(sel, Math.max(0, results.length - 1));
    $('#palRes').innerHTML = results.length ? results.map((g, i) => `<button class="it${i === sel ? ' on' : ''}" data-i="${i}"><span class="mini">${coverHTML(g)}</span><span class="nm">${esc(g.name)}</span><span class="tag" style="--c:${plat(g.platform).color}">${esc(plat(g.platform).label)}</span><span class="hint">${g.minutes ? fmtTime(g.minutes) : ''}</span></button>`).join('') : '<div class="none">Aucun jeu trouvé</div>';
    $('.it.on', $('#palRes'))?.scrollIntoView({ block: 'nearest' });
  };
  const inp = $('#palIn');
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && results[sel]) { const id = results[sel].id; closeModal(); if (e.shiftKey) openDetail(id); else play(id); }
    else if (e.key === 'Escape') closeModal();
  };
  $('#palRes').onclick = (e) => { const b = e.target.closest('.it'); if (b) { const id = results[+b.dataset.i].id; closeModal(); openDetail(id); } };
  draw(); inp.focus();
}

// --- Menu contextuel ----------------------------------------------------------------------
function openCtx(id, x, y) {
  const g = gameById(id);
  if (!g) return;
  const ctx = $('#ctx');
  ctx.innerHTML = `<button data-play="${esc(id)}">${ICON.play}Jouer</button>
    <button data-detail="${esc(id)}">${ICON.info}Voir la fiche</button>
    <button data-fav="${esc(id)}">${ICON.star}${g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
    <hr>
    <button data-rename="${esc(id)}">${ICON.edit}Renommer</button>
    <button data-art="cover" data-id="${esc(id)}">${ICON.image}Changer la jaquette</button>
    <button data-art="hero" data-id="${esc(id)}">${ICON.image}Changer le fond</button>
    <button data-openfolder="${esc(id)}">${ICON.folder}Ouvrir l'emplacement</button>
    <button data-hide="${esc(id)}">${ICON.eye}${g.hidden ? 'Afficher' : 'Masquer'}</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctx.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
}
const closeCtx = () => { $('#ctx').hidden = true; };

// --- Notifications -----------------------------------------------------------------------
function toast(text, kind = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

// --- Actions ------------------------------------------------------------------------------
async function call(ch, ...args) {
  try { return await api.call(ch, ...args); } catch (e) { toast(e.message, 'error', 6000); throw e; }
}

async function play(id, emu) {
  const g = gameById(id);
  if (!g) return;
  const res = await call('game:launch', id, emu);
  if (res && res.needEmu) {
    const e = S.emulators.find((x) => x.id === res.needEmu);
    if (!$('#tv').hidden) { tvMessage(`Installe d'abord ${e.name} depuis la page Émulateurs.`); return; }
    const ok = await confirmBox(`Il te faut ${e.name}`, `Pour jouer à <b>${esc(g.name)}</b>, HMZ doit installer ${esc(e.name)}, l'émulateur ${esc(e.platforms.map((p) => plat(p).label).join(' / '))}. Il sera téléchargé depuis sa page officielle.${e.needsKeys ? '<br><br>Il te faudra ensuite tes clés et ton firmware, extraits de ta console.' : ''}`, `Installer ${e.name}`);
    if (ok) { go('emulators'); installEmu(e.id); }
    return;
  }
  if (res && res.ok) {
    if (!$('#tv').hidden) tvLaunching(g);
    else toast(`Lancement de ${g.name}…`, 'ok', 2500);
  }
}

async function installEmu(id) {
  emuProg[id] = { step: 'Préparation…' };
  render();
  try {
    delete emuErr[id];
    const r = await api.call('emu:install', id);
    const e = S.emulators.find((x) => x.id === id);
    toast(r.upToDate ? `${e.name} est déjà à jour.` : `${e.name} ${r.version} est installé.`, 'ok');
    if (!r.upToDate && e.needsKeys) setTimeout(() => toast(`Ajoute maintenant tes clés et ton firmware pour ${e.name}.`, 'info', 6000), 600);
  } catch (err) {
    emuErr[id] = err.message;
    toast(err.message, 'error', 9000);
  } finally {
    delete emuProg[id];
    render();
  }
}

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-url], .linkish, a');
  if (!$('#ctx').hidden && !ev.target.closest('#ctx')) closeCtx();
  if (!t) return;
  const d = t.dataset;
  if (t.closest('#ctx')) closeCtx();

  if (d.view) return go(d.view);
  if (d.go) return go(d.go);
  if (d.win) return api.call('win:' + d.win);
  if (d.close !== undefined) return closeModal();
  if (d.play) { if (modalState) closeModal(); return play(d.play); }
  if (d.detail) return openDetail(d.detail);
  if (d.menu) { const r = t.getBoundingClientRect(); return openCtx(d.menu, r.left, r.bottom + 8); }
  if (d.fav) { const g = gameById(d.fav); await call('game:update', d.fav, { favorite: !g.favorite }); return; }
  if (d.hide) { const g = gameById(d.hide); await call('game:update', d.hide, { hidden: !g.hidden }); if (!g.hidden) toast(`${g.name} est masqué. Tu peux l'afficher à nouveau dans Paramètres.`); return; }
  if (d.rename) { const g = gameById(d.rename); const v = await askText('Renommer', 'Laisse vide pour reprendre le nom d\'origine.', g.name); if (v !== null) await call('game:update', g.id, { customName: v === g.originalName ? '' : v }); return; }
  if (d.art) return call('game:setArt', d.id, d.art);
  if (d.resetart) return call('game:resetArt', d.resetart);
  if (d.openfolder) return call('game:openFolder', d.openfolder);
  if (d.remove) { closeModal(); return call('game:remove', d.remove); }
  if (d.setemu) return call('game:update', d.id, { emu: d.setemu });
  if (d.setplat) return call('game:setPlatform', d.id, d.setplat);
  if (d.filter) { ui.filter = d.filter; return render(); }
  if (d.seeall) { ui.filter = d.seeall; ui.q = ''; return go('library'); }
  if (d.install) return installEmu(d.install);
  if (d.locate) return call('emu:locate', d.locate);
  if (d.installzip) {
    try { const r = await call('emu:installZip', d.installzip); if (r) { delete emuErr[d.installzip]; toast(`${S.emulators.find((x) => x.id === d.installzip).name} est installé.`, 'ok'); render(); } } catch {}
    return;
  }
  if (d.emucfg) { const r = await call('emu:configure', d.emucfg); toast(`Réglages appliqués : ${r.done.join(', ')}.`, 'ok'); return; }
  if (d.emupad) {
    const e = S.emulators.find((x) => x.id === d.emupad);
    if (e.id === 'melonds') { const r = await call('emu:configure', e.id); toast(`Manette ${PAD_LABEL[(padKinds[0] || 'xbox')] || ''} configurée dans melonDS. Si un bouton ne répond pas : ${PAD_HELP.melonds}`, 'ok', 9000); return; }
    await call('emu:open', e.id);
    toast(PAD_HELP[e.id], 'info', 14000);
    return;
  }
  if (d.forget) return call('emu:forget', d.forget);
  if (d.emuopen) return call('emu:open', d.emuopen);
  if (d.emudir) return call('emu:openDir', d.emudir);
  if (d.keys) { const r = await call('emu:keys', d.keys); if (r) toast(`Clés installées : ${r.copied.join(', ')}`, 'ok'); return; }
  if (d.fw) { const r = await call('emu:firmware', d.fw); if (r) toast(`Firmware installé (${r.count} fichiers).`, 'ok'); return; }
  if (d.opendir) return call('dir:open', d.opendir);
  if (d.adddir) return call('dir:add', d.adddir);
  if (d.rmdir) return call('dir:remove', d.rmdir, d.dir);
  if (d.url) return call('open:url', d.url);
  if (d.toggle) return call('settings:set', { [d.toggle]: !S.settings[d.toggle] });

  const card = t.closest('.card[data-game]');
  if (card) {
    if (ui.view === 'home' && card.closest('.rows')) {
      ui.heroId = card.dataset.game;
      render();
      $('#view').scrollTo({ top: 0, behavior: 'smooth' });
    } else openDetail(card.dataset.game);
    return;
  }

  switch (d.action) {
    case 'add-game': { const n = await call('game:add'); if (n) toast(`${n} jeu${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`, 'ok'); break; }
    case 'rescan': toast('Recherche des jeux…'); await call('library:scan'); toast('Bibliothèque à jour.', 'ok'); break;
    case 'refresh-art': await call('art:refresh', true); toast('Recherche des images en cours…'); break;
    case 'check-updates': toast('Vérification…'); await call('emu:checkUpdates'); toast('Vérification terminée.', 'ok'); break;
    case 'choose-root': await call('root:choose'); break;
    case 'open-root': await call('root:open'); break;
    case 'restart': await call('app:restart'); break;
    case 'open-backups': await call('backup:open'); break;
    case 'backup-dir': await call('backup:chooseDir'); break;
    case 'backup-now': { const r = await call('backup:now'); toast(r.length ? `Sauvegardé : ${r.join(', ')}.` : 'Aucune sauvegarde à copier pour l\'instant.', 'ok'); break; }
    case 'check-app-update': {
      const r = await call('app:checkUpdate');
      if (r.dev) toast('Les mises à jour automatiques marchent seulement dans la version installée.');
      else if (r.newer) toast(`Mise à jour ${r.latest} trouvée, téléchargement en cours…`, 'ok');
      else toast(`Tu as la dernière version (${S.version}).`, 'ok');
      break;
    }
    case 'rollback': if (await confirmBox('Revenir à la version installée ?', `HMZ va redémarrer en version ${esc(S.builtinVersion)}. Tes jeux, réglages et temps de jeu sont conservés.`, 'Redémarrer')) await call('app:rollback'); break;
    case 'toggle-hidden': ui.showHidden = !ui.showHidden; render(); break;
  }
});

document.addEventListener('dblclick', (e) => {
  const card = e.target.closest('.card[data-game]');
  if (card && $('#tv').hidden) play(card.dataset.game);
});
document.addEventListener('contextmenu', (e) => {
  const card = e.target.closest('[data-game]');
  if (card && $('#tv').hidden) { e.preventDefault(); openCtx(card.dataset.game, e.clientX, e.clientY); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'libSearch') {
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const inp = $('#libSearch'); inp.focus(); inp.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'libSort') { ui.sort = e.target.value; render(); }
  if (e.target.id === 'sgdbKey') { call('settings:set', { sgdbKey: e.target.value.trim() }).then(() => { if (e.target.value.trim()) toast('Clé enregistrée. Recherche des images…', 'ok'); }); }
});

document.addEventListener('keydown', (e) => {
  if (!$('#tv').hidden) return tvKey(e);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openPalette(); }
  if (e.key === 'F11') { e.preventDefault(); return enterTV(); }
  if (e.key === 'Escape') { if (!$('#ctx').hidden) return closeCtx(); if (modalState) return closeModal(); }
  if (e.target.matches('input, select, textarea') || modalState) return;
  if (ui.view === 'home' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const list = $$('.rows .row:first-child .card[data-game]').map((c) => c.dataset.game);
    const i = list.indexOf(featured()?.id);
    const n = Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    if (list[n]) { ui.heroId = list[n]; render(); $('.card.selected')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
  }
  if (ui.view === 'home' && e.key === 'Enter' && featured()) play(featured().id);
});

$('#searchBtn').onclick = openPalette;
$('#tvBtn').onclick = () => enterTV();

// --- Mode TV -------------------------------------------------------------------------------------
const tv = { tab: 0, idx: 0, menu: null, fullscreenSet: false, launching: null };
function tvTabs() {
  const list = visible();
  const tabs = [];
  const recent = list.filter((g) => g.last).sort(byRecent);
  tabs.push({ key: 'recent', label: recent.length ? 'Récents' : 'Ta collection', games: recent.length ? recent.slice(0, 30) : [...list].sort(byRecent) });
  const fav = list.filter((g) => g.favorite).sort(byRecent);
  if (fav.length) tabs.push({ key: 'fav', label: 'Favoris', games: fav });
  for (const p of ORDER) {
    const gs = list.filter((g) => g.platform === p).sort(byRecent);
    if (gs.length) tabs.push({ key: p, label: plat(p).label, games: gs });
  }
  if (tabs.length > 2) tabs.push({ key: 'all', label: 'Tous', games: [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr')) });
  return tabs;
}

function enterTV() {
  closeModal(); closeCtx();
  const el = $('#tv');
  el.hidden = false;
  tv.tab = 0; tv.idx = 0; tv.menu = null;
  const f = featured();
  const tabs = tvTabs();
  if (f && tabs[0]) { const i = tabs[0].games.findIndex((g) => g.id === f.id); if (i >= 0) tv.idx = i; }
  api.call('win:fullscreen', true).catch(() => {});
  tv.fullscreenSet = true;
  renderTV();
}
function exitTV() {
  $('#tv').hidden = true;
  $('#tv').innerHTML = '';
  if (tv.fullscreenSet) api.call('win:fullscreen', false).catch(() => {});
  tv.fullscreenSet = false;
  const g = tvCurrent();
  if (g) ui.heroId = g.id;
  render();
}
function tvCurrent() { const t = tvTabs()[tv.tab]; return t ? t.games[tv.idx] : null; }

function tvThumb(g) {
  const p = plat(g.platform);
  const wide = g.art.hero || g.art.header;
  if (wide) return `<div class="thumb"><img src="${esc(wide)}" draggable="false"><div class="fb"><b>${esc(g.name)}</b></div></div>`;
  if (g.art.cover) return `<div class="thumb"><div class="bgblur" style="background-image:url('${esc(g.art.cover)}')"></div><div class="port"><img src="${esc(g.art.cover)}" draggable="false"></div><div class="fb"><b>${esc(g.name)}</b></div></div>`;
  return `<div class="thumb noimg" style="--c:${p.color}"><div class="fb"><b>${esc(g.name)}</b></div></div>`;
}

function renderTV(keepShelf) {
  const el = $('#tv');
  const tabs = tvTabs();
  if (!tabs.length || !tabs[0].games.length) {
    el.innerHTML = `<div class="tv-empty"><div><h2>Aucun jeu pour l'instant</h2><p>Ajoute des jeux depuis le mode bureau, puis reviens ici.</p><br><button class="btn primary" id="tvQuit">Quitter le mode TV</button></div></div>`;
    $('#tvQuit').onclick = exitTV;
    return;
  }
  tv.tab = Math.min(tv.tab, tabs.length - 1);
  const tab = tabs[tv.tab];
  tv.idx = Math.max(0, Math.min(tv.idx, tab.games.length - 1));
  const g = tab.games[tv.idx];

  if (!keepShelf || !$('.tv-track', el) || el.dataset.tab !== tab.key || el.dataset.n !== String(tab.games.length)) {
    el.dataset.tab = tab.key; el.dataset.n = String(tab.games.length);
    el.innerHTML = `<div class="tv-bg" id="tvBgA"></div><div class="tv-bg" id="tvBgB" style="opacity:0"></div><div class="tv-shade"></div>
      <div class="tv-cover" id="tvCover" style="opacity:0"><img alt=""></div>
      <div class="tv-top"><div class="brand"><span class="brand-mark"></span>HMZ</div><div class="tv-clock" id="tvClock"></div></div>
      <div class="tv-info" id="tvInfo"></div>
      <div class="tv-shelf">
        <div class="tv-tabs"><span class="lb">LB</span>${tabs.map((t, i) => `<button class="${i === tv.tab ? 'on' : ''}" data-tvtab="${i}">${esc(t.label)}</button>`).join('')}<span class="lb">RB</span><span class="count">${tab.games.length} jeu${tab.games.length > 1 ? 'x' : ''}</span></div>
        <div class="tv-track" id="tvTrack">${tab.games.map((x, i) => `<button class="tv-card" data-tvi="${i}" style="--c:${plat(x.platform).color}">${tvThumb(x)}<div class="nm">${esc(x.name)}</div><div class="sb"><i class="pdot"></i>${esc(plat(x.platform).label)}${x.minutes >= 1 ? ` · ${fmtTime(x.minutes)}` : ''}${x.running ? ' · En cours' : ''}</div></button>`).join('')}</div>
      </div>
      <div class="tv-foot">
        <span><i class="k a">A</i>Jouer</span><span><i class="k">←→</i>Choisir</span><span><i class="k">LB RB</i>Catégorie</span><span><i class="k y">Y</i>Favori</span><span><i class="k">☰</i>Options</span>
        <span class="grow"></span><span class="pad" id="tvPad"></span><span><i class="k">Select + Start</i>Quitter un jeu</span><span><i class="k b">B</i>Quitter</span>
      </div>`;
    tvBgShown = 'A'; tvBgUrl = null;
    tvClock();
  }
  $$('.tv-card', el).forEach((c, i) => c.classList.toggle('on', i === tv.idx));
  const on = $('.tv-card.on', el);
  if (on) {
    const track = $('#tvTrack');
    const left = on.offsetLeft - 80;
    track.scrollTo({ left: Math.max(0, left - track.clientWidth * 0.0), behavior: 'smooth' });
  }

  const h = heroInfo(g);
  tvSetBg(h);
  const cov = $('#tvCover');
  if (h && h.cover) { cov.style.display = ''; $('img', cov).src = h.cover; cov.style.opacity = 1; } else cov.style.opacity = 0;

  const meta = metaParts(g).map(esc).join('<span class="sep">·</span>');
  $('#tvInfo').innerHTML = `
    <div class="kicker${g.running ? ' live' : ''}"><i class="dot"></i>${g.running ? 'En cours' : (g.emuReady ? 'Prêt à jouer' : 'Émulateur à installer')}</div>
    ${g.art.logo ? `<img class="tv-logo" src="${esc(g.art.logo)}" alt="" data-title="${esc(g.name)}">` : `<h1 class="tv-title${g.name.length > 20 ? ' long' : ''}">${esc(g.name)}</h1>`}
    <div class="tv-meta">${meta}</div>
    <div class="tv-acts"><button class="btn primary play focus" data-tvplay>${ICON.play}Jouer</button><button class="btn round" data-tvmenu title="Options">${ICON.dots}</button></div>`;

  if (tv.menu) drawTvMenu();
}

let tvBgShown = 'A', tvBgUrl = null;
function tvSetBg(h) {
  const url = h ? h.url : null;
  if (url === tvBgUrl) return;
  tvBgUrl = url;
  const next = tvBgShown === 'A' ? 'B' : 'A';
  const a = $('#tvBg' + tvBgShown), b = $('#tvBg' + next);
  if (!a || !b) return;
  b.className = 'tv-bg' + (h && h.blur ? ' blur' : '');
  b.style.backgroundImage = url ? `url('${url.replace(/'/g, "\\'")}')` : 'none';
  b.style.opacity = '';
  b.style.opacity = h && h.blur ? '.7' : '1';
  a.style.opacity = '0';
  tvBgShown = next;
}

function tvClock() {
  const c = $('#tvClock');
  if (c) { const d = new Date(); c.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
}
setInterval(tvClock, 10000);

function tvMove(dx) {
  const tab = tvTabs()[tv.tab];
  if (!tab) return;
  tv.idx = Math.max(0, Math.min(tab.games.length - 1, tv.idx + dx));
  renderTV(true);
}
function tvTab(d) {
  const n = tvTabs().length;
  tv.tab = (tv.tab + d + n) % n;
  tv.idx = 0;
  renderTV();
}

function tvMenuItems() {
  const g = tvCurrent();
  if (!g) return [];
  const items = [{ label: 'Jouer', fn: () => play(g.id) }];
  if ((g.platform === 'switch' || g.platform === 'switch2') && g.source !== 'steam') {
    for (const e of S.emulators.filter((x) => x.id === 'eden' || x.id === 'lichii')) {
      if (e.id !== g.emu) items.push({ label: `Lancer avec ${e.name}`, fn: () => play(g.id, e.id) });
    }
  }
  items.push({ label: g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris', fn: () => api.call('game:update', g.id, { favorite: !g.favorite }) });
  items.push({ label: 'Quitter le mode TV', fn: exitTV });
  items.push({ label: 'Fermer HMZ', fn: () => api.call('win:close') });
  return items;
}
function drawTvMenu() {
  $('.tv-menu')?.remove();
  if (!tv.menu) return;
  const items = tvMenuItems();
  const m = document.createElement('div');
  m.className = 'tv-menu';
  m.innerHTML = items.map((it, i) => `<button class="${i === tv.menu.i ? 'on' : ''}" data-tvmi="${i}">${esc(it.label)}</button>`).join('');
  $('#tv').appendChild(m);
}
function tvMenuOpen() { tv.menu = { i: 0 }; drawTvMenu(); }
function tvMenuClose() { tv.menu = null; drawTvMenu(); }
function tvMenuAct() { const it = tvMenuItems()[tv.menu.i]; tvMenuClose(); it && it.fn(); }

function tvMessage(text) {
  const el = document.createElement('div');
  el.className = 'tv-launch';
  el.innerHTML = `<div><h2 style="font-size:34px;max-width:900px">${esc(text)}</h2><p style="color:rgba(255,255,255,.6);font-size:17px">Appuie sur B pour quitter le mode TV.</p></div>`;
  $('#tv').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function tvLaunching(g) {
  const el = document.createElement('div');
  el.className = 'tv-launch';
  el.innerHTML = `<div><div class="spin"></div><h2>${esc(g.name)}</h2><p style="color:rgba(255,255,255,.6);font-size:17px">Lancement…</p></div>`;
  $('#tv').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function tvAction(a) {
  if (tv.menu) {
    const n = tvMenuItems().length;
    if (a === 'up') { tv.menu.i = (tv.menu.i - 1 + n) % n; drawTvMenu(); }
    else if (a === 'down') { tv.menu.i = (tv.menu.i + 1) % n; drawTvMenu(); }
    else if (a === 'ok') tvMenuAct();
    else if (a === 'back' || a === 'menu') tvMenuClose();
    return;
  }
  const g = tvCurrent();
  switch (a) {
    case 'left': tvMove(-1); break;
    case 'right': tvMove(1); break;
    case 'up': case 'lb': tvTab(-1); break;
    case 'down': case 'rb': tvTab(1); break;
    case 'ok': if (g) play(g.id); break;
    case 'fav': if (g) api.call('game:update', g.id, { favorite: !g.favorite }); break;
    case 'menu': tvMenuOpen(); break;
    case 'back': exitTV(); break;
  }
}

function tvKey(e) {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', F11: 'back', f: 'fav', F: 'fav', m: 'menu', M: 'menu', ContextMenu: 'menu', PageUp: 'lb', PageDown: 'rb', q: 'lb', e: 'rb' };
  const a = map[e.key];
  if (a) { e.preventDefault(); tvAction(a); }
}

$('#tv').addEventListener('click', (e) => {
  const c = e.target.closest('[data-tvi]');
  if (c) { tv.idx = +c.dataset.tvi; renderTV(true); return; }
  const t = e.target.closest('[data-tvtab]');
  if (t) { tv.tab = +t.dataset.tvtab; tv.idx = 0; renderTV(); return; }
  if (e.target.closest('[data-tvplay]')) return tvAction('ok');
  if (e.target.closest('[data-tvmenu]')) return tvMenuOpen();
  const mi = e.target.closest('[data-tvmi]');
  if (mi) { tv.menu.i = +mi.dataset.tvmi; tvMenuAct(); return; }
  if (tv.menu && !e.target.closest('.tv-menu')) tvMenuClose();
});
$('#tv').addEventListener('dblclick', (e) => { if (e.target.closest('[data-tvi]')) tvAction('ok'); });
$('#tv').addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) tvMove((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: true });
let cursorTimer = null;
$('#tv').addEventListener('mousemove', () => { $('#tv').classList.remove('hide-cursor'); clearTimeout(cursorTimer); cursorTimer = setTimeout(() => $('#tv').classList.add('hide-cursor'), 2500); });

// Manette (API Gamepad, disposition standard Xbox / PlayStation / Switch Pro).
const pad = { held: {}, next: {} };
function pollPad() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const p = pads[0];
  const label = $('#tvPad');
  if (label) label.textContent = p || padKinds.length ? '● Manette connectée' : '';
  if (p) {
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes || [];
    const st = {
      left: b(14) || ax[0] < -0.55, right: b(15) || ax[0] > 0.55,
      up: b(12) || ax[1] < -0.6, down: b(13) || ax[1] > 0.6,
      ok: b(0), back: b(1), menu: b(2) || b(8), fav: b(3), lb: b(4), rb: b(5), start: b(9) || b(16),
    };
    const now = performance.now();
    for (const [k, v] of Object.entries(st)) {
      if (v && !pad.held[k]) {
        pad.held[k] = true;
        pad.next[k] = now + 380;
        onPad(k);
      } else if (v && ['left', 'right', 'up', 'down'].includes(k) && now >= pad.next[k]) {
        pad.next[k] = now + (k === 'left' || k === 'right' ? 110 : 260);
        onPad(k);
      } else if (!v) pad.held[k] = false;
    }
  }
  requestAnimationFrame(pollPad);
}
function onPad(k) {
  if (!document.hasFocus()) return;
  if ($('#tv').hidden) {
    if (k === 'start') enterTV();
    return;
  }
  tvAction(k === 'start' ? 'menu' : k);
}
requestAnimationFrame(pollPad);

// --- Démarrage ------------------------------------------------------------------------------------
api.on('state:changed', (st) => {
  S = st;
  if (modalState && modalState.detail) refreshModal();
  if (!$('#tv').hidden) renderTV(true);
  const view = $('#view');
  if (!view.querySelector('input:focus')) render();
});
api.on('tv:enter', () => { if ($('#tv').hidden) enterTV(); });
api.on('pad:kinds', (k) => { padKinds = k || []; if (ui.view === 'settings' && !modalState) render(); });
api.on('scan:progress', (t) => { $('#scanStatus').textContent = t || ''; });
api.on('emu:progress', (p) => {
  if (p.step === null) { delete emuProg[p.id]; } else emuProg[p.id] = p;
  if (ui.view === 'emulators') {
    const e = S.emulators.find((x) => x.id === p.id);
    const el = $(`.emu[data-emu="${p.id}"]`);
    if (e && el) { const tmp = document.createElement('div'); tmp.innerHTML = emuCard(e); el.replaceWith(tmp.firstElementChild); }
  }
});
api.on('toast', (t) => toast(t.text, t.kind));
api.on('update:ready', (u) => {
  const el = document.createElement('div');
  el.className = 'toast ok update';
  el.innerHTML = `<div><b>Mise à jour ${esc(u.version)} prête</b><br><span style="color:var(--muted);font-weight:500">Redémarre HMZ pour l'installer.</span></div><button class="btn primary sm">Redémarrer</button><button class="icon-btn" title="Plus tard">${ICON.x}</button>`;
  el.querySelector('.btn').onclick = () => api.call('app:restart');
  el.querySelector('.icon-btn').onclick = () => el.remove();
  $('#toasts').appendChild(el);
});
api.on('window:state', (s) => {
  if (s.fullscreen === false && !$('#tv').hidden && tv.fullscreenSet) { tv.fullscreenSet = false; exitTV(); }
});

(async function init() {
  S = await api.call('state:get');
  padKinds = S.padKinds || [];
  render();
  if (S.settings.startInTV) enterTV();
})();
