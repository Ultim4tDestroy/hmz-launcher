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
  const SRC = { steam: 'Steam', epic: 'Epic Games', riot: 'Riot Games', netmarble: 'Netmarble', bluestacks: 'BlueStacks', launcher: 'Launcher', installed: 'Installé', manual: 'Ajouté à la main' };
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
    ${g.running ? '<span class="live"><i class="dot"></i>En cours</span>' : (!g.emuReady ? '<span class="noemu">Émulateur à installer</span>' : '')}`;
  return `<button class="card${selected ? ' selected' : ''}" data-game="${esc(g.id)}" draggable="true" style="--c:${plat(g.platform).color}">
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
const SRC_COLOR = { steam: '#66c0f4', epic: '#e8e8e8', riot: '#ff4655', netmarble: '#ffc93c', bluestacks: '#3ddc84', launcher: '#c084fc', installed: '#f6c344', manual: '#7fd1b9' };
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
  return `<div class="slot k-${kind}${selected ? ' selected' : ''}" data-game="${esc(g.id)}" draggable="true" tabindex="0" role="button" aria-label="${esc(g.name)}"
    style="--bw:${b.w}px;--bh:${b.h}px;--bd:${b.d}px;--src:${SRC_COLOR[g.source] || '#7aa2ff'};--c:${plat(g.platform).color}">
    <div class="box">
      <div class="face f-front">
        ${b.band ? `<div class="band"><i class="pip"></i>${b.band}</div>` : ''}
        <div class="art">${coverHTML(g)}</div>
        ${g.favorite ? `<span class="badge-fav">${ICON.star}</span>` : ''}
        ${g.running ? '<span class="badge-live"><i class="dot"></i>En cours</span>' : ''}
      </div>
      <div class="face f-back"><div class="back-in">
        ${bg ? `<div class="bg" style="background-image:url('${esc(bg)}')"></div>` : ''}
        <h4>${esc(g.name)}</h4>
        <dl><dt>Temps de jeu</dt><dd>${g.minutes >= 1 ? fmtTime(g.minutes) : '—'}</dd><dt>Dernière partie</dt><dd>${g.last ? esc(fmtLast(g.last)) : 'jamais'}</dd>${g.platform !== 'pc' ? `<dt>Émulateur</dt><dd>${esc((S.emulators.find((e) => e.id === g.emu) || {}).name || '—')}</dd>` : ''}</dl>
        ${genres ? `<div class="gl">${esc(genres)}</div>` : ''}
        <div class="acts"><button class="go" data-play="${esc(g.id)}">${ICON.play}Jouer</button><button class="info" data-detail="${esc(g.id)}" title="Voir la fiche">${ICON.info}</button></div>
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
  if (document.startViewTransition && ui.view !== v && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(run);
  else run();
}

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
          <button class="btn primary play" data-play="${esc(g.id)}">${ICON.play}${g.emuReady ? 'Jouer' : 'Installer et jouer'}</button>
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
const SOURCES = { steam: 'Steam', epic: 'Epic Games', riot: 'Riot Games', netmarble: 'Netmarble', bluestacks: 'BlueStacks', launcher: 'Autres launchers', installed: 'Jeux installés', manual: 'Ajoutés à la main', rom: 'Émulés' };
const SOURCE_COLORS = { steam: '#66c0f4', epic: '#d6d6d6', riot: '#ff4655', netmarble: '#ffc93c', bluestacks: '#3ddc84', launcher: '#c084fc', installed: '#f6c344', manual: '#7fd1b9', rom: '#ff7a59' };

function collFilter(c) {
  const now = Date.now();
  switch (c.type) {
    case 'fav': return (g) => g.favorite;
    case 'recent': return (g) => g.last && now - g.last < 30 * 864e5;
    case 'never': return (g) => !g.minutes && !g.last;
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
  const quick = [{ type: 'all' }, { type: 'fav' }, { type: 'recent' }, { type: 'never' }].map((c) => { const n = count(c); return c.type === 'all' || n ? collItem(c, n) : ''; }).join('');
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
    <button class="play-ic" data-play="${esc(g.id)}" title="Jouer">${ICON.play}</button>
  </div>`;
}

function renderLibrary() {
  const all = visible();
  let list = all.filter(collFilter(ui.coll));
  const inColl = list;
  if (ui.genre) list = list.filter((g) => (g.genres || []).includes(ui.genre));
  if (ui.q) { const q = ui.q.toLowerCase(); list = list.filter((g) => g.name.toLowerCase().includes(q)); }
  const sorts = {
    recent: byRecent,
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    time: (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'fr'),
    added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
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
          ${[['recent', 'Joués récemment'], ['name', 'Nom'], ['time', 'Temps de jeu'], ['added', 'Ajoutés récemment']].map(([k, l]) => `<option value="${k}"${ui.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
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

function renderSettings() { return groupSettings(renderSettingsRaw()); }
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
  setAmbientFor(g);
  modal(`<div class="modal dpage" style="--c:${plat(g.platform).color}">
    <button class="x" data-close>${ICON.x}</button>
    <div class="d-hero">${h ? `<div class="hero-bg${h.blur ? ' blur' : ''}" style="background-image:url('${esc(h.url)}')"></div>` : `<div class="hero-bg" style="background:radial-gradient(80% 100% at 30% 0%, ${plat(g.platform).color}66, transparent 70%)"></div>`}</div>
    <div class="d-head">
      ${coverHTML(g)}
      <div class="info">
        <div class="row1"><span class="tag" style="--c:${plat(g.platform).color}">${esc(plat(g.platform).label)}</span><span style="color:var(--muted);font-size:13px">${esc(sourceLabel(g))}</span>${g.running ? '<span class="kicker live" style="font-size:11px"><i class="dot"></i>En cours</span>' : ''}</div>
        ${g.art.logo ? `<img class="d-logo" src="${esc(g.art.logo)}" alt="${esc(g.name)}" data-title="${esc(g.name)}">` : `<h2>${esc(g.name)}</h2>`}
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
        <div class="field-label">Genres</div>
        <div class="genre-chips">${(g.genres || []).map((x) => `<span class="genre-chip">${esc(x)}<button data-genre-rm="${esc(x)}" data-id="${esc(g.id)}" title="Retirer">×</button></span>`).join('')}<button class="genre-chip add" data-genre-add="${esc(g.id)}">${ICON.plus}Ajouter</button></div>
        ${S.collections.length ? `<div class="field-label">Collections</div><div class="genre-chips">${S.collections.map((c) => `<button class="genre-chip" data-colltoggle="${esc(c.id)}" data-id="${esc(g.id)}" style="${c.games.includes(g.id) ? `background:color-mix(in srgb, ${c.color} 25%, transparent);color:var(--text)` : ''}"><span class="dot-c" style="width:8px;height:8px;border-radius:50%;background:${c.color}"></span>${esc(c.name)}${c.games.includes(g.id) ? ' ✓' : ''}</button>`).join('')}</div>` : ''}
        ${emus.length ? `<div class="field-label">Lancer avec</div><div class="seg">${emus.map((e) => `<button class="${g.emu === e.id ? 'on' : ''}" data-setemu="${e.id}" data-id="${esc(g.id)}">${esc(e.name)}${e.installed ? '' : ' (à installer)'}</button>`).join('')}</div>` : ''}
        ${g.source === 'manual' && g.platform !== 'pc' ? `<div class="field-label">Console</div><select class="select" id="setPlat" data-id="${esc(g.id)}">${ORDER.filter((p) => S.platforms[p] && S.platforms[p].family !== 'pc').map((p) => `<option value="${p}"${g.platform === p ? ' selected' : ''}>${esc(plat(p).label)}</option>`).join('')}</select>` : ''}
        ${g.extras && g.extras.length ? `<div class="field-label">Contenu supplémentaire</div><div class="extras">${g.extras.filter((x) => x === 'update').length ? `<span class="tag" style="--c:#5fd38d">${g.extras.filter((x) => x === 'update').length} mise${g.extras.filter((x) => x === 'update').length > 1 ? 's' : ''} à jour</span>` : ''}${g.extras.filter((x) => x === 'dlc').length ? `<span class="tag" style="--c:#7aa2ff">${g.extras.filter((x) => x === 'dlc').length} DLC</span>` : ''}<span style="color:var(--muted);font-size:12.5px">Trouvés dans tes dossiers et signalés à l'émulateur. Si le jeu ne les voit pas : ouvre l'émulateur › Fichier › Installer des fichiers.</span></div>` : ''}
        <div class="path-box">${esc(g.path)}</div>
      </div>
      <div class="side-list">
        <button data-rename="${esc(g.id)}">${ICON.edit}Renommer</button>
        <button data-pick="cover" data-id="${esc(g.id)}">${ICON.image}Choisir la jaquette</button>
        <button data-pick="hero" data-id="${esc(g.id)}">${ICON.image}Choisir l'image de fond</button>
        <button data-pick="logo" data-id="${esc(g.id)}">${ICON.image}Choisir le logo</button>
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
function closeModal() { const wasDetail = modalState && modalState.detail; $('#modal-root').innerHTML = ''; modalState = null; if (wasDetail) setAmbientFor(featured()); }
function refreshModal() { if (modalState && modalState.detail) { const st = $('.modal')?.scrollTop; openDetail(modalState.detail); if (st) $('.modal').scrollTop = st; } }

async function openPicker(id, kind) {
  const g = gameById(id);
  const label = { cover: 'la jaquette', hero: "l'image de fond", logo: 'le logo' }[kind];
  const ratio = { cover: '2/3', hero: '96/31', logo: '16/9' }[kind];
  const cols = { cover: 'repeat(auto-fill, minmax(130px, 1fr))', hero: 'repeat(auto-fill, minmax(260px, 1fr))', logo: 'repeat(auto-fill, minmax(180px, 1fr))' }[kind];
  modal(`<div class="modal picker"><button class="x" data-close>${ICON.x}</button>
    <div style="padding:26px 30px 8px"><div class="kicker" style="color:var(--muted)">${esc(g.name)}</div><h2 style="margin:10px 0 4px;font:800 30px var(--display);letter-spacing:-.03em">Choisir ${label}</h2></div>
    <div class="pick-tabs">${['cover', 'hero', 'logo'].map((k) => `<button class="${k === kind ? 'on' : ''}" data-pick="${k}" data-id="${esc(id)}">${{ cover: 'Jaquette', hero: 'Fond', logo: 'Logo' }[k]}</button>`).join('')}
      <span style="flex:1"></span><button class="btn sm ghost" data-art="${kind}" data-id="${esc(id)}">${ICON.folder}Depuis mon PC</button><button class="btn sm ghost" data-pickback="${esc(id)}">Retour</button></div>
    <div class="pick-grid" id="pickGrid" style="grid-template-columns:${cols}"><div class="pick-msg"><div class="spin-s"></div>Recherche des propositions…</div></div>
  </div>`, { picker: id });
  try {
    const opts = await api.call('art:options', id, kind);
    if (!$('#pickGrid')) return;
    $('#pickGrid').innerHTML = opts.length
      ? opts.map((o) => `<button class="pick-it${kind === 'logo' ? ' lg' : ''}" data-pickurl="${esc(o.url)}" data-kind="${kind}" data-id="${esc(id)}" style="aspect-ratio:${ratio}"><img src="${esc(o.thumb)}" loading="lazy"></button>`).join('')
      : '<div class="pick-msg">Aucune proposition trouvée pour ce jeu. Tu peux choisir une image depuis ton PC.</div>';
  } catch (e) {
    if ($('#pickGrid')) $('#pickGrid').innerHTML = `<div class="pick-msg">${esc(e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''))}<br><br><button class="btn sm" data-go="settings" data-close>Ouvrir les Paramètres</button></div>`;
  }
}

async function openBlueStacks() {
  modal(`<div class="modal dialog" style="width:min(560px,92vw)"><button class="x" data-close>${ICON.x}</button>
    <h3>Ajouter mes jeux BlueStacks</h3><p>Coche les jeux à ajouter dans la catégorie Mobile.</p>
    <div id="bsList" class="bs-list"><div class="pick-msg" style="padding:30px"><div class="spin-s"></div>Recherche des jeux installés dans BlueStacks…</div></div>
    <div class="field-label">Un jeu manque ? Colle son lien Google Play</div>
    <input class="input" id="bsManual" placeholder="https://play.google.com/store/apps/details?id=…">
    <div class="acts"><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-action="bs-confirm">Ajouter</button></div></div>`);
  try {
    const r = await api.call('bluestacks:candidates');
    const el = $('#bsList'); if (!el) return;
    if (!r.installed) { el.innerHTML = '<p class="chint" style="padding:10px 0">BlueStacks n\'est pas installé sur ce PC (ou pas dans son dossier habituel).</p>'; return; }
    el.innerHTML = r.list.length
      ? r.list.map((x) => `<label class="bs-it"><input type="checkbox" value="${esc(x.pkg)}" data-name="${esc(x.name)}" checked><span class="nm">${esc(x.name)}</span><span class="pk">${esc(x.pkg)}</span></label>`).join('')
      : '<p class="chint" style="padding:10px 0">Aucun jeu trouvé automatiquement. Colle le lien Google Play de chaque jeu ci-dessous : tu le trouves en cherchant le jeu sur play.google.com.</p>';
  } catch (e) { const el = $('#bsList'); if (el) el.innerHTML = `<p class="chint">${esc(e.message)}</p>`; }
}

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

function confirmBox(title, text, yes = 'Continuer', danger = false) {
  return new Promise((resolve) => {
    modal(`<div class="modal dialog"><h3>${esc(title)}</h3><p>${text}</p>
      <div class="acts"><button class="btn ghost" id="cNo">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cYes">${esc(yes)}</button></div></div>`);
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
    $('#cYes').focus();
  });
}

// --- Recherche rapide (Ctrl+K) -------------------------------------------------------------
function paletteActions() {
  return [
    { label: 'Passer en mode TV', icon: ICON.play, kbd: 'F11', run: () => enterTV() },
    { label: 'Aller à l\'accueil', icon: ICON.grid, kbd: 'Ctrl 1', run: () => go('home') },
    { label: 'Aller à la bibliothèque', icon: ICON.shelf, kbd: 'Ctrl 2', run: () => go('library') },
    { label: 'Aller aux émulateurs', icon: ICON.pad, kbd: 'Ctrl 3', run: () => go('emulators') },
    { label: 'Aller aux statistiques', icon: ICON.clock, kbd: 'Ctrl 4', run: () => go('stats') },
    { label: 'Ouvrir les paramètres', icon: ICON.edit, kbd: 'Ctrl 5', run: () => go('settings') },
    { label: 'Ajouter un jeu', icon: ICON.plus, run: async () => { const n = await call('game:add'); if (n) toast(`${n} jeu${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`, 'ok'); } },
    { label: 'Rechercher mes jeux', icon: ICON.refresh, run: async () => { toast('Recherche des jeux…'); await call('library:scan'); toast('Bibliothèque à jour.', 'ok'); } },
    { label: 'Nouvelle collection', icon: ICON.folder, run: () => { ui.coll = { type: 'all' }; go('library'); setTimeout(() => $('[data-action="new-coll"]')?.click(), 80); } },
    { label: 'Afficher en étagère', icon: ICON.shelf, run: () => { setAppearance({ libView: 'shelf' }); go('library'); render(); } },
    { label: 'Afficher en grille', icon: ICON.grid, run: () => { setAppearance({ libView: 'grid' }); go('library'); render(); } },
    { label: 'Afficher en liste', icon: ICON.list, run: () => { setAppearance({ libView: 'list' }); go('library'); render(); } },
    { label: 'Ajouter mes jeux BlueStacks', icon: ICON.plus, run: () => openBlueStacks() },
    { label: 'Raccourcis clavier', icon: ICON.info, kbd: '?', run: () => openKeys() },
    ...THEMES.map((t) => ({ label: `Thème ${t.label}`, icon: ICON.palette, run: () => setAppearance({ theme: t.id }) })),
  ];
}

function openPalette() {
  modal(`<div class="palette"><input id="palIn" placeholder="Rechercher un jeu ou une action"><div class="res" id="palRes"></div>
    <div class="foot"><span><kbd>↑</kbd><kbd>↓</kbd>naviguer</span><span><kbd>Entrée</kbd>ouvrir</span><span><kbd>Maj</kbd><kbd>Entrée</kbd>voir la fiche</span><span><kbd>Échap</kbd>fermer</span></div></div>`);
  let sel = 0, items = [];
  const draw = () => {
    const q = $('#palIn').value.trim().toLowerCase();
    const games = visible().filter((g) => !q || g.name.toLowerCase().includes(q)).sort(byRecent).slice(0, q ? 12 : 5).map((g) => ({ type: 'game', g }));
    const acts = paletteActions().filter((a) => !q || a.label.toLowerCase().includes(q)).slice(0, q ? 8 : 7).map((a) => ({ type: 'act', a }));
    items = [...games, ...acts];
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let html = '', i = 0;
    if (games.length) html += `<div class="grp">${q ? 'Jeux' : 'Joués récemment'}</div>` + games.map((x) => `<button class="it${i === sel ? ' on' : ''}" data-i="${i++}"><span class="mini">${coverHTML(x.g)}</span><span class="nm">${esc(x.g.name)}</span><span class="tag" style="--c:${plat(x.g.platform).color}">${esc(plat(x.g.platform).label)}</span></button>`).join('');
    if (acts.length) html += '<div class="grp">Actions</div>' + acts.map((x) => `<button class="it${i === sel ? ' on' : ''}" data-i="${i++}"><span class="ico">${x.a.icon}</span><span class="nm">${esc(x.a.label)}</span>${x.a.kbd ? `<kbd>${esc(x.a.kbd)}</kbd>` : ''}</button>`).join('');
    $('#palRes').innerHTML = html || '<div class="none">Rien trouvé. Essaie un autre mot.</div>';
    $('.it.on', $('#palRes'))?.scrollIntoView({ block: 'nearest' });
  };
  const runItem = (it, shift) => {
    closeModal();
    if (it.type === 'game') { if (shift) openDetail(it.g.id); else play(it.g.id); } else it.a.run();
  };
  const inp = $('#palIn');
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[sel]) runItem(items[sel], e.shiftKey);
    else if (e.key === 'Escape') closeModal();
  };
  $('#palRes').onclick = (e) => { const b = e.target.closest('.it'); if (b) runItem(items[+b.dataset.i], e.shiftKey); };
  draw(); inp.focus();
}

function openKeys() {
  const row = (label, keys) => `<span>${label}</span><span class="k">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span>`;
  modal(`<div class="modal dialog" style="width:min(540px,92vw)"><button class="x" data-close>${ICON.x}</button><h3>Raccourcis clavier</h3>
    <div class="keys">
      <h5>Partout</h5>
      ${row('Rechercher un jeu ou une action', ['Ctrl', 'K'])}${row('Accueil, bibliothèque, émulateurs, stats, paramètres', ['Ctrl', '1 à 5'])}${row('Mode TV', ['F11'])}${row('Cette aide', ['?'])}
      <h5>Étagère</h5>
      ${row('Choisir un jeu', ['←', '→'])}${row('Retourner le boîtier', ['Espace'])}${row('Jouer', ['Entrée'])}${row('Remettre les boîtiers', ['Échap'])}
      <h5>Manette</h5>
      ${row('Quitter un jeu', ['Select', 'Start'])}${row('Changer de rayon en mode TV', ['LB', 'RB'])}${row('Ajouter aux favoris', ['Y'])}
    </div></div>`);
}

// --- Menu contextuel ----------------------------------------------------------------------
function openCtx(id, x, y) {
  const g = gameById(id);
  if (!g) return;
  const ctx = $('#ctx');
  ctx.innerHTML = `<button data-play="${esc(id)}">${ICON.play}Jouer</button>
    <button data-detail="${esc(id)}">${ICON.info}Voir la fiche</button>
    <button data-fav="${esc(id)}">${ICON.star}${g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
    <div class="sub-wrap"><button data-noop="1">${ICON.folder}Ajouter à une collection<span style="margin-left:auto;opacity:.5">›</span></button>
      <div class="sub-menu">${S.collections.map((c) => `<button data-colltoggle="${esc(c.id)}" data-id="${esc(id)}"><span class="chk${c.games.includes(id) ? ' on' : ''}">${c.games.includes(id) ? ICON.check : ''}</span><span class="dot-c" style="--c:${c.color}"></span>${esc(c.name)}</button>`).join('')}${S.collections.length ? '<hr>' : ''}<button data-collnewfor="${esc(id)}">${ICON.plus}Nouvelle collection…</button></div></div>
    <hr>
    <button data-rename="${esc(id)}">${ICON.edit}Renommer</button>
    <button data-pick="cover" data-id="${esc(id)}">${ICON.image}Choisir la jaquette</button>
    <button data-pick="hero" data-id="${esc(id)}">${ICON.image}Choisir le fond</button>
    <button data-openfolder="${esc(id)}">${ICON.folder}Ouvrir l'emplacement</button>
    <button data-hide="${esc(id)}">${ICON.eye}${g.hidden ? 'Afficher' : 'Masquer'}</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctx.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
}
const closeCtx = () => { $('#ctx').hidden = true; };
function openCollCtx(id, x, y) {
  const c = S.collections.find((k) => k.id === id);
  if (!c) return;
  const COLORS = ['#ff6b5e', '#f6c344', '#5fd38d', '#7aa2ff', '#c084fc', '#ff3ea5', '#5ef0c6', '#ff9f43'];
  const ctx = $('#ctx');
  ctx.innerHTML = `<button data-collrename="${esc(id)}">${ICON.edit}Renommer</button>
    <div style="display:flex;gap:6px;padding:8px 10px">${COLORS.map((k) => `<button class="swatch${c.color === k ? ' on' : ''}" data-collcolor="${k}" data-id="${esc(id)}" style="width:20px;height:20px;background:${k};padding:0"></button>`).join('')}</div>
    <button data-collmove="-1" data-id="${esc(id)}">↑ Monter</button><button data-collmove="1" data-id="${esc(id)}">↓ Descendre</button>
    <hr><button class="danger" data-colldelete="${esc(id)}" style="color:var(--red)">${ICON.trash}Supprimer la collection</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctx.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
}

// --- Notifications -----------------------------------------------------------------------
function toast(text, kind = 'info', ms = 4200, action = null) {
  // Pas deux fois le même message à l'écran.
  if ($$('#toasts .toast').some((x) => x.firstChild && x.firstChild.textContent === text)) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}${action ? ' act' : ''}`;
  el.textContent = text;
  if (action) {
    const b = document.createElement('button');
    b.className = 'btn sm';
    b.textContent = action.label;
    b.onclick = () => { action.fn(); el.remove(); };
    el.appendChild(b);
    ms = Math.max(ms, 6500);
  }
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
  const t = ev.target.closest('button, [data-url], .linkish, a, .lrow, .slot');
  if (!ev.target.closest('.theme-pop, #themeBtn')) $('.theme-pop')?.remove();
  if (!$('#ctx').hidden && !ev.target.closest('#ctx')) closeCtx();
  if (!t) return;
  const d = t.dataset;
  if (t.classList.contains('slot')) {
    toggleFlip(t);
    if (ui.view === 'home') { ui.heroId = t.dataset.game; renderHero(); }
    return;
  }
  if (d.noop) return;
  if (t.closest('#ctx') && !d.colltoggle && !d.collnewfor) closeCtx();

  if (d.view) return go(d.view);
  if (d.go) return go(d.go);
  if (d.win) return api.call('win:' + d.win);
  if (d.close !== undefined) return closeModal();
  if (d.play) { if (modalState) closeModal(); return play(d.play); }
  if (d.detail) return openDetail(d.detail);
  if (d.menu) { const r = t.getBoundingClientRect(); return openCtx(d.menu, r.left, r.bottom + 8); }
  if (d.fav) { const g = gameById(d.fav); await call('game:update', d.fav, { favorite: !g.favorite }); return; }
  if (d.hide) {
    const g = gameById(d.hide); const was = g.hidden;
    await call('game:update', d.hide, { hidden: !was });
    if (!was) { if (modalState) closeModal(); toast(`${g.name} est masqué.`, 'info', 6500, { label: 'Annuler', fn: () => call('game:update', g.id, { hidden: false }) }); }
    return;
  }
  if (d.rename) { const g = gameById(d.rename); const v = await askText('Renommer', 'Laisse vide pour reprendre le nom d\'origine.', g.name); if (v !== null) await call('game:update', g.id, { customName: v === g.originalName ? '' : v }); return; }
  if (d.art) { if (modalState && modalState.picker) { const back = modalState.picker; closeModal(); await call('game:setArt', d.id, d.art); openDetail(back); return; } return call('game:setArt', d.id, d.art); }
  if (d.pick) return openPicker(d.id, d.pick);
  if (d.pickurl) { await call('game:setArtUrl', d.id, d.kind, d.pickurl); const id = d.id; closeModal(); openDetail(id); toast('Image changée.', 'ok', 2000); return; }
  if (d.pickback) { const id = d.pickback; closeModal(); return openDetail(id); }
  if (d.resetart) return call('game:resetArt', d.resetart);
  if (d.openfolder) return call('game:openFolder', d.openfolder);
  if (d.remove) { closeModal(); return call('game:remove', d.remove); }
  if (d.setemu) return call('game:update', d.id, { emu: d.setemu });
  if (d.setplat) return call('game:setPlatform', d.id, d.setplat);
  if (d.seeall) { ui.coll = d.seeall === 'fav' ? { type: 'fav' } : d.seeall.startsWith('c:') ? { type: 'user', key: d.seeall.slice(2) } : { type: 'platform', key: d.seeall }; ui.q = ''; return go('library'); }
  const co = ev.target.closest('[data-collopen]');
  if (co) { ui.openColl[co.dataset.collopen] = !ui.openColl[co.dataset.collopen]; return render(); }
  if (d.genrePick) { ui.genre = ui.genre === d.genrePick ? null : d.genrePick; ui.genreOpen = false; return render(); }
  if (ui.genreOpen && !t.closest('.gsel')) { ui.genreOpen = false; render(); }
  if (d.coll) { ui.coll = JSON.parse(d.coll); $('#view').scrollTop = 0; return render(); }
  if (d.collsec) { ui.closed[d.collsec] = !ui.closed[d.collsec]; return render(); }
  if (d.snav) { const el = document.getElementById(d.snav); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.libview) { setAppearance({ libView: d.libview }); return render(); }
  if (d.themePick) { setAppearance({ theme: d.themePick }); $$('[data-theme-pick]').forEach((b) => b.classList.toggle('on', b.dataset.themePick === d.themePick)); return; }
  if (d.accent !== undefined) { setAppearance({ accent: d.accent }); $$('[data-accent]').forEach((b) => b.classList.toggle('on', b.dataset.accent === d.accent)); return; }
  if (d.collmenu) { const r = t.getBoundingClientRect(); return openCollCtx(d.collmenu, r.left, r.bottom + 8); }
  if (d.colltoggle) {
    const gid = d.id, cid = d.colltoggle;
    const on = await call('collection:toggle', cid, gid); const c = S.collections.find((x) => x.id === cid);
    toast(on ? `Ajouté à « ${c.name} ».` : `Retiré de « ${c.name} ».`, 'ok', 3000, { label: 'Annuler', fn: () => call('collection:toggle', cid, gid, !on) });
    closeCtx(); return;
  }
  if (d.collnewfor) { closeCtx(); const name = await askText('Nouvelle collection', 'Donne un nom à ta collection.', ''); if (name) { await call('collection:create', name, d.collnewfor); toast(`Collection « ${name} » créée.`, 'ok'); } return; }
  if (d.collrename) { closeCtx(); const c = S.collections.find((x) => x.id === d.collrename); const v = await askText('Renommer la collection', '', c.name); if (v) await call('collection:update', c.id, { name: v }); return; }
  if (d.collcolor) { closeCtx(); return call('collection:update', d.id, { color: d.collcolor }); }
  if (d.collmove) { closeCtx(); return call('collection:move', d.id, Number(d.collmove)); }
  if (d.colldelete) { closeCtx(); const c = S.collections.find((x) => x.id === d.colldelete); if (await confirmBox('Supprimer la collection ?', `« ${esc(c.name)} » sera supprimée. Les jeux restent dans ta bibliothèque.`, 'Supprimer')) { await call('collection:delete', c.id); if (ui.coll.type === 'user' && ui.coll.key === c.id) { ui.coll = { type: 'all' }; render(); } } return; }
  if (d.genreRm) { const g = gameById(d.id); await call('game:setGenres', d.id, (g.genres || []).filter((x) => x !== d.genreRm)); return; }
  if (d.genreAdd) { const g = gameById(d.genreAdd); const v = await askText('Ajouter un genre', 'Par exemple : RPG, Course, Plateforme, Combat…', ''); if (v) await call('game:setGenres', g.id, [...(g.genres || []), v]); openDetail(g.id); return; }
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
  if (d.emudel) {
    const e = S.emulators.find((x) => x.id === d.emudel);
    const text = e.custom
      ? `HMZ va oublier ${esc(e.name)}. Ton dossier <b>${esc(e.dir || '')}</b> n'est pas touché.`
      : `Le dossier de ${esc(e.name)} sera supprimé avec ses réglages${S.settings.backups ? '. Tes sauvegardes de parties sont d\'abord copiées dans le dossier Sauvegardes' : ' et les sauvegardes de parties qu\'il contient'}. Tes jeux ne sont pas touchés.`;
    if (!(await confirmBox(`${e.custom ? 'Oublier' : 'Supprimer'} ${e.name} ?`, text, e.custom ? 'Oublier' : 'Supprimer', true))) return;
    try { await call('emu:uninstall', e.id); delete emuErr[e.id]; toast(`${e.name} est ${e.custom ? 'oublié' : 'supprimé'}.`, 'ok'); } catch {}
    return;
  }
  if (d.emufam) { ui.emu.fam = d.emufam; return render(); }
  if (d.emust) { ui.emu.st = d.emust; return render(); }
  if (d.emureset) { ui.emu = { q: '', fam: 'all', st: 'all', sort: ui.emu.sort }; return render(); }
  if (d.emuopen) return call('emu:open', d.emuopen);
  if (d.emudir) return call('emu:openDir', d.emudir);
  if (d.keys) { const r = await call('emu:keys', d.keys); if (r) toast(`Clés installées : ${r.copied.join(', ')}`, 'ok'); return; }
  if (d.fw) { const r = await call('emu:firmware', d.fw); if (r) toast(`Firmware installé (${r.count} fichiers).`, 'ok'); return; }
  if (d.opendir) return call('dir:open', d.opendir);
  if (d.adddir) return call('dir:add', d.adddir);
  if (d.rmdir) return call('dir:remove', d.rmdir, d.dir);
  if (d.url) return call('open:url', d.url);
  if (d.toggle) return call('settings:set', { [d.toggle]: !S.settings[d.toggle] });

  const card = t.closest('.card[data-game], .lrow[data-game]');
  if (card) {
    if (ui.view === 'home' && card.closest('.rows')) {
      ui.heroId = card.dataset.game;
      render();
      $('#view').scrollTo({ top: 0, behavior: 'smooth' });
    } else openDetail(card.dataset.game);
    return;
  }

  switch (d.action) {
    case 'bluestacks-add': openBlueStacks(); break;
    case 'bs-confirm': {
      const items = $$('.bs-it input:checked').map((c) => ({ pkg: c.value, name: c.dataset.name }));
      const extra = ($('#bsManual') || {}).value;
      if (extra && extra.trim()) items.push({ pkg: extra.trim() });
      if (!items.length) { toast('Coche au moins un jeu, ou colle un lien Play Store.'); break; }
      const n = await call('bluestacks:add', items);
      closeModal();
      toast(n ? `${n} jeu${n > 1 ? 'x' : ''} BlueStacks ajouté${n > 1 ? 's' : ''} dans Mobile.` : 'Lien ou nom de paquet non reconnu.', n ? 'ok' : 'error');
      break;
    }
    case 'genre-menu': ui.genreOpen = !ui.genreOpen; render(); break;
    case 'genre-clear': ui.genre = null; ui.genreOpen = false; render(); break;
    case 'toggle-genres': ui.allGenres = !ui.allGenres; render(); break;
    case 'new-coll': ui.newColl = true; render(); setTimeout(() => $('#newCollName')?.focus(), 0); break;
    case 'add-game': {
      if (!t.dataset.direct) {
        const r = t.getBoundingClientRect();
        const ctx = $('#ctx');
        ctx.innerHTML = `<button data-action="add-game" data-direct="1">${ICON.folder}Un jeu PC ou console…<span style="margin-left:auto;color:var(--faint);font-size:12px">fichier .exe, .nsp…</span></button>
          <button data-action="bluestacks-add">${ICON.pad}Mes jeux BlueStacks…</button>`;
        ctx.hidden = false;
        const w = ctx.getBoundingClientRect().width;
        ctx.style.left = Math.max(10, Math.min(r.right - w, innerWidth - w - 10)) + 'px';
        ctx.style.top = (r.bottom + 8) + 'px';
        break;
      } const n = await call('game:add'); if (n) toast(`${n} jeu${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`, 'ok'); break; }
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
      else if (r.newer) { /* HMZ annonce lui-même la mise à jour trouvée */ }
      else toast(`Tu as la dernière version (${S.version}).`, 'ok');
      break;
    }
    case 'rollback': if (await confirmBox('Revenir à la version installée ?', `HMZ va redémarrer en version ${esc(S.builtinVersion)}. Tes jeux, réglages et temps de jeu sont conservés.`, 'Redémarrer')) await call('app:rollback'); break;
    case 'toggle-hidden': ui.showHidden = !ui.showHidden; render(); break;
  }
});

// Glisser un jeu sur une collection.
let dragId = null;
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest && e.target.closest('[data-game][draggable="true"]');
  if (c) $$('.slot.flipped').forEach((x) => x.classList.remove('flipped'));
  if (!c) return;
  dragId = c.dataset.game;
  c.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', dragId);
  if (ui.view !== 'library') return;
  if (!S.collections.length) toast('Crée d\'abord une collection avec le + de « Mes collections ».', 'info', 3500);
});
document.addEventListener('dragend', (e) => { $$('.dragging').forEach((x) => x.classList.remove('dragging')); $$('.drop').forEach((x) => x.classList.remove('drop')); dragId = null; });
document.addEventListener('dragover', (e) => {
  const it = e.target.closest && e.target.closest('[data-collid]');
  $$('.drop').forEach((x) => { if (x !== it) x.classList.remove('drop'); });
  if (it && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; it.classList.add('drop'); }
});
document.addEventListener('drop', async (e) => {
  const it = e.target.closest && e.target.closest('[data-collid]');
  if (!it || !dragId) return;
  e.preventDefault();
  const id = dragId; dragId = null;
  const c = S.collections.find((x) => x.id === it.dataset.collid);
  await call('collection:toggle', c.id, id, true);
  toast(`${gameById(id).name} ajouté à « ${c.name} ».`, 'ok', 2200);
});

document.addEventListener('dblclick', (e) => {
  const card = e.target.closest('.card[data-game], .lrow[data-game], .slot[data-game]');
  if (card && $('#tv').hidden && !e.target.closest('.play-ic, .f-back button')) { $$('.slot.flipped').forEach((x) => x.classList.remove('flipped')); play(card.dataset.game); }
});
document.addEventListener('contextmenu', (e) => {
  const coll = e.target.closest('[data-collid]');
  if (coll && $('#tv').hidden) { e.preventDefault(); return openCollCtx(coll.dataset.collid, e.clientX, e.clientY); }
  const card = e.target.closest('[data-game], [data-game-ctx]');
  if (card && $('#tv').hidden) { e.preventDefault(); openCtx(card.dataset.game || card.dataset.gameCtx, e.clientX, e.clientY); }
});
document.addEventListener('keydown', async (e) => {
  if (e.target.id === 'newCollName') {
    if (e.key === 'Enter' && e.target.value.trim()) { const c = await call('collection:create', e.target.value.trim()); ui.newColl = false; ui.coll = { type: 'user', key: c.id }; render(); }
    if (e.key === 'Escape') { ui.newColl = false; render(); }
  }
}, true);
document.addEventListener('focusout', (e) => { if (e.target.id === 'newCollName' && ui.newColl) setTimeout(() => { if (ui.newColl && document.activeElement?.id !== 'newCollName') { ui.newColl = false; render(); } }, 150); });
document.addEventListener('input', (e) => {
  if (e.target.id === 'cardSize') {
    document.documentElement.style.setProperty('--card-min', `${e.target.value}px`); S.settings.cardSize = Number(e.target.value);
    clearTimeout(window.__cs); window.__cs = setTimeout(() => { api.call('settings:set', { cardSize: Number(e.target.value) }); if ($('.slot')) { const v = e.target.value; render(); const r = $('#cardSize'); if (r) r.value = v; } }, 250);
    return;
  }
  if (e.target.id === 'emuQ') {
    ui.emu.q = e.target.value.trim();
    const box = $('.emu-results'); if (box) box.innerHTML = emuResultsHTML();
    return;
  }
  if (e.target.id === 'libSearch') {
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const inp = $('#libSearch'); inp.focus(); inp.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'libSort') { ui.sort = e.target.value; render(); }
  if (e.target.id === 'emuSort') { ui.emu.sort = e.target.value; render(); }
  if (e.target.id === 'setPlat') { call('game:setPlatform', e.target.dataset.id, e.target.value); }
  if (e.target.id === 'sgdbKey') { call('settings:set', { sgdbKey: e.target.value.trim() }).then(() => { if (e.target.value.trim()) toast('Clé enregistrée. Recherche des images…', 'ok'); }); }
});

document.addEventListener('keydown', (e) => {
  if (!$('#tv').hidden) return tvKey(e);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openPalette(); }
  if ((e.ctrlKey || e.metaKey) && /^[1-5]$/.test(e.key)) { e.preventDefault(); closeModal(); return go(['home', 'library', 'emulators', 'stats', 'settings'][+e.key - 1]); }
  const typing = e.target.matches('input, select, textarea');
  if (!typing && !modalState && e.key === '?') { e.preventDefault(); return openKeys(); }
  const slot = document.activeElement && document.activeElement.closest && document.activeElement.closest('.slot');
  if (slot && !modalState) {
    const sibs = $$('.slot', slot.closest('.shelf'));
    const i = sibs.indexOf(slot);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = sibs[Math.max(0, Math.min(sibs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
      if (n) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); if (ui.view === 'home') { ui.heroId = n.dataset.game; renderHero(); } }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); return toggleFlip(slot); }
    if (e.key === 'Enter') { e.preventDefault(); return play(slot.dataset.game); }
  }
  if (e.key === 'Escape' && $('.slot.flipped') && !modalState) { $$('.slot.flipped').forEach((x) => x.classList.remove('flipped')); return; }
  if (e.key === 'F11') { e.preventDefault(); return enterTV(); }
  if (e.key === 'Escape') { if (!$('#ctx').hidden) return closeCtx(); if (modalState) return closeModal(); }
  if (e.target.matches('input, select, textarea') || modalState) return;
  if (ui.view === 'home' && !slot && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const first = $(`.slot[data-game="${CSS.escape((featured() || {}).id || '')}"]`) || $('.slot');
    if (first) { e.preventDefault(); first.focus(); }
  }
  if (ui.view === 'home' && !slot && e.key === 'Enter' && featured()) play(featured().id);
});

$('#searchBtn').onclick = openPalette;
let resizeT = null;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (ui.view === 'library' && (S.settings.libView || 'shelf') === 'shelf' && !$('#view input:focus')) render(); }, 160); });
$('#tvBtn').onclick = () => enterTV();
$('#themeBtn').onclick = (e) => { e.stopPropagation(); toggleThemePop(); };

// --- Mode TV -------------------------------------------------------------------------------------
const tv = { tab: 0, idx: 0, menu: null, fullscreenSet: false, launching: null };
function tvTabs() {
  const list = visible();
  const tabs = [];
  const recent = list.filter((g) => g.last).sort(byRecent);
  tabs.push({ key: 'recent', label: recent.length ? 'Récents' : 'Ta collection', games: recent.length ? recent.slice(0, 30) : [...list].sort(byRecent) });
  const fav = list.filter((g) => g.favorite).sort(byRecent);
  if (fav.length) tabs.push({ key: 'fav', label: 'Favoris', games: fav });
  for (const c of S.collections || []) {
    const gs = c.games.map(gameById).filter((g) => g && (ui.showHidden || !g.hidden));
    if (gs.length) tabs.push({ key: 'c:' + c.id, label: c.name, games: gs });
  }
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

  const meta = metaParts(g).map((x) => `<span class="mi">${esc(x)}</span>`).join('');
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
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((x) => x && x.connected) : [];
  const label = $('#tvPad');
  if (label) label.textContent = pads.length || padKinds.length ? '● Manette connectée' : '';
  if (pads.length) {
    // Toutes les manettes comptent : Windows en liste parfois une virtuelle
    // (ou un casque, un volant…) avant la vraie.
    const b = (i) => pads.some((p) => p.buttons[i] && p.buttons[i].pressed);
    const axis = (i) => { let best = 0; for (const p of pads) { const v = (p.axes || [])[i] || 0; if (Math.abs(v) > Math.abs(best)) best = v; } return best; };
    const ax = [axis(0), axis(1)];
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

// Manettes vues par la fenêtre (API Gamepad) : sert aussi d'appoint à la
// détection en arrière-plan, qui ne voit pas toujours une manette branchée après coup.
function padKindOf(gp) {
  const id = (gp.id || '').toLowerCase();
  const m = id.match(/vendor:\s*([0-9a-f]{4})/) || id.match(/^([0-9a-f]{4})-/);
  const v = m ? m[1] : '';
  if (v === '054c' || /dualshock|dualsense|wireless controller|playstation/.test(id)) return 'playstation';
  if (v === '057e' || /pro controller|nintendo/.test(id)) return 'switch';
  if (v === '045e' || /xinput|xbox/.test(id)) return 'xbox';
  return 'generic';
}
function windowPadKinds() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((x) => x && x.connected) : [];
  return [...new Set(pads.map(padKindOf))];
}
function allPadKinds() { return [...new Set([...padKinds, ...windowPadKinds()])]; }
let padRefreshes = 0;
window.addEventListener('gamepadconnected', (e) => {
  const k = padKindOf(e.gamepad);
  toast(`Manette ${PAD_LABEL[k] || ''} connectée. Appuie sur ${k === 'playstation' ? 'PS ou Options' : k === 'xbox' ? 'Xbox ou Menu' : 'Home ou +'} pour passer en mode TV.`, 'ok', 5000);
  if (!padKinds.includes(k) && padRefreshes++ < 4) call('pad:refresh');
  if (ui.view === 'settings' && !modalState) render();
});
window.addEventListener('gamepaddisconnected', () => { if (ui.view === 'settings' && !modalState) render(); });

// --- Démarrage ------------------------------------------------------------------------------------
api.on('state:changed', (st) => {
  S = st;
  applyAppearance();
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
  if ($('#toasts .toast.update')) return;
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
  applyAppearance();
  render();
  if (S.settings.startInTV) enterTV();
})();
