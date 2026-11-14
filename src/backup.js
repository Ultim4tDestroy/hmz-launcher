// Sauvegarde automatique des parties : après chaque session, le dossier de
// sauvegardes de l'émulateur est compressé dans HMZ\Sauvegardes\<émulateur>.
// Les 15 dernières sauvegardes de chaque émulateur sont gardées.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { run, exists, walk } = require('./util');

const KEEP = 15;

function sources(id, emu, romDirs) {
  const dir = emu && emu.exe ? path.dirname(emu.exe) : null;
  if (!dir) return [];
  if (id === 'eden' || id === 'lichii') return [path.join(dir, 'user', 'nand', 'user', 'save'), path.join(dir, 'user', 'nand', 'system', 'save')];
  if (id === 'azahar') return [path.join(dir, 'user', 'sdmc'), path.join(dir, 'user', 'nand', 'data')];
  if (id === 'melonds') {
    // melonDS range les sauvegardes (.sav) à côté des jeux.
    const files = [];
    for (const d of romDirs.ds || []) walk(d, 3, (full, name) => { if (/\.(sav|dsv)$/i.test(name)) files.push(full); });
    return files;
  }
  const roms = (p, re) => { const files = []; for (const d of romDirs[p] || []) walk(d, 3, (full, name) => { if (re.test(name)) files.push(full); }); return files; };
  switch (id) {
    case 'duckstation': return [path.join(dir, 'memcards')];
    case 'pcsx2': return [path.join(dir, 'memcards')];
    case 'ppsspp': return [path.join(dir, 'memstick', 'PSP', 'SAVEDATA')];
    case 'dolphin': return [path.join(dir, 'User', 'GC'), path.join(dir, 'User', 'Wii', 'title')];
    case 'rpcs3': return [path.join(dir, 'dev_hdd0', 'home', '00000001', 'savedata')];
    case 'cemu': return [path.join(dir, 'mlc01', 'usr', 'save')];
    case 'vita3k': return [path.join(dir, 'ux0', 'user', '00', 'savedata')];
    case 'rmg': return [path.join(dir, 'Save')];
    case 'flycast': return [path.join(dir, 'data')];
    case 'mgba': return [...roms('gba', /\.sav$/i), ...roms('gb', /\.sav$/i)];
    case 'snes9x': return [path.join(dir, 'Saves')];
    case 'desmume': return [path.join(dir, 'Battery'), ...roms('ds', /\.dsv$/i)];
    case 'xenia': return [path.join(dir, 'content')];
    case 'xemu': return [];
    default: return [];
  }
}

function latestMtime(paths) {
  let m = 0;
  for (const p of paths) {
    try {
      const st = fs.statSync(p);
      if (st.isFile()) m = Math.max(m, st.mtimeMs);
      else walk(p, 8, (full) => { try { m = Math.max(m, fs.statSync(full).mtimeMs); } catch {} });
    } catch {}
  }
  return m;
}

async function zipFolder(src, out) {
  const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  try {
    await run(tar, ['-a', '-c', '-f', out, '-C', src, '.']);
  } catch {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Compress-Archive -Path '${src.replace(/'/g, "''")}\\*' -DestinationPath '${out.replace(/'/g, "''")}' -Force`]);
  }
}

// Renvoie le chemin du .zip créé, ou null si rien n'a changé depuis la dernière fois.
async function backup(id, name, emu, romDirs, backupRoot, lastMtime) {
  const src = sources(id, emu, romDirs).filter(exists);
  if (!src.length) return { file: null, mtime: lastMtime };
  const m = latestMtime(src);
  if (lastMtime && m <= lastMtime) return { file: null, mtime: lastMtime };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-save-'));
  try {
    for (const s of src) {
      const dest = path.join(tmp, path.basename(s));
      if (fs.statSync(s).isFile()) fs.copyFileSync(s, dest);
      else fs.cpSync(s, dest, { recursive: true });
    }
    const outDir = path.join(backupRoot, name);
    fs.mkdirSync(outDir, { recursive: true });
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    const out = path.join(outDir, `${name}_${stamp}.zip`);
    await zipFolder(tmp, out);
    prune(outDir);
    return { file: out, mtime: m };
  } finally {
    fs.rm(tmp, { recursive: true, force: true }, () => {});
  }
}

function prune(dir) {
  const zips = fs.readdirSync(dir).filter((f) => /\.zip$/i.test(f)).sort();
  for (const f of zips.slice(0, Math.max(0, zips.length - KEEP))) fs.rmSync(path.join(dir, f), { force: true });
}

module.exports = { backup, sources, prune, KEEP };
