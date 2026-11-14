// Téléchargement, installation et lancement des émulateurs.
// Chaque émulateur est récupéré uniquement depuis sa source officielle.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { fetchJson, fetchWithTimeout, run, exists, findFile, walk } = require('./util');

// fs = plein écran demandé dans les réglages de HMZ.
const EMULATORS = {
  // --- Nintendo -------------------------------------------------------------------------------
  lichii: {
    name: 'Lichii', platforms: ['switch2', 'switch'], experimental: true,
    blurb: 'Nintendo Switch 2. Très expérimental : bugs fréquents, bon PC requis.',
    sources: [{ type: 'github', repo: 'zortos293/Lichii', prerelease: true }],
    page: 'https://github.com/zortos293/Lichii/releases',
    exe: /^lichii\.exe$/i, prefer: [/pgo/i], portable: 'user', needsKeys: true,
    args: (rom, fs) => [...(fs ? ['-f'] : []), '-g', rom],
  },
  eden: {
    name: 'Eden', platforms: ['switch'],
    blurb: 'Nintendo Switch. Le plus suivi des successeurs de Yuzu.',
    sources: [
      { type: 'forgejo', api: 'https://git.eden-emu.dev/api/v1/repos/eden-emu/eden/releases' },
      { type: 'github', repo: 'eden-emulator/Releases' },
    ],
    page: 'https://eden-emu.dev/',
    exe: /^eden\.exe$/i, prefer: [/msvc/i, /amd64|x86_64|x64/i], portable: 'user', needsKeys: true,
    args: (rom, fs) => [...(fs ? ['-f'] : []), '-g', rom],
  },
  cemu: {
    name: 'Cemu', platforms: ['wiiu'],
    blurb: 'Wii U. Très bien optimisé, la plupart des grands jeux tournent parfaitement.',
    needs: 'Les jeux chiffrés (.wud, .wux) demandent le fichier keys.txt de ta console ; les .wua et .rpx non.',
    sources: [{ type: 'github', repo: 'cemu-project/Cemu', prerelease: true }],
    page: 'https://cemu.info/',
    exe: /^cemu\.exe$/i, portable: 'portable',
    args: (rom, fs) => [...(fs ? ['-f'] : []), '-g', rom],
  },
  dolphin: {
    name: 'Dolphin', platforms: ['gc', 'wii'],
    blurb: 'GameCube et Wii. La référence, compatible avec presque tous les jeux.',
    sources: [{ type: 'scrape', page: 'https://dolphin-emu.org/download/', re: /https:\/\/dl\.dolphin-emu\.org\/releases\/([\w.-]+)\/dolphin-[\w.-]+-x64\.7z/ }],
    page: 'https://dolphin-emu.org/download/',
    exe: /^dolphin\.exe$/i, portableFile: 'portable.txt',
    args: (rom, fs) => ['-b', ...(fs ? ['-C', 'Dolphin.Display.Fullscreen=True'] : []), '-e', rom],
  },
  azahar: {
    name: 'Azahar', platforms: ['3ds'],
    blurb: 'Nintendo 3DS. Successeur officiel de Citra. Les jeux doivent être déchiffrés.',
    sources: [{ type: 'github', repo: 'azahar-emu/azahar' }],
    page: 'https://azahar-emu.org/',
    exe: /^azahar\.exe$/i, prefer: [/msvc/i], portable: 'user',
    args: (rom, fs) => [...(fs ? ['-f'] : []), rom],
  },
  melonds: {
    name: 'melonDS', platforms: ['ds'],
    blurb: 'Nintendo DS. Stable et précis, aucun fichier système nécessaire.',
    sources: [{ type: 'github', repo: 'melonDS-emu/melonDS' }],
    page: 'https://melonds.kuribo64.net/downloads.php',
    exe: /^melonDS\.exe$/i,
    args: (rom, fs) => [...(fs ? ['-f'] : []), rom],
  },
  desmume: {
    name: 'DeSmuME', platforms: ['ds'],
    blurb: 'Nintendo DS. Plus ancien que melonDS, pratique en second choix.',
    sources: [{ type: 'github', repo: 'TASEmulators/desmume', prerelease: true }],
    page: 'https://desmume.org/download/',
    exe: [/^desmume.*x64.*\.exe$/i, /^desmume.*\.exe$/i], prefer: [/x64|win64/i], asset: /win/i,
    args: (rom) => [rom],
  },
  rmg: {
    name: "Rosalie's Mupen GUI", platforms: ['n64'],
    blurb: 'Nintendo 64. Basé sur Mupen64Plus, simple et précis.',
    sources: [{ type: 'github', repo: 'Rosalie241/RMG' }],
    page: 'https://github.com/Rosalie241/RMG/releases',
    exe: /^rmg\.exe$/i, prefer: [/portable/i], asset: /windows/i,
    args: (rom, fs) => [...(fs ? ['--fullscreen'] : []), rom],
  },
  snes9x: {
    name: 'Snes9x', platforms: ['snes'],
    blurb: 'Super Nintendo. Léger et compatible avec toute la ludothèque.',
    sources: [{ type: 'github', repo: 'snes9xgit/snes9x' }],
    page: 'https://www.snes9x.com/',
    exe: [/^snes9x-x64\.exe$/i, /^snes9x.*\.exe$/i], prefer: [/x64/i], asset: /win/i,
    args: (rom, fs) => [...(fs ? ['-fullscreen'] : []), rom],
  },
  mesen: {
    name: 'Mesen', platforms: ['nes', 'snes', 'gb', 'gba'],
    blurb: 'NES, Super Nintendo, Game Boy et GBA. Très précis, idéal pour la NES.',
    needs: 'Demande .NET 8 (Windows le propose au premier lancement si besoin).',
    sources: [{ type: 'github', repo: 'SourMesen/Mesen2', prerelease: true }],
    page: 'https://www.mesen.ca/',
    exe: /^mesen\.exe$/i, asset: /windows/i, prefer: [/x64/i],
    args: (rom, fs) => [rom, ...(fs ? ['--fullscreen'] : [])],
  },
  mgba: {
    name: 'mGBA', platforms: ['gba', 'gb'],
    blurb: 'Game Boy Advance, Game Boy et Game Boy Color. Rapide et précis.',
    sources: [{ type: 'github', repo: 'mgba-emu/mgba' }],
    page: 'https://mgba.io/downloads.html',
    exe: /^mgba\.exe$/i, prefer: [/win64/i], asset: /win(64|32)?\.(7z|zip)$/i, portableFile: 'portable.ini',
    args: (rom, fs) => [...(fs ? ['-f'] : []), rom],
  },

  // --- PlayStation ----------------------------------------------------------------------------
  shadps4: {
    name: 'shadPS4', platforms: ['ps4'], experimental: true,
    blurb: 'PlayStation 4. Expérimental : une partie des jeux seulement, PC puissant requis.',
    needs: 'Un jeu PS4 est un dossier (CUSA…) contenant eboot.bin, issu de ta console.',
    sources: [{ type: 'github', repo: 'shadps4-emu/shadPS4' }],
    page: 'https://shadps4.net/',
    exe: /^shadps4\.exe$/i, prefer: [/sdl/i], asset: /win/i,
    args: (rom, fs) => ['-g', rom, ...(fs ? ['-f', 'true'] : [])],
  },
  rpcs3: {
    name: 'RPCS3', platforms: ['ps3'],
    blurb: 'PlayStation 3. Des milliers de jeux jouables, bon processeur conseillé.',
    needs: "Le firmware PS3 se télécharge gratuitement sur le site de Sony (PS3UPDAT.PUP), puis s'installe dans RPCS3 : Fichier › Installer le firmware.",
    sources: [{ type: 'github', repo: 'RPCS3/rpcs3-binaries-win' }],
    page: 'https://rpcs3.net/download',
    exe: /^rpcs3\.exe$/i, asset: /win64/i,
    args: (rom, fs) => ['--no-gui', ...(fs ? ['--fullscreen'] : []), rom],
  },
  pcsx2: {
    name: 'PCSX2', platforms: ['ps2'],
    blurb: 'PlayStation 2. Excellente compatibilité, rendu en haute définition.',
    needs: 'Demande le BIOS de ta PS2 (à placer dans le dossier bios de PCSX2).',
    sources: [{ type: 'github', repo: 'PCSX2/pcsx2' }],
    page: 'https://pcsx2.net/downloads',
    exe: [/^pcsx2-qt\.exe$/i, /^pcsx2(x64)?(-avx2)?\.exe$/i], asset: /windows.*\.7z$/i, prefer: [/qt/i], portableFile: 'portable.ini',
    args: (rom, fs) => [...(fs ? ['-fullscreen'] : []), '-batch', '--', rom],
  },
  duckstation: {
    name: 'DuckStation', platforms: ['ps1'],
    blurb: 'PlayStation. Rapide, précis, avec amélioration de la résolution.',
    needs: 'Demande le BIOS de ta PS1 (à placer dans le dossier bios de DuckStation).',
    sources: [{ type: 'github', repo: 'stenzek/duckstation', prerelease: true }],
    page: 'https://www.duckstation.org/',
    exe: [/^duckstation-qt-x64-releaseltcg\.exe$/i, /^duckstation-qt.*\.exe$/i], asset: /windows-x64-release\.zip$/i, portableFile: 'portable.txt',
    args: (rom, fs) => [...(fs ? ['-fullscreen'] : []), '-batch', '--', rom],
  },
  vita3k: {
    name: 'Vita3K', platforms: ['vita'], experimental: true,
    blurb: "PS Vita. Expérimental. Un fichier .vpk ouvert ici est installé dans l'émulateur.",
    needs: "Le firmware PS Vita se télécharge gratuitement sur le site de Sony ; Vita3K le demande au premier lancement.",
    sources: [{ type: 'github', repo: 'Vita3K/Vita3K', prerelease: true }],
    page: 'https://vita3k.org/',
    exe: /^vita3k\.exe$/i, asset: /windows/i,
    args: (rom, fs) => [...(fs ? ['-F'] : []), rom],
  },
  ppsspp: {
    name: 'PPSSPP', platforms: ['psp'],
    blurb: 'PSP. Fluide même sur un petit PC, rendu en haute définition.',
    sources: [{ type: 'scrape', page: 'https://www.ppsspp.org/download/', re: /\/files\/(\d+_\d+(?:_\d+)?)\/ppsspp_win\.zip/, base: 'https://www.ppsspp.org' }],
    page: 'https://www.ppsspp.org/download/',
    exe: /^ppssppwindows64\.exe$/i,
    args: (rom, fs) => [...(fs ? ['--fullscreen'] : []), rom],
  },

  // --- Xbox ------------------------------------------------------------------------------------
  xenia: {
    name: 'Xenia Canary', platforms: ['x360'], experimental: true,
    blurb: 'Xbox 360. Expérimental mais déjà beaucoup de jeux jouables.',
    sources: [{ type: 'github', repo: 'xenia-canary/xenia-canary-releases', prerelease: true }],
    page: 'https://xenia.jp/',
    exe: /^xenia_canary\.exe$/i, asset: /windows/i, portableFile: 'portable.txt',
    args: (rom, fs) => [...(fs ? ['--fullscreen=true'] : []), rom],
  },
  xemu: {
    name: 'xemu', platforms: ['xbox'],
    blurb: 'Xbox (la première). Fidèle et stable.',
    needs: "Demande trois fichiers de ta console : le BIOS, la ROM MCPX et l'image du disque dur. À choisir dans xemu au premier lancement.",
    sources: [{ type: 'github', repo: 'xemu-project/xemu' }],
    page: 'https://xemu.app/',
    exe: /^xemu\.exe$/i, asset: /win.*x86_64.*release\.zip$/i,
    args: (rom, fs) => [...(fs ? ['-full-screen'] : []), '-dvd_path', rom],
  },

  // --- Sega et plusieurs consoles -----------------------------------------------------------
  flycast: {
    name: 'Flycast', platforms: ['dc'],
    blurb: 'Dreamcast. Fonctionne sans BIOS pour la plupart des jeux.',
    sources: [{ type: 'github', repo: 'flyinghead/flycast' }],
    page: 'https://github.com/flyinghead/flycast/releases',
    exe: /^flycast\.exe$/i, asset: /win64/i,
    args: (rom, fs) => [...(fs ? ['-config', 'window:fullscreen=yes'] : []), rom],
  },
  ares: {
    name: 'ares', platforms: ['md', 'n64', 'snes', 'nes', 'gb', 'gba'],
    blurb: 'Mega Drive, Master System, Game Gear et beaucoup de consoles rétro en un seul programme.',
    sources: [{ type: 'github', repo: 'ares-emulator/ares' }],
    page: 'https://ares-emu.net/',
    exe: /^ares\.exe$/i, asset: /windows/i, prefer: [/x64|amd64/i],
    args: (rom, fs) => [...(fs ? ['--fullscreen'] : []), rom],
  },
};
for (const [id, d] of Object.entries(EMULATORS)) d.id = id;

// Émulateur conseillé pour chaque console (le premier installé sert sinon).
const DEFAULT_EMU = {
  switch2: 'lichii', switch: 'eden', wiiu: 'cemu', wii: 'dolphin', gc: 'dolphin', '3ds': 'azahar', ds: 'melonds',
  n64: 'rmg', snes: 'snes9x', nes: 'mesen', gba: 'mgba', gb: 'mgba',
  ps4: 'shadps4', ps3: 'rpcs3', ps2: 'pcsx2', ps1: 'duckstation', vita: 'vita3k', psp: 'ppsspp',
  x360: 'xenia', xbox: 'xemu', dc: 'flycast', md: 'ares',
};

// Émulateur à utiliser pour une console, selon ce qui est installé.
function emuFor(platform, isInstalled) {
  const def = DEFAULT_EMU[platform];
  if (def && isInstalled(def)) return def;
  const other = Object.values(EMULATORS).find((d) => d.platforms.includes(platform) && isInstalled(d.id));
  return other ? other.id : def || null;
}

const exeList = (def) => (Array.isArray(def.exe) ? def.exe : [def.exe]);
function findExe(dir, def, depth) {
  for (const re of exeList(def)) { const f = findFile(dir, re, depth); if (f) return f; }
  return null;
}

// Choisit le bon fichier Windows parmi ceux d'une version.
function pickAsset(assets, def) {
  const scored = [];
  for (const a of assets || []) {
    const n = a.name || '';
    if (!/\.(zip|7z)$/i.test(n)) continue;
    if (def.asset ? !def.asset.test(n) : !/win/i.test(n)) continue;
    if (/arm64|aarch64|source|src|pdb|debug|symbols|libretro|android|room|linux|macos|osx|darwin|appimage|dbg|installer|setup/i.test(n)) continue;
    let score = 1;
    for (const re of def.prefer || []) if (re.test(n)) score += 2;
    if (/x86_64|amd64|x64|win64/i.test(n)) score += 1;
    scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored[0] ? scored[0].a : null;
}

async function latestRelease(def) {
  const errors = [];
  for (const src of def.sources) {
    try {
      if (src.type === 'scrape') {
        // Page de téléchargement officielle (émulateurs qui ne publient pas sur GitHub).
        const r = await fetchWithTimeout(src.page, { headers: { 'User-Agent': 'Mozilla/5.0 HMZ-Launcher' } }, 20000);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const m = (await r.text()).match(src.re);
        if (!m) throw new Error('lien de téléchargement introuvable sur la page');
        const url = m[0].startsWith('http') ? m[0] : (src.base || '') + m[0];
        return { version: (m[1] || '').replace(/_/g, '.'), url, file: url.split('/').pop(), size: 0, date: null };
      }
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
      errors.push(`${src.repo || new URL(src.api || src.page).host} : ${e.message}`);
    }
  }
  throw new Error('Impossible de trouver la dernière version. ' + errors.join(' · '));
}

// Dossier des petits outils de HMZ (7zr.exe pour les archives .7z).
let toolsDir = path.join(os.tmpdir(), 'hmz-outils');
function setToolsDir(d) { toolsDir = d; }

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

// 7-Zip en ligne de commande (7zr.exe, version officielle), téléchargé une seule fois.
async function sevenZip() {
  const exe = path.join(toolsDir, '7zr.exe');
  if (exists(exe)) return exe;
  fs.mkdirSync(toolsDir, { recursive: true });
  const list = await fetchJson('https://api.github.com/repos/ip7z/7zip/releases?per_page=5', { headers: { Accept: 'application/vnd.github+json' } });
  const a = list.flatMap((r) => r.assets || []).find((x) => x.name === '7zr.exe');
  if (!a) throw new Error('7-Zip introuvable');
  await download(a.browser_download_url, exe + '.part');
  fs.renameSync(exe + '.part', exe);
  return exe;
}

async function extractArchive(file, dest) {
  if (/\.7z$/i.test(file)) {
    fs.mkdirSync(dest, { recursive: true });
    try {
      await run(await sevenZip(), ['x', '-y', `-o${dest}`, file]);
      return;
    } catch (e) {
      // Windows 11 sait aussi lire les .7z avec tar.
      try { await run(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', file, '-C', dest]); return; } catch {}
      throw new Error("Impossible d'ouvrir l'archive .7z (" + e.message + ')');
    }
  }
  return extractZip(file, dest);
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

// Fichiers et dossiers de l'utilisateur, gardés pendant une mise à jour :
// réglages, sauvegardes, BIOS, firmware, jeux installés dans l'émulateur…
const KEEP = /^(user|portable|portable\.(txt|ini)|memstick|config|configs|inis|gamesettings|bios|saves?|sstates|savestates|states|memcards|cache|shaders|covers|cheats|textures|dev_hdd0|dev_hdd1|dev_flash|dev_usb000|games\.yml|config\.yml|ux0|vs0|os0|sa0|pd0|keys\.txt|mlc01|.*\.(ini|toml|cfg|bml|yml))$/i;

// Installe depuis une archive (.zip ou .7z) déjà téléchargée.
async function installFromZip(id, root, zip, onProgress = () => {}) {
  const def = EMULATORS[id];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmz-zip-'));
  try {
    onProgress({ step: 'Décompression…' });
    const staging = path.join(tmpDir, 'out');
    await extractArchive(zip, staging);
    const exeInStaging = findExe(staging, def, 4);
    if (!exeInStaging) throw new Error(`${def.name} : programme introuvable dans l'archive. Vérifie que c'est bien la version Windows.`);

    const target = path.join(root, 'Emulateurs', def.name);
    fs.mkdirSync(target, { recursive: true });
    const appRoot = path.dirname(exeInStaging);
    for (const e of fs.readdirSync(target)) {
      if (KEEP.test(e)) continue;
      fs.rmSync(path.join(target, e), { recursive: true, force: true });
    }
    for (const e of fs.readdirSync(appRoot)) {
      if (KEEP.test(e) && exists(path.join(target, e))) continue;
      fs.cpSync(path.join(appRoot, e), path.join(target, e), { recursive: true, force: true });
    }
    // Mode portable : tout reste dans le dossier de l'émulateur.
    if (def.portable) fs.mkdirSync(path.join(target, def.portable), { recursive: true });
    if (def.portableFile && !exists(path.join(target, def.portableFile))) fs.writeFileSync(path.join(target, def.portableFile), '');
    const exe = findExe(target, def, 1);
    onProgress({ step: 'Terminé' });
    const ver = (path.basename(zip).match(/(\d+(?:\.\d+)+(?:-[\w.]+)?|build-\d+)/i) || [])[1] || 'perso';
    return { installed: true, version: ver, exe, dir: target, custom: false };
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }, () => {});
  }
}

// Supprime un émulateur installé par HMZ (son dossier entier, réglages compris).
// Un émulateur choisi à la main ailleurs sur le PC n'est jamais effacé : HMZ l'oublie seulement.
function uninstall(id, emu, root) {
  if (!emu || !emu.dir || emu.custom) return { removed: false };
  const base = path.resolve(root, 'Emulateurs') + path.sep;
  const dir = path.resolve(emu.dir);
  if (!dir.startsWith(base)) return { removed: false };
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
  return { removed: true, dir };
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

module.exports = { EMULATORS, DEFAULT_EMU, emuFor, uninstall, setToolsDir, extractArchive, pickAsset, latestRelease, install, installFromZip, checkUpdate, installKeys, installFirmware, keysStatus, userDir };
