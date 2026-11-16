// HMZ · Icônes : une seule collection, Lucide (licence ISC, https://lucide.dev).
// Ce script recopie les icônes utilisées dans renderer/core.js (entre les repères ICÔNES).
// À relancer après avoir ajouté une icône : node scripts/icons.js
const fs = require('fs');
const path = require('path');

const MAP = {
  play: 'play', dots: 'ellipsis', info: 'info', star: 'star', folder: 'folder', image: 'image',
  edit: 'pencil', eye: 'eye', trash: 'trash-2', plus: 'plus', check: 'check', download: 'download',
  ext: 'external-link', refresh: 'refresh-cw', pad: 'gamepad-2', key: 'key-round', chip: 'cpu',
  palette: 'palette', shelf: 'library', grid: 'layout-grid', list: 'list', chevL: 'chevron-left',
  chevR: 'chevron-right', chev: 'chevron-down', clock: 'clock', sparkle: 'sparkles', layers: 'layers',
  tagic: 'tag', warn: 'triangle-alert', x: 'x', home: 'house', tv: 'tv', dice: 'dices',
  settings: 'settings', search: 'search', stats: 'chart-no-axes-column', minus: 'minus',
  square: 'square', flame: 'flame', calendar: 'calendar-days', trophy: 'trophy', volume: 'volume-2',
};
const dir = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const inner = (name) => {
  const svg = fs.readFileSync(path.join(dir, `${name}.svg`), 'utf8');
  return svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').trim();
};
const lines = Object.entries(MAP).map(([k, n]) => `  ${k}: '<svg${k === 'chev' ? ' class="chev"' : ''} viewBox="0 0 24 24">${inner(n).replace(/'/g, "\\'")}</svg>',`);
const file = path.join(__dirname, '..', 'renderer', 'core.js');
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/(\/\/ <ICÔNES>)[\s\S]*?(\n\s*\/\/ <\/ICÔNES>)/, `$1\n${lines.join('\n')}$2`);
if (out === src && !src.includes('// <ICÔNES>')) throw new Error('Repères ICÔNES introuvables dans core.js');
fs.writeFileSync(file, out);
console.log(`${lines.length} icônes Lucide écrites dans renderer/core.js`);
