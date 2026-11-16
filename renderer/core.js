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
  // <ICÔNES>
  play: '<svg viewBox="0 0 24 24"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" /></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>',
  image: '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5v14" /></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>',
  pad: '<svg viewBox="0 0 24 24"><line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></svg>',
  key: '<svg viewBox="0 0 24 24"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  chip: '<svg viewBox="0 0 24 24"><path d="M12 20v2" /><path d="M12 2v2" /><path d="M17 20v2" /><path d="M17 2v2" /><path d="M2 12h2" /><path d="M2 17h2" /><path d="M2 7h2" /><path d="M20 12h2" /><path d="M20 17h2" /><path d="M20 7h2" /><path d="M7 20v2" /><path d="M7 2v2" /><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="8" y="8" width="8" height="8" rx="1" /></svg>',
  palette: '<svg viewBox="0 0 24 24"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  shelf: '<svg viewBox="0 0 24 24"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M3 5h.01" /><path d="M3 12h.01" /><path d="M3 19h.01" /><path d="M8 5h13" /><path d="M8 12h13" /><path d="M8 19h13" /></svg>',
  chevL: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>',
  chevR: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" /></svg>',
  tagic: '<svg viewBox="0 0 24 24"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>',
  tv: '<svg viewBox="0 0 24 24"><path d="m17 2-5 5-5-5" /><rect width="20" height="15" x="2" y="7" rx="2" /></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect width="12" height="12" x="2" y="10" rx="2" ry="2" /><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" /><path d="M6 18h.01" /><path d="M10 14h.01" /><path d="M15 6h.01" /><path d="M18 9h.01" /></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M5 21v-6" /><path d="M12 21V3" /><path d="M19 21V9" /></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>',
  square: '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M8 13h.01" /><path d="M12 13h.01" /><path d="M16 13h.01" /><path d="M8 17h.01" /><path d="M12 17h.01" /><path d="M16 17h.01" /></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" /><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" /><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" /><path d="M4 22h16" /><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" /><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" /></svg>',
  volume: '<svg viewBox="0 0 24 24"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></svg>',
  // </ICÔNES>
};

// Icônes de la barre du haut (écrites dans le HTML sous forme de repères).
$$('[data-icon]').forEach((el) => { el.outerHTML = ICON[el.dataset.icon] || ''; });

// --- Apparence : une seule palette (renderer/design.css) ---------------------------------
function applyAppearance(st = S && S.settings) {
  if (!st) return;
  document.documentElement.style.setProperty('--card-min', `${st.cardSize || 168}px`);
}
function setAppearance(patch) {
  Object.assign(S.settings, patch);
  applyAppearance();
  api.call('settings:set', patch).catch(() => {});
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
// La police change la largeur des onglets : on replace l'indicateur une fois chargée.
if (document.fonts) document.fonts.ready.then(() => moveNavInd());
let hoverT = null;
document.addEventListener('mouseover', (e) => {
  const sl = e.target.closest && e.target.closest('.slot[data-game], .rows .card[data-game]');
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
// --- Lueur des cartes : couleur dominante de la jaquette, calculée au premier survol ----------
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function glowFor(el) {
  if (!el || el.dataset.glow) return;
  const g = gameById(el.dataset.game || '');
  if (!g) return;
  el.dataset.glow = '1';
  const key = g.art.cover || g.art.hero || g.art.header;
  const set = (rgb) => el.style.setProperty('--gl', rgb);
  set((key && colorCache.get(key)) || hexToRgb(plat(g.platform).color));
  if (key && !colorCache.has(key)) colorFor(key).then((rgb) => { if (rgb) set(rgb); });
}
document.addEventListener('pointerover', (e) => { const el = e.target.closest && e.target.closest('.card[data-game], .slot[data-game]'); if (el) glowFor(el); });
document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('.card[data-game], .slot[data-game]'); if (el) glowFor(el); });

// --- Effet fort de l'accueil : la jaquette s'incline vers la souris, avec un reflet ---------
// (transform seulement, une mise à jour par image au plus, rien quand la souris ne bouge pas)
let tiltRaf = 0, tiltEv = null;
document.addEventListener('pointermove', (e) => {
  const art = e.target.closest && e.target.closest('.hz-art');
  if (!art || reduceMotion()) return;
  tiltEv = { art, x: e.clientX, y: e.clientY };
  if (tiltRaf) return;
  tiltRaf = requestAnimationFrame(() => {
    tiltRaf = 0;
    const { art: a, x, y } = tiltEv;
    const r = a.getBoundingClientRect();
    const px = (x - r.left) / r.width - 0.5, py = (y - r.top) / r.height - 0.5;
    a.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`);
    a.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`);
    a.style.setProperty('--sx', `${(px * 60).toFixed(1)}%`);
    a.style.setProperty('--sy', `${(py * 60).toFixed(1)}%`);
    a.classList.add('tilting');
  });
});
document.addEventListener('pointerout', (e) => {
  const art = e.target.closest && e.target.closest('.hz-art');
  if (art && !art.contains(e.relatedTarget)) { art.classList.remove('tilting'); ['--rx', '--ry', '--sx', '--sy'].forEach((k) => art.style.removeProperty(k)); }
});

// Voile sous la barre du haut quand la page défile.
$('#view').addEventListener('scroll', (e) => document.documentElement.classList.toggle('scrolled', e.currentTarget.scrollTop > 8), { passive: true });

// --- Au repos : rien ne bouge quand HMZ est caché, réduit, ou qu'un jeu tourne -------------
function updateIdle() {
  const playing = !!(S && S.games && S.games.some((g) => g.running));
  document.documentElement.classList.toggle('is-idle', document.hidden || playing);
}
document.addEventListener('visibilitychange', updateIdle);

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
  markScrollableRows();
  if (!$('#tv').hidden) renderTV(true);
}
// Les flèches d'une rangée n'apparaissent que si elle dépasse de l'écran.
function markScrollableRows() { $$('.row-track').forEach((t) => t.parentElement.classList.toggle('scrollable', t.scrollWidth > t.clientWidth + 4)); }
addEventListener('resize', () => markScrollableRows());
function go(v) {
  const run = () => { ui.view = v; $('#view').scrollTop = 0; render(); };
  if (document.startViewTransition && ui.view !== v && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Changer de page très vite annule l'animation précédente : ce n'est pas une erreur.
    const t = document.startViewTransition(run);
    for (const p of [t.ready, t.finished, t.updateCallbackDone]) if (p && p.catch) p.catch(() => {});
  }
  else run();
}
