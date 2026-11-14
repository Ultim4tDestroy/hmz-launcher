// Réglages écrits automatiquement dans les émulateurs : graphismes adaptés à la
// carte graphique, manette, dossiers de jeux, fermeture sans confirmation.
const fs = require('fs');
const path = require('path');
const { run, exists } = require('./util');

// --- Fichiers .ini (Eden, Lichii, Azahar) et .toml simples (melonDS) ----------------
function readLines(file) { try { return fs.readFileSync(file, 'utf8').split(/\r?\n/); } catch { return []; } }

// Modifie des clés dans des sections, en gardant tout le reste du fichier.
function setKeys(file, sections, sep = '=') {
  const lines = readLines(file);
  for (const [section, kv] of Object.entries(sections)) {
    let start = lines.findIndex((l) => l.trim() === `[${section}]`);
    if (start < 0) {
      if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(`[${section}]`);
      start = lines.length - 1;
    }
    let end = lines.findIndex((l, i) => i > start && /^\s*\[.*\]\s*$/.test(l));
    if (end < 0) end = lines.length;
    for (const [k, v] of Object.entries(kv)) {
      const re = new RegExp(`^\\s*${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${sep === '=' ? '=' : '='}`);
      const idx = lines.findIndex((l, i) => i > start && i < end && re.test(l));
      const line = sep === '=' ? `${k}=${v}` : `${k} = ${v}`;
      if (idx >= 0) lines[idx] = line;
      else {
        let ins = end;
        while (ins > start + 1 && lines[ins - 1].trim() === '') ins--;
        lines.splice(ins, 0, line);
        end++;
      }
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\r\n').replace(/(\r\n)*$/, '\r\n'));
}

function getKey(file, section, key) {
  const lines = readLines(file);
  const start = lines.findIndex((l) => l.trim() === `[${section}]`);
  if (start < 0) return undefined;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[.*\]\s*$/.test(lines[i])) break;
    const m = lines[i].match(/^\s*([^=]+?)\s*=\s*(.*)$/);
    if (m && m[1] === key) return m[2];
  }
  return undefined;
}

// Dans les .ini de Yuzu/Citra, une valeur n'est lue que si « clé\default » vaut false.
function qt(kv) {
  const out = {};
  for (const [k, v] of Object.entries(kv)) { out[`${k}\\default`] = 'false'; out[k] = v; }
  return out;
}

// --- Puissance de la carte graphique -------------------------------------------------
let gpuCache = null;
async function detectGpu() {
  if (gpuCache) return gpuCache;
  let names = [];
  if (process.platform === 'win32') {
    try {
      const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '(Get-CimInstance Win32_VideoController).Name']);
      names = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    } catch {}
  }
  gpuCache = { names, tier: gpuTier(names) };
  return gpuCache;
}

// 3 : carte récente puissante · 2 : milieu de gamme · 1 : graphique intégré ou ancien
function gpuTier(names) {
  let best = 1;
  for (const n of names) {
    let t = 1;
    if (/RTX\s*(30[6-9]0|40[6-9]0|50\d0)|RX\s*(6[7-9]\d{2}|7[6-9]\d{2}|9\d{3})|Arc\s*B\d{3}/i.test(n)) t = 3;
    else if (/RTX\s*(20\d0|30[5]0|40[5]0)|GTX\s*(16\d0|10[7-8]0)|RX\s*(5[6-7]\d{2}|6[5-6]\d{2}|7600)|Arc\s*A\d{3}/i.test(n)) t = 2;
    else if (/GTX|RX\s*\d{3,4}|Radeon\s*Pro/i.test(n)) t = 2;
    best = Math.max(best, t);
  }
  return best;
}

// --- Manette pour melonDS --------------------------------------------------------------
// melonDS lit la manette « brute » (SDL joystick) : les numéros de boutons dépendent
// du type de manette. Sur DS, A est à droite et B en bas, comme sur une manette Nintendo.
const HAT = { up: 0x101, right: 0x102, down: 0x104, left: 0x108 };
function melonPadMap(kind) {
  if (kind === 'xbox' || kind === 'generic') {
    return { A: 1, B: 0, X: 3, Y: 2, L: 4, R: 5, Select: 6, Start: 7, Up: HAT.up, Down: HAT.down, Left: HAT.left, Right: HAT.right };
  }
  // PlayStation et Switch Pro passent par les pilotes HIDAPI de SDL,
  // qui numérotent les boutons dans l'ordre standard des manettes.
  return { A: 1, B: 0, X: 3, Y: 2, L: 9, R: 10, Select: 4, Start: 6, Up: 11, Down: 12, Left: 13, Right: 14 };
}

function pickPadKind(kinds) {
  if (!kinds || !kinds.length) return 'xbox';
  for (const k of ['xbox', 'playstation', 'switch', 'generic']) if (kinds.includes(k)) return k;
  return kinds[0];
}

// --- Application des réglages ------------------------------------------------------------
async function apply(id, emu, opts) {
  const dir = path.dirname(emu.exe);
  const { tier } = await detectGpu();
  const done = [];

  if (id === 'eden' || id === 'lichii') {
    const file = path.join(dir, 'user', 'config', 'qt-config.ini');
    // Résolution : 0 = 0,5x · 2 = 1x · 3 = 1,5x · 4 = 2x
    const res = id === 'lichii' ? 2 : ({ 3: 4, 2: 3, 1: 2 }[tier]);
    setKeys(file, {
      Renderer: qt({ backend: '1', resolution_setup: String(res), use_disk_shader_cache: 'true', use_asynchronous_shaders: 'true' }),
      UI: qt({ confirmClose: 'false', hideInactiveMouse: 'true' }),
    });
    done.push('graphismes', 'fermeture sans confirmation');
    if (opts.gameDirs && opts.gameDirs.length) { addYuzuGameDirs(file, opts.gameDirs); done.push('dossiers de jeux'); }
  }

  if (id === 'azahar') {
    const file = path.join(dir, 'user', 'config', 'qt-config.ini');
    setKeys(file, {
      Renderer: qt({ graphics_api: '2', resolution_factor: String({ 3: 4, 2: 3, 1: 2 }[tier]), use_disk_shader_cache: 'true' }),
      UI: qt({ confirmClose: 'false', hideInactiveMouse: 'true' }),
    });
    done.push('graphismes', 'fermeture sans confirmation');
  }

  if (id === 'melonds') {
    const file = path.join(dir, 'melonDS.toml');
    const map = melonPadMap(pickPadKind(opts.padKinds));
    setKeys(file, {
      '3D': { Renderer: tier >= 2 ? '2' : '1' },
      '3D.GL': { ScaleFactor: String({ 3: 4, 2: 3, 1: 2 }[tier]) },
      Instance0: { JoystickID: '0' },
      'Instance0.Joystick': Object.fromEntries(Object.entries(map).map(([k, v]) => [k, String(v)])),
    }, ' = ');
    done.push('graphismes', 'manette');
  }
  return { done, tier };
}

// Ajoute des dossiers à la liste de jeux de Yuzu/Eden, sans toucher aux existants.
function addYuzuGameDirs(file, dirs) {
  const n = Number(getKey(file, 'UI', 'Paths\\gamedirs\\size')) || 0;
  const entries = [];
  for (let i = 1; i <= n; i++) {
    const p = getKey(file, 'UI', `Paths\\gamedirs\\${i}\\path`);
    if (p !== undefined) entries.push({
      path: p,
      deep: getKey(file, 'UI', `Paths\\gamedirs\\${i}\\deep_scan`) || 'false',
      expanded: getKey(file, 'UI', `Paths\\gamedirs\\${i}\\expanded`) || 'true',
    });
  }
  if (!entries.length) for (const p of ['SDMC', 'UserNAND', 'SysNAND']) entries.push({ path: p, deep: 'false', expanded: 'true' });
  const norm = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  for (const d of dirs) {
    const fwd = d.replace(/\\/g, '/');
    if (!entries.some((e) => norm(e.path) === norm(fwd))) entries.push({ path: fwd, deep: 'true', expanded: 'true' });
  }
  const kv = {};
  entries.forEach((e, i) => {
    kv[`Paths\\gamedirs\\${i + 1}\\path`] = e.path;
    kv[`Paths\\gamedirs\\${i + 1}\\deep_scan`] = e.deep;
    kv[`Paths\\gamedirs\\${i + 1}\\expanded`] = e.expanded;
  });
  kv['Paths\\gamedirs\\size'] = String(entries.length);
  setKeys(file, { UI: kv });
}

module.exports = { apply, setKeys, getKey, addYuzuGameDirs, gpuTier, detectGpu, melonPadMap, pickPadKind };
