// Téléchargement, installation et lancement des émulateurs.
// Chaque émulateur est récupéré uniquement depuis sa source officielle.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { fetchJson, fetchWithTimeout, run, exists, findFile, walk } = require('./util');

const EMULATORS = {
  melonds: {
    id: 'melonds', name: 'melonDS', platforms: ['ds'],
    blurb: 'Nintendo DS. Stable et précis, aucun fichier système nécessaire.',
    sources: [{ type: 'github', repo: 'melonDS-emu/melonDS' }],
    page: 'https://melonds.kuribo64.net/downloads.php',
    exe: /^melonDS\.exe$/i,
    portable: null,
    needsKeys: false,
    args: (rom, fs) => [...(fs ? ['-f'] : []), rom],
  },
  azahar: {
    id: 'azahar', name: 'Azahar', platforms: ['3ds'],
    blurb: 'Nintendo 3DS. Successeur officiel de Citra. Les jeux doivent être déchiffrés.',
    sources: [{ type: 'github', repo: 'azahar-emu/azahar' }],
    page: 'https://azahar-emu.org/',
    exe: /^azahar\.exe$/i,
    prefer: [/msvc/i],
    portable: 'user',
    needsKeys: false,
    args: (rom, fs) => [...(fs ? ['-f'] : []), rom],
  },
  eden: {
    id: 'eden', name: 'Eden', platforms: ['switch'],
    blurb: 'Nintendo Switch. Le plus suivi des successeurs de Yuzu.',
    sources: [
      { type: 'forgejo', api: 'https://git.eden-emu.dev/api/v1/repos/eden-emu/eden/releases' },
      { type: 'github', repo: 'eden-emulator/Releases' },
    ],
    page: 'https://eden-emu.dev/',
    exe: /^eden\.exe$/i,
    prefer: [/msvc/i, /amd64|x86_64|x64/i],
    portable: 'user',
    needsKeys: true,
    args: (rom, fs) => [...(fs ? ['-f'] : []), '-g', rom],
  },
  lichii: {
    id: 'lichii', name: 'Lichii', platforms: ['switch2', 'switch'],
    blurb: 'Nintendo Switch 2. Très expérimental : bugs fréquents, bon PC requis.',
    experimental: true,
    sources: [{ type: 'github', repo: 'zortos293/Lichii', prerelease: true }],
    page: 'https://github.com/zortos293/Lichii/releases',
    exe: /^lichii\.exe$/i,
    prefer: [/pgo/i],
    portable: 'user',
    needsKeys: true,
    args: (rom, fs) => [...(fs ? ['-f'] : []), '-g', rom],
  },
};

// Émulateur utilisé par défaut pour chaque console.
const DEFAULT_EMU = { ds: 'melonds', '3ds': 'azahar', switch: 'eden', switch2: 'lichii' };

// Choisit le bon fichier Windows parmi ceux d'une version.
function pickAsset(assets, def) {
  const scored = [];
  for (const a of assets || []) {
    const n = a.name || '';
    if (!/\.zip$/i.test(n)) continue;
    if (!/win/i.test(n)) continue;
    if (/arm64|aarch64|source|src|pdb|debug|symbols|libretro|android|room/i.test(n)) continue;
    let score = 1;
    for (const re of def.prefer || []) if (re.test(n)) score += 2;
    if (/x86_64|amd64|x64/i.test(n)) score += 1;
    scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored[0] ? scored[0].a : null;
}

async function latestRelease(def) {
  const errors = [];
  for (const src of def.sources) {
    try {
      let list;
      if (src.type === 'github') {
        list = await fetchJson(`https://api.github.com/repos/${src.repo}/releases?per_page=15`,
          { headers: { Accept: 'application/vnd.github+json' } });
      } else {
        list = await fetchJson(`${src.api}?limit=15`);
      }
      for (const rel of list) {
        if (rel.draft) continue;
        if (rel.prerelease && !src.prerelease) continue;
        const asset = pickAsset(rel.assets, def);
        if (asset) {
          return {
            version: rel.tag_name || rel.name,
            url: asset.browser_download_url,
            file: asset.name,
            size: asset.size || 0,
            date: rel.published_at || rel.created_at,
          };
        }
      }
      // Aucune version stable avec un fichier Windows : on accepte une préversion.
      for (const rel of list) {
        const asset = pickAsset(rel.assets, def);
        if (asset) return { version: rel.tag_name, url: asset.browser_download_url, file: asset.name, size: asset.size || 0, date: rel.published_at };
      }
      errors.push(`${src.repo || src.api} : aucun fichier Windows trouvé`);
    } catch (e) {
      errors.push(`${src.repo || new URL(src.api).host} : ${e.message}`);
    }
  }
  throw new Error('Impossible de trouver la dernière version. ' + errors.join(' · '));
}

async function download(url, dest, onProgress) {
  const r = await fetchWithTimeout(url, {}, 30 * 60 * 1000);
  if (!r.ok) throw new Error(`Téléchargement refusé (HTTP ${r.status})`);
  const total = Number(r.headers.get('content-length')) || 0;
  let done = 0, last = 0;
  const body = Readable.fromWeb(r.body);
  body.on('data', (chunk) => {
    done += chunk.length;
    const now = Date.now();
    if (now - last > 150) { last = now; onProgress && onProgress(done, total); }
  });
  await pipeline(body, fs.createWriteStream(dest));
  onProgress && onProgress(done, total || done);
}

async function extractZip(zip, dest) {
  fs.mkdirSync(dest, { recursive: true });
  try {
    // tar.exe est fourni avec Windows 10 et 11 et lit les .zip.
    await run(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', dest]);
  } catch {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`]);
  }
}

// Installe ou met à jour un émulateur dans <racine>/Emulateurs/<nom>.
async function install(id, root, prev, onProgress) {
  const def = EMULATORS[id];
  onProgress({ step: 'Recherche de la dernière version…' });
  const rel = await latestRelease(def);
  if (prev && prev.version === rel.version && exists(prev.exe)) {
    return { ...prev, upToDate: true };
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-'));
  const zip = path.join(tmpDir, rel.file);
  try {
    onProgress({ step: `Téléchargement de ${def.name} ${rel.version}`, done: 0, total: rel.size });
    await download(rel.url, zip, (done, total) => onProgress({ step: `Téléchargement de ${def.name} ${rel.version}`, done, total }));
    const res = await installFromZip(id, root, zip, onProgress);
    return { ...res, version: rel.version, date: rel.date };
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// Installe depuis un .zip déjà téléchargé (si le téléchargement automatique échoue).
async function installFromZip(id, root, zip, onProgress = () => {}) {
  const def = EMULATORS[id];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-zip-'));
  try {
    onProgress({ step: 'Décompression…' });
    const staging = path.join(tmpDir, 'out');
    await extractZip(zip, staging);
    const exeInStaging = findFile(staging, def.exe, 4);
    if (!exeInStaging) throw new Error(`${def.name} : fichier ${def.exe.source.replace(/[\\^$]/g, '')} introuvable dans l'archive. Vérifie que c'est bien la version Windows.`);

    const target = path.join(root, 'Emulateurs', def.name);
    fs.mkdirSync(target, { recursive: true });
    // Les données (dossier user, réglages de melonDS) sont gardées pendant une mise à jour.
    const appRoot = path.dirname(exeInStaging);
    for (const e of fs.readdirSync(target)) {
      if (/^(user|melonDS\.toml|melonDS\.ini)$/i.test(e)) continue;
      fs.rmSync(path.join(target, e), { recursive: true, force: true });
    }
    for (const e of fs.readdirSync(appRoot)) {
      if (/^(user|melonDS\.toml)$/i.test(e) && exists(path.join(target, e))) continue;
      fs.cpSync(path.join(appRoot, e), path.join(target, e), { recursive: true, force: true });
    }
    if (def.portable) fs.mkdirSync(path.join(target, def.portable), { recursive: true });
    const exe = findFile(target, def.exe, 1);
    onProgress({ step: 'Terminé' });
    const ver = (path.basename(zip).match(/(\d+(?:\.\d+)+(?:-[\w.]+)?|build-\d+)/i) || [])[1] || 'perso';
    return { installed: true, version: ver, exe, dir: target, custom: false };
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

async function checkUpdate(id) {
  const rel = await latestRelease(EMULATORS[id]);
  return rel.version;
}

// Dossier de données de l'émulateur (portable si possible).
function userDir(id, emu) {
  const def = EMULATORS[id];
  if (!emu || !emu.exe) return null;
  const local = path.join(path.dirname(emu.exe), def.portable || 'user');
  if (def.portable && exists(local)) return local;
  const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const guess = { eden: 'eden', lichii: 'eden', azahar: 'Azahar' }[id];
  return guess ? path.join(appdata, guess) : local;
}

// Copie prod.keys (et title.keys s'il est à côté) dans le dossier keys.
function installKeys(id, emu, prodKeysPath) {
  const dir = userDir(id, emu);
  if (!dir) throw new Error("Installe d'abord l'émulateur.");
  const keysDir = path.join(dir, 'keys');
  fs.mkdirSync(keysDir, { recursive: true });
  const copied = [];
  const srcDir = path.dirname(prodKeysPath);
  fs.copyFileSync(prodKeysPath, path.join(keysDir, 'prod.keys'));
  copied.push('prod.keys');
  for (const extra of ['title.keys', 'key_retail.bin']) {
    const p = path.join(srcDir, extra);
    if (exists(p)) { fs.copyFileSync(p, path.join(keysDir, extra)); copied.push(extra); }
  }
  return { keysDir, copied };
}

// Installe un firmware (dossier ou .zip de fichiers .nca issus de ta console).
async function installFirmware(id, emu, source) {
  const dir = userDir(id, emu);
  if (!dir) throw new Error("Installe d'abord l'émulateur.");
  let from = source, tmp = null;
  if (/\.zip$/i.test(source)) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-fw-'));
    await extractZip(source, tmp);
    from = tmp;
  }
  const ncas = [];
  walk(from, 4, (full, name) => { if (/\.nca$/i.test(name)) ncas.push(full); });
  if (!ncas.length) {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    throw new Error('Aucun fichier .nca trouvé. Choisis le dossier du firmware extrait de ta console.');
  }
  const dest = path.join(dir, 'nand', 'system', 'Contents', 'registered');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ncas) fs.copyFileSync(f, path.join(dest, path.basename(f)));
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  return { count: ncas.length, dest };
}

function keysStatus(id, emu) {
  const def = EMULATORS[id];
  if (!def.needsKeys) return null;
  const dir = userDir(id, emu);
  if (!dir) return { keys: false, firmware: false };
  const fwDir = path.join(dir, 'nand', 'system', 'Contents', 'registered');
  let firmware = false;
  try { firmware = fs.readdirSync(fwDir).some((f) => /\.nca$/i.test(f) || fs.statSync(path.join(fwDir, f)).isDirectory()); } catch {}
  return { keys: exists(path.join(dir, 'keys', 'prod.keys')), firmware };
}

module.exports = { EMULATORS, DEFAULT_EMU, pickAsset, latestRelease, install, installFromZip, checkUpdate, installKeys, installFirmware, keysStatus, userDir };
