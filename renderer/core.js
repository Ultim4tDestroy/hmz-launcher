/* HMZ Launcher — interface */
'use strict';

const api = window.hmz;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = null;                       // état reçu du processus principal
const ui = { emu: { q: '', fam: 'all', st: 'all', sort: 'console' }, view: 'home', heroId: null, coll: { type: 'all' }, sort: 'recent', q: '', showHidden: false, closed: { genres: false }, openColl: {} };
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
const ORDER = ['switch2', 'switch', 'wiiu', 'wii', 'gc', '3ds', 'ds', 'n64', 'snes', 'nes', 'gba', 'gb',
  'ps4', 'ps3', 'ps2', 'ps1', 'vita', 'psp', 'x360', 'xbox', 'dc', 'md', 'pc', 'mobile'];
const FAMILY = { nintendo: 'Nintendo', playstation: 'PlayStation', xbox: 'Xbox', sega: 'Sega et rétro' };

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
  palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.2-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.5-9-7.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/></svg>',
  shelf: '<svg viewBox="0 0 24 24"><path d="M3 20h18M3 12h18"/><rect x="5" y="4" width="3" height="8" rx=".5"/><rect x="9.5" y="5" width="3" height="7" rx=".5"/><rect x="14" y="14" width="3" height="6" rx=".5"/><rect x="6" y="14.5" width="4" height="5.5" rx=".5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  tagic: '<svg viewBox="0 0 24 24"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 10v4M12 17h.01"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

// --- Thèmes ----------------------------------------------------------------------------
const THEMES = [
  { id: 'foret', label: 'Forêt', sub: 'Par défaut', c: ['#0a0d0b', '#101512', '#f5ead0', '#5fd38d'] },
  { id: 'minuit', label: 'Minuit', sub: 'Bleu nuit', c: ['#060912', '#0f1729', '#8fb4ff', '#5fd3c0'] },
  { id: 'neon', label: 'Néon', sub: 'Cyberpunk', c: ['#06050a', '#120f1e', '#ff3ea5', '#3ef0ff'] },
  { id: 'sakura', label: 'Sakura', sub: 'Rose doux', c: ['#120a10', '#21131d', '#ffb3cf', '#9be3b5'] },
  { id: 'lave', label: 'Lave', sub: 'Orange chaud', c: ['#0d0907', '#1c1410', '#ff7a3d', '#ffcb5c'] },
  { id: 'aurore', label: 'Aurore', sub: 'Vert polaire', c: ['#041110', '#0c2220', '#5ef0c6', '#b4f25e'] },
  { id: 'retro', label: 'Rétro', sub: 'Console portable', c: ['#0f1a0f', '#1a2c1a', '#9bbc0f', '#c8e86a'] },
  { id: 'oled', label: 'OLED', sub: 'Noir pur', c: ['#000000', '#0a0a0a', '#ffffff', '#4ade80'] },
  { id: 'glace', label: 'Glace', sub: 'Clair', c: ['#e9eef3', '#ffffff', '#1f6feb', '#16a34a'] },
];
const ACCENTS = ['#f5ead0', '#8fb4ff', '#ff3ea5', '#ffb3cf', '#ff7a3d', '#5ef0c6', '#9bbc0f', '#c084fc', '#f6c344', '#ff5a4e', '#ffffff'];

function inkFor(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#141414' : '#ffffff';
}
function applyAppearance(st = S && S.settings) {
  if (!st) return;
  const root = document.documentElement;
  if (st.theme && st.theme !== 'foret') root.dataset.theme = st.theme; else delete root.dataset.theme;
  if (st.accent) { root.style.setProperty('--cream', st.accent); root.style.setProperty('--cream-ink', inkFor(st.accent)); }
  else { root.style.removeProperty('--cream'); root.style.removeProperty('--cream-ink'); }
  root.style.setProperty('--card-min', `${st.cardSize || 168}px`);
}
function setAppearance(patch) {
  Object.assign(S.settings, patch);
  applyAppearance();
  api.call('settings:set', patch).catch(() => {});
}
function themeCards() {
  const cur = S.settings.theme || 'foret';
  return `<div class="theme-grid">${THEMES.map((t) => `<button class="theme-card${cur === t.id ? ' on' : ''}" data-theme-pick="${t.id}">
    <div class="theme-prev" style="background:linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})">
      <i class="tp-bar" style="background:${t.id === 'glace' ? '#111821' : '#f4f0e6'}"></i><i class="tp-line" style="background:${t.id === 'glace' ? '#111821' : '#f4f0e6'}"></i>
      <i class="tp-btn" style="background:${t.c[2]}"></i>
      <span class="tp-cards"><i style="background:${t.c[2]}"></i><i style="background:${t.c[3]}"></i><i style="background:${t.id === 'glace' ? '#c9d3de' : '#ffffff33'}"></i></span>
    </div>
    <div class="theme-name">${esc(t.label)}<small>${esc(t.sub)}</small></div></button>`).join('')}</div>`;
}
function accentSwatches() {
  const cur = S.settings.accent || '';
  return `<div class="swatches"><button class="swatch auto${!cur ? ' on' : ''}" data-accent="" title="Couleur du thème"></button>${ACCENTS.map((c) => `<button class="swatch${cur === c ? ' on' : ''}" data-accent="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>`;
}
function toggleThemePop() {
  const old = $('.theme-pop');
  if (old) { old.remove(); return; }
  const el = document.createElement('div');
  el.className = 'theme-pop';
  el.innerHTML = `<h4>Thème</h4>${themeCards()}<h4 style="margin-top:14px">Couleur d'accent</h4>${accentSwatches()}`;
  document.body.appendChild(el);
}

// --- Ambiance : image floutée et couleur du jeu sélectionné ------------------------------
const colorCache = new Map(Object.entries((() => { try { return JSON.parse(localStorage.getItem('hmzColors') || '{}'); } catch { return {}; } })()));
function hexToRgb(h) { const n = parseInt(String(h).replace('#', ''), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
async function colorFor(url) {
  if (!url) return null;
  if (colorCache.has(url)) return colorCache.get(url);
  let src = null;
  try { src = await api.call('art:dataurl', url); } catch {}
  if (!src) return null;
  const img = new Image();
  img.src = src;
  try { await img.decode(); } catch { return null; }
  const c = document.createElement('canvas'); c.width = c.height = 36;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 36, 36);
  const d = x.getImageData(0, 0, 36, 36).data;
  let R = 0, G = 0, B = 0, W = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [, sat, lig] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const w = sat * sat * (1 - Math.abs(lig - .5) * 1.8) + .002;
    if (w <= 0) continue;
    R += d[i] * w; G += d[i + 1] * w; B += d[i + 2] * w; W += w;
  }
  if (!W) return null;
  let [h, sat, lig] = rgbToHsl(R / W, G / W, B / W);
  sat = Math.min(.85, Math.max(.5, sat * 1.25)); lig = Math.min(.62, Math.max(.48, lig));
  const rgb = hslToRgb(h, sat, lig).join(', ');
  colorCache.set(url, rgb);
  try { localStorage.setItem('hmzColors', JSON.stringify(Object.fromEntries([...colorCache].slice(-400)))); } catch {}
  return rgb;
}
let ambUrl = null, ambSide = 'A', ambGame = null;
function setAmbientFor(g) {
  if (!g || !$('#ambA')) return;
  ambGame = g.id;
  const url = g.art.hero || g.art.cover || g.art.header || null;
  if (url !== ambUrl) {
    ambUrl = url;
    const next = ambSide === 'A' ? 'B' : 'A';
    const a = $('#amb' + ambSide), b = $('#amb' + next);
    b.style.backgroundImage = url ? `url("${url.replace(/"/g, '%22')}")` : 'none';
    b.classList.toggle('on', !!url);
    a.classList.remove('on');
    ambSide = next;
  }
  const fallback = hexToRgb(plat(g.platform).color);
  const key = g.art.cover || g.art.hero || g.art.header;
  const cached = key && colorCache.get(key);
  document.documentElement.style.setProperty('--amb', cached || fallback);
  if (key && !cached) colorFor(key).then((rgb) => { if (rgb && ambGame === g.id) document.documentElement.style.setProperty('--amb', rgb); });
}
function moveNavInd() {
  const ind = $('#navInd'), on = $('.topnav button.active');
  if (!ind) return;
  if (!on) { ind.style.width = '0px'; ind.style.opacity = '0'; return; }
  ind.style.opacity = '1';
  ind.style.left = on.offsetLeft + 'px';
  ind.style.width = on.offsetWidth + 'px';
}
addEventListener('resize', () => moveNavInd());
let hoverT = null;
document.addEventListener('mouseover', (e) => {
  const sl = e.target.closest && e.target.closest('.slot[data-game]');
  if (!sl) return;
  clearTimeout(hoverT);
  hoverT = setTimeout(() => { const g = gameById(sl.dataset.game); if (g) setAmbientFor(g); }, 280);
});

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
  const SRC = { steam: 'Steam', epic: 'Epic Games', gog: 'GOG', ubisoft: 'Ubisoft Connect', battlenet: 'Battle.net', xbox: 'Xbox', ea: 'EA', riot: 'Riot Games', netmarble: 'Netmarble', bluestacks: 'BlueStacks', launcher: 'Launcher', installed: 'Installé', manual: 'Ajouté à la main' };
  if (SRC[g.source]) return SRC[g.source];
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
  // Pas de jaquette mais un logo : carte avec le logo sur le fond du jeu.
  if (!src && g.art.logo) {
    const bg = g.art.hero;
    return `<div class="cover logo-card" style="--c:${p.color}">
      ${bg ? `<div class="lc-bg" style="background-image:url('${esc(bg)}')"></div>` : ''}<div class="lc-shade"></div>
      <img class="lc-logo" src="${esc(g.art.logo)}" loading="lazy" draggable="false">
      <div class="fb"><span class="fb-plat">${esc(p.label)}</span><span class="fb-name">${esc(g.name)}</span></div>
      <span class="lc-plat">${esc(p.label)}</span>
      ${extra}
    </div>`;
  }
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
    ${g.running ? '<span class="live"><i class="dot"></i>En cours</span>' : g.notInstalled ? '<span class="noemu">Pas installé</span>' : (!g.emuReady ? '<span class="noemu">Émulateur à installer</span>' : '')}`;
  return `<button class="card${selected ? ' selected' : ''}${g.notInstalled ? ' not-inst' : ''}" data-game="${esc(g.id)}" draggable="true" style="--c:${plat(g.platform).color}">
    ${coverHTML(g, extra)}
    <div class="card-name">${esc(g.name)}</div>
    <div class="card-sub"><i class="pdot"></i>${esc(plat(g.platform).label)}${g.minutes >= 1 ? ` · ${fmtTime(g.minutes)}` : ''}</div>
  </button>`;
}
// --- Étagère -------------------------------------------------------------------------------
const BOX = {
  switch2: { w: 146, h: 232, d: 17, band: 'SWITCH 2' },
  switch: { w: 146, h: 232, d: 17, band: 'SWITCH' },
  '3ds': { w: 176, h: 192, d: 15, band: '3DS' },
  ds: { w: 176, h: 192, d: 15, band: 'DS' },
  pc: { w: 156, h: 234, d: 19, band: null },
  mobile: { w: 118, h: 236, d: 10, band: null },
  wiiu: { w: 150, h: 208, d: 15, band: 'Wii U' },
  wii: { w: 150, h: 208, d: 15, band: 'Wii' },
  gc: { w: 150, h: 206, d: 16, band: 'GAMECUBE' },
  n64: { w: 214, h: 152, d: 34, band: 'NINTENDO 64' },
  snes: { w: 214, h: 152, d: 30, band: 'SUPER NINTENDO' },
  nes: { w: 150, h: 210, d: 28, band: 'NES' },
  gba: { w: 150, h: 150, d: 22, band: 'GAME BOY ADVANCE' },
  gb: { w: 138, h: 138, d: 22, band: 'GAME BOY' },
  ps4: { w: 150, h: 186, d: 14, band: 'PS4' },
  ps3: { w: 150, h: 174, d: 14, band: 'PS3' },
  ps2: { w: 150, h: 212, d: 15, band: 'PlayStation 2' },
  ps1: { w: 182, h: 160, d: 12, band: 'PlayStation' },
  vita: { w: 128, h: 160, d: 12, band: 'PS VITA' },
  psp: { w: 118, h: 206, d: 14, band: 'PSP' },
  x360: { w: 150, h: 210, d: 15, band: 'XBOX 360' },
  xbox: { w: 150, h: 210, d: 15, band: 'XBOX' },
  dc: { w: 182, h: 160, d: 12, band: 'Dreamcast' },
  md: { w: 150, h: 210, d: 18, band: 'MEGA DRIVE' },
};
const SRC_COLOR = { steam: '#66c0f4', epic: '#e8e8e8', gog: '#b46cff', ubisoft: '#2f8cff', battlenet: '#148eff', xbox: '#3fbf4a', ea: '#ff4747', riot: '#ff4655', netmarble: '#ffc93c', bluestacks: '#3ddc84', launcher: '#c084fc', installed: '#f6c344', manual: '#7fd1b9' };
function boxDims(g) {
  const b = BOX[g.platform] || BOX.pc;
  const k = (S.settings.cardSize || 168) / 168;
  return { ...b, w: Math.round(b.w * k), h: Math.round(b.h * k), d: Math.max(10, Math.round(b.d * k)) };
}
function boxHTML(g, { selected = false } = {}) {
  const b = boxDims(g);
  const kind = BOX[g.platform] ? g.platform : 'pc';
  const bg = g.art.cover || g.art.hero || g.art.header || '';
  const genres = (g.genres || []).slice(0, 3).join(', ');
  return `<div class="slot k-${kind}${selected ? ' selected' : ''}${g.notInstalled ? ' not-inst' : ''}" data-game="${esc(g.id)}" draggable="true" tabindex="0" role="button" aria-label="${esc(g.name)}"
    style="--bw:${b.w}px;--bh:${b.h}px;--bd:${b.d}px;--src:${SRC_COLOR[g.source] || '#7aa2ff'};--c:${plat(g.platform).color}">
    <div class="box">
      <div class="face f-front">
        ${b.band ? `<div class="band"><i class="pip"></i>${b.band}</div>` : ''}
        <div class="art">${coverHTML(g)}</div>
        ${g.favorite ? `<span class="badge-fav">${ICON.star}</span>` : ''}
        ${g.running ? '<span class="badge-live"><i class="dot"></i>En cours</span>' : ''}
        ${g.notInstalled ? `<span class="badge-own">${ICON.download}Pas installé</span>` : ''}
      </div>
      <div class="face f-back"><div class="back-in">
        ${bg ? `<div class="bg" style="background-image:url('${esc(bg)}')"></div>` : ''}
        <h4>${esc(g.name)}</h4>
        <dl><dt>Temps de jeu</dt><dd>${g.minutes >= 1 ? fmtTime(g.minutes) : '—'}</dd><dt>Dernière partie</dt><dd>${g.last ? esc(fmtLast(g.last)) : 'jamais'}</dd>${g.platform !== 'pc' ? `<dt>Émulateur</dt><dd>${esc((S.emulators.find((e) => e.id === g.emu) || {}).name || '—')}</dd>` : ''}</dl>
        ${genres ? `<div class="gl">${esc(genres)}</div>` : ''}
        <div class="acts"><button class="go" data-play="${esc(g.id)}">${playIcon(g)}${playLabel(g)}</button><button class="info" data-detail="${esc(g.id)}" title="Voir la fiche">${ICON.info}</button></div>
      </div></div>
      <div class="face f-spine"><span class="sp-title">${esc(g.name)}</span><span class="sp-plat">${esc(plat(g.platform).label)}</span></div>
      <div class="face f-side"></div>
      <div class="face f-top"></div>
    </div>
  </div>`;
}
function shelfHTML({ title, color, games, more, selectedId }) {
  return `<section class="shelf">
    <div class="shelf-head"><h2>${color ? `<i class="sw" style="--c:${color}"></i>` : ''}${esc(title)}</h2><span class="count">${games.length} jeu${games.length > 1 ? 'x' : ''}</span>${more ? `<button class="more" data-seeall="${more}">Tout voir</button>` : ''}</div>
    <div class="shelf-track"><div class="shelf-inner">${games.map((g) => boxHTML(g, { selected: g.id === selectedId })).join('')}</div></div>
  </section>`;
}
function shelfRows(games, avail) {
  const gap = 26, pad = 44, rows = [];
  let row = [], width = pad;
  for (const g of games) {
    const w = boxDims(g).w;
    if (row.length && width + gap + w > avail) { rows.push(row); row = []; width = pad; }
    width += (row.length ? gap : 0) + w;
    row.push(g);
  }
  if (row.length) rows.push(row);
  return rows;
}
function libShelvesHTML(list) {
  const avail = Math.max(400, ($('#view') ? $('#view').clientWidth : innerWidth - 80) - 260 - 88);
  const groups = ui.coll.type === 'platform' ? [[ui.coll.key, list]] : ORDER.map((p) => [p, list.filter((g) => g.platform === p)]).filter(([, l]) => l.length);
  return `<div class="lib-shelves">${groups.map(([p, l]) => `<section class="shelf">
    ${ui.coll.type !== 'platform' ? `<div class="shelf-head"><h2><i class="sw" style="--c:${plat(p).color}"></i>${esc(plat(p).label)}</h2><span class="count">${l.length} jeu${l.length > 1 ? 'x' : ''}</span></div>` : ''}
    ${shelfRows(l, avail).map((r) => `<div class="shelf-track"><div class="shelf-inner">${r.map((g) => boxHTML(g)).join('')}</div></div>`).join('')}
  </section>`).join('')}</div>`;
}
function toggleFlip(slot) {
  const on = !slot.classList.contains('flipped');
  $$('.slot.flipped').forEach((x) => x.classList.remove('flipped'));
  if (on) slot.classList.add('flipped');
}

const addCardHTML = () => `<button class="card add" data-action="add-game"><div class="cover"><div><span class="plus">${ICON.plus}</span>Ajouter un jeu<small style="color:var(--faint);font-weight:500">PC ou console</small></div></div></button>`;

// Une image chargée apparaît en fondu.
document.addEventListener('load', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  img.classList.add('loaded');
  const c = img.closest('.cover');
  if (c) c.classList.add('ready');
}, true);

// Une image qui ne charge pas : on affiche la version de secours.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  if (img.dataset.title) {
    const h = document.createElement('h1');
    h.className = img.classList.contains('tv-logo') ? 'tv-title' : img.classList.contains('d-logo') ? 'd-title' : 'hero-title';
    if (img.dataset.title.length > 20) h.classList.add('long');
    h.textContent = img.dataset.title;
    img.replaceWith(h);
    return;
  }
  const thumb = img.closest('.thumb');
  if (thumb) { thumb.classList.add('noimg'); $$('img', thumb).forEach((i) => i.remove()); $('.bgblur', thumb)?.remove(); return; }
  const cover = img.closest('.cover');
  if (cover) { cover.classList.add('noimg', 'ready'); cover.classList.remove('logo-card'); img.remove(); return; }
  const big = img.closest('.hero-cover, .tv-cover');
  if (big) big.style.display = 'none';
}, true);

// --- Données ---------------------------------------------------------------------------
// Erreurs de la fenêtre : notées dans le journal de HMZ.
window.addEventListener('error', (e) => { try { api.call('log:error', `${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`); } catch {} });
window.addEventListener('unhandledrejection', (e) => { try { api.call('log:error', `Promesse : ${e.reason && e.reason.message ? e.reason.message : e.reason}`); } catch {} });

const visible = () => S.games.filter((g) => (ui.showHidden || !g.hidden) && !g.notInstalled);
const owned = () => S.games.filter((g) => (ui.showHidden || !g.hidden) && g.notInstalled);
const playLabel = (g) => (g.notInstalled ? 'Installer' : g.emuReady ? 'Jouer' : 'Installer et jouer');
const playIcon = (g) => (g.notInstalled ? ICON.download : ICON.play);
const byRecent = (a, b) => (b.last || 0) - (a.last || 0) || (b.addedAt || 0) - (a.addedAt || 0) || a.name.localeCompare(b.name, 'fr');
function gameById(id) { return S.games.find((g) => g.id === id); }
function featured() {
  const list = visible();
  return gameById(ui.heroId) || [...list].sort(byRecent)[0] || null;
}

// --- Rendu -------------------------------------------------------------------------------
const VIEWS = { home: () => renderHome(), library: () => renderLibrary(), emulators: () => renderEmulators(), stats: () => renderStats(), settings: () => renderSettings() };
function render() {
  if (!S) return;
  $$('.titlebar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  moveNavInd();
  if (!modalState || !modalState.detail) setAmbientFor(featured());
  const view = $('#view');
  const st = view.scrollTop;
  view.innerHTML = VIEWS[ui.view]();
  view.scrollTop = st;
  if (!$('#tv').hidden) renderTV(true);
}
function go(v) {
  const run = () => { ui.view = v; $('#view').scrollTop = 0; render(); };
  if (document.startViewTransition && ui.view !== v && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Changer de page très vite annule l'animation précédente : ce n'est pas une erreur.
    const t = document.startViewTransition(run);
    for (const p of [t.ready, t.finished, t.updateCallbackDone]) if (p && p.catch) p.catch(() => {});
  }
  else run();
}
