// Petites fonctions partagées par le processus principal.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const UA = 'HMZ-Launcher/2.0 (+https://github.com)';

function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
}

// Forme simplifiée d'un titre pour comparer deux noms de jeux.
function normTitle(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|le|la|les)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// « Pokemon_Pokopia [0100F4300BF2C000][v0] (Europe).nsp » → « Pokemon Pokopia »
function cleanRomTitle(file) {
  let s = path.basename(file).replace(/\.[^.]+$/, '');
  s = s.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\{[^}]*\}/g, ' ');
  s = s.replace(/[_]+/g, ' ');
  if (!/\s/.test(s)) s = s.replace(/\.+/g, ' ');
  s = s.replace(/\s+-\s*$/, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s+v\d+(\.\d+)*$/i, '').trim();
  return s || path.basename(file);
}

// Identifiant de titre Switch inscrit dans le nom du fichier, s'il y en a un.
function switchTitleId(file) {
  const m = path.basename(file).match(/\b(0[0-9a-f]{15})\b/i);
  return m ? m[1].toUpperCase() : null;
}

// Similarité entre deux titres (0 à 1), basée sur les mots communs.
function similarity(a, b) {
  const A = normTitle(a), B = normTitle(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const ta = new Set(A.split(' ')), tb = new Set(B.split(' '));
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  const score = (2 * common) / (ta.size + tb.size);
  if (B.startsWith(A) || A.startsWith(B)) return Math.max(score, 0.85);
  return score;
}

// Version stricte pour choisir une image : « Minecraft » ne doit pas valoir
// « Minecraft Legends », ni « Valorant » valoir « Valorant Champions ».
function strictSimilarity(a, b) {
  const A = normTitle(a), B = normTitle(b);
  if (!A || !B) return 0;
  if (A === B || A.replace(/ /g, '') === B.replace(/ /g, '')) return 1;
  const ta = new Set(A.split(' ')), tb = new Set(B.split(' '));
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  } finally { clearTimeout(t); }
}

async function fetchJson(url, opts = {}, ms) {
  // Sur les machines de vérification GitHub, le jeton évite la limite de requêtes.
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) {
    opts = { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } };
  }
  const r = await fetchWithTimeout(url, opts, ms);
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status} sur ${new URL(url).host}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

async function urlExists(url) {
  try {
    const r = await fetchWithTimeout(url, { method: 'HEAD' }, 8000);
    return r.ok;
  } catch { return false; }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) { err.stderr = stderr; reject(err); } else resolve(stdout);
    });
  });
}

function exists(p) { try { return !!p && fs.existsSync(p); } catch { return false; } }

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

// Parcourt un dossier jusqu'à une profondeur donnée.
function walk(dir, maxDepth, onFile, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth < maxDepth && !e.name.startsWith('.')) walk(full, maxDepth, onFile, depth + 1);
    } else if (e.isFile()) {
      onFile(full, e.name, depth);
    }
  }
}

function findFile(dir, nameRe, maxDepth = 4) {
  let found = null;
  walk(dir, maxDepth, (full, name) => { if (!found && nameRe.test(name)) found = full; });
  return found;
}

function copyDir(src, dst, filter = () => true) {
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyDir(s, d, filter);
    else if (filter(s)) { fs.copyFileSync(s, d); n++; }
  }
  return n;
}

module.exports = {
  UA, slug, normTitle, cleanRomTitle, switchTitleId, similarity, strictSimilarity,
  fetchWithTimeout, fetchJson, urlExists, run, exists, readText, walk, findFile, copyDir,
};
