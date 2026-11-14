// Toutes les consoles connues de HMZ : nom, couleur, dossier de jeux, extensions
// de fichiers, et noms utilisés pour retrouver les jaquettes.
// Les extensions partagées (.iso, .chd…) ne posent pas de problème : la console
// d'un jeu est donnée par le dossier où il se trouve.
const PLATFORMS = {
  pc: { label: 'PC', color: '#7aa2ff', family: 'pc' },
  mobile: { label: 'Mobile', color: '#3ddc84', family: 'pc' },

  switch2: { label: 'Switch 2', color: '#ff5a4e', family: 'nintendo', folder: 'Switch 2', ext: ['.nsp', '.xci', '.nsz', '.xcz', '.nro'], wiki: 'Nintendo Switch 2' },
  switch: { label: 'Switch', color: '#ff7a59', family: 'nintendo', folder: 'Switch', ext: ['.nsp', '.xci', '.nsz', '.xcz', '.nro'], wiki: 'Nintendo Switch' },
  wiiu: { label: 'Wii U', color: '#25a8d8', family: 'nintendo', folder: 'Wii U', ext: ['.wua', '.wud', '.wux', '.rpx'], wiki: 'Wii U', libretro: ['Nintendo_-_Wii_U'] },
  wii: { label: 'Wii', color: '#c9d2da', family: 'nintendo', folder: 'Wii', ext: ['.wbfs', '.rvz', '.iso', '.wad', '.gcz', '.ciso'], wiki: 'Wii', libretro: ['Nintendo_-_Wii'] },
  gc: { label: 'GameCube', color: '#8b7fd6', family: 'nintendo', folder: 'GameCube', ext: ['.rvz', '.iso', '.gcm', '.gcz', '.ciso'], wiki: 'GameCube', libretro: ['Nintendo_-_GameCube'] },
  '3ds': { label: '3DS', color: '#f6c344', family: 'nintendo', folder: '3DS', ext: ['.3ds', '.cci', '.cxi', '.3dsx', '.app', '.zcci', '.zcxi', '.z3dsx'], wiki: 'Nintendo 3DS', libretro: ['Nintendo_-_Nintendo_3DS'] },
  ds: { label: 'DS', color: '#7fd1b9', family: 'nintendo', folder: 'DS', ext: ['.nds', '.dsi', '.srl'], wiki: 'Nintendo DS', libretro: ['Nintendo_-_Nintendo_DS'] },
  n64: { label: 'Nintendo 64', color: '#3fb27f', family: 'nintendo', folder: 'Nintendo 64', ext: ['.z64', '.n64', '.v64'], wiki: 'Nintendo 64', libretro: ['Nintendo_-_Nintendo_64'] },
  snes: { label: 'Super Nintendo', color: '#9b8cff', family: 'nintendo', folder: 'Super Nintendo', ext: ['.sfc', '.smc'], wiki: 'Super Nintendo', libretro: ['Nintendo_-_Super_Nintendo_Entertainment_System'] },
  nes: { label: 'NES', color: '#e5484d', family: 'nintendo', folder: 'NES', ext: ['.nes', '.fds', '.unf'], wiki: 'NES', libretro: ['Nintendo_-_Nintendo_Entertainment_System'] },
  gba: { label: 'Game Boy Advance', color: '#7b6cf6', family: 'nintendo', folder: 'Game Boy Advance', ext: ['.gba'], wiki: 'Game Boy Advance', libretro: ['Nintendo_-_Game_Boy_Advance'] },
  gb: { label: 'Game Boy', color: '#a3c45a', family: 'nintendo', folder: 'Game Boy', ext: ['.gb', '.gbc'], wiki: 'Game Boy', libretro: ['Nintendo_-_Game_Boy_Color', 'Nintendo_-_Game_Boy'] },

  ps4: { label: 'PS4', color: '#2f6fe0', family: 'playstation', folder: 'PS4', ext: [], eboot: true, wiki: 'PlayStation 4' },
  ps3: { label: 'PS3', color: '#9aa4b2', family: 'playstation', folder: 'PS3', ext: ['.iso'], eboot: true, wiki: 'PlayStation 3', libretro: ['Sony_-_PlayStation_3'] },
  ps2: { label: 'PS2', color: '#4f6bd8', family: 'playstation', folder: 'PS2', ext: ['.iso', '.chd', '.cso', '.zso'], wiki: 'PlayStation 2', libretro: ['Sony_-_PlayStation_2'] },
  ps1: { label: 'PS1', color: '#b8bec8', family: 'playstation', folder: 'PS1', ext: ['.cue', '.chd', '.pbp', '.m3u', '.ecm', '.iso'], wiki: 'PlayStation', libretro: ['Sony_-_PlayStation'] },
  vita: { label: 'PS Vita', color: '#3d8bff', family: 'playstation', folder: 'PS Vita', ext: ['.vpk'], wiki: 'PlayStation Vita', libretro: ['Sony_-_PlayStation_Vita'] },
  psp: { label: 'PSP', color: '#d0d4da', family: 'playstation', folder: 'PSP', ext: ['.iso', '.cso', '.pbp', '.chd'], wiki: 'PlayStation Portable', libretro: ['Sony_-_PlayStation_Portable'] },

  x360: { label: 'Xbox 360', color: '#8dc63f', family: 'xbox', folder: 'Xbox 360', ext: ['.iso', '.xex', '.zar'], wiki: 'Xbox 360', libretro: ['Microsoft_-_Xbox_360'] },
  xbox: { label: 'Xbox', color: '#2fa84f', family: 'xbox', folder: 'Xbox', ext: ['.iso'], wiki: 'Xbox', libretro: ['Microsoft_-_Xbox'] },

  dc: { label: 'Dreamcast', color: '#f08a24', family: 'sega', folder: 'Dreamcast', ext: ['.gdi', '.cdi', '.chd'], wiki: 'Dreamcast', libretro: ['Sega_-_Dreamcast'] },
  md: { label: 'Mega Drive', color: '#3a7bd5', family: 'sega', folder: 'Mega Drive', ext: ['.md', '.gen', '.smd', '.32x', '.sms', '.gg'], wiki: 'Sega Genesis', libretro: ['Sega_-_Mega_Drive_-_Genesis'] },
};

// Consoles émulées (celles qui ont un dossier de jeux).
const EMULATED = Object.keys(PLATFORMS).filter((p) => PLATFORMS[p].folder);
// Toujours créées, même sans émulateur installé (les consoles d'origine de HMZ).
const CORE = ['switch2', 'switch', '3ds', 'ds'];

const ROM_EXT = {};
for (const p of EMULATED) ROM_EXT[p] = PLATFORMS[p].ext;

// Extension → console, seulement quand l'extension n'appartient qu'à une console
// (sert quand on ajoute un jeu à la main).
const PLATFORM_OF_EXT = {};
{
  const owners = {};
  for (const p of EMULATED) {
    if (p === 'switch2') continue;
    for (const e of ROM_EXT[p]) (owners[e] = owners[e] || []).push(p);
  }
  for (const [e, ps] of Object.entries(owners)) if (ps.length === 1) PLATFORM_OF_EXT[e] = ps[0];
}

const ROM_FOLDER_NAMES = {};
for (const p of EMULATED) ROM_FOLDER_NAMES[p] = PLATFORMS[p].folder;

// Données envoyées à la fenêtre (sans les listes internes).
function publicPlatforms() {
  const out = {};
  for (const [k, v] of Object.entries(PLATFORMS)) out[k] = { label: v.label, color: v.color, family: v.family, ext: v.ext || [], eboot: !!v.eboot };
  return out;
}

module.exports = { PLATFORMS, EMULATED, CORE, ROM_EXT, PLATFORM_OF_EXT, ROM_FOLDER_NAMES, publicPlatforms };
