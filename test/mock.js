// Données factices pour tester l'interface hors d'Electron.
(function () {
  if (window.hmz) return;
  const svg = (w, h, c1, c2, txt, big) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`
    + `<circle cx="${w * .7}" cy="${h * .35}" r="${Math.min(w, h) * .32}" fill="#fff" opacity=".12"/><circle cx="${w * .25}" cy="${h * .8}" r="${Math.min(w, h) * .2}" fill="#000" opacity=".18"/>`
    + (txt ? `<text x="${w * .08}" y="${h * .9}" font-family="Arial Black,Arial" font-weight="900" font-size="${big || w * .11}" fill="#fff" opacity=".95">${txt}</text>` : '') + '</svg>');
  const now = Date.now(), D = 864e5;
  const mk = (id, name, platform, c1, c2, o = {}) => ({
    id, name, originalName: name, platform, source: o.source || 'rom', favorite: !!o.fav, hidden: false, addedAt: now - (o.added || 5) * D,
    size: o.size || 4e9, minutes: o.min || 0, sessions: o.ses || 0, last: o.last ? now - o.last * D : 0,
    art: o.noart ? {} : { cover: svg(600, 900, c1, c2, name.split(' ')[0], 70), ...(o.hero ? { hero: svg(1920, 620, c2, c1, '') } : {}) },
    emu: { switch: 'eden', switch2: 'lichii', '3ds': 'azahar', ds: 'melonds' }[platform] || null,
    emuReady: o.ready !== false, genres: o.genres || ({ switch2: ['Course'], switch: ['Aventure', 'Monde ouvert'], '3ds': ['RPG'], ds: ['Plateforme'], pc: ['Action', 'Tir'] }[platform]), path: o.path || `C:\\Users\\Hamza\\HMZ\\Jeux\\${platform}\\${name}.nsp`, running: !!o.running,
  });
  const games = [
    Object.assign(mk('switch2:pokemon-pokopia', 'Pokémon Pokopia', 'switch2', '#3d9b4f', '#f2d24b', { hero: 1, min: 132, ses: 4, last: 8, fav: 1 }), { extras: ['update', 'dlc', 'dlc'] }),
    mk('switch2:mario-kart-world', 'Mario Kart World', 'switch2', '#d8342c', '#2b6fd6', { hero: 1, min: 410, ses: 12, last: 1 }),
    mk('switch2:donkey-kong-bananza', 'Donkey Kong Bananza', 'switch2', '#7a4a1f', '#e8a93a', { min: 55, ses: 2, last: 3, ready: false }),
    mk('switch:zelda-totk', 'The Legend of Zelda: Tears of the Kingdom', 'switch', '#2c5d48', '#c9b56a', { hero: 1, min: 3600, ses: 40, last: 0.1, running: true }),
    mk('switch:smash', 'Super Smash Bros. Ultimate', 'switch', '#222', '#c43', { min: 900, ses: 30, last: 12 }),
    mk('switch:pokemon-za', 'Pokémon Legends: Z-A', 'switch', '#123d6b', '#56c2a8', { noart: 1 }),
    mk('3ds:pokemon-ultra-sun', 'Pokémon Ultra Sun', '3ds', '#f08a24', '#4b1d6b', { min: 300, ses: 9, last: 20 }),
    mk('3ds:mario-kart-7', 'Mario Kart 7', '3ds', '#2a59c7', '#f3c33a', {}),
    mk('ds:new-super-mario-bros', 'New Super Mario Bros.', 'ds', '#c7362a', '#f6d34a', { min: 80, ses: 3, last: 40 }),
    mk('ds:pokemon-heartgold', 'Pokémon HeartGold', 'ds', '#a8862a', '#3b2c12', { fav: 1 }),
    mk('steam:1245620', 'ELDEN RING', 'pc', '#1c1a15', '#a68a4c', { source: 'steam', hero: 1, min: 7900, ses: 80, last: 2 }),
    mk('steam:730', 'Counter-Strike 2', 'pc', '#1a2533', '#e0a33a', { source: 'steam', hero: 1, min: 12000, ses: 300, last: 0.5 }),
    mk('epic:fortnite', 'Fortnite', 'pc', '#3b1e7a', '#2fc0f0', { source: 'epic', min: 600, ses: 20, last: 6 }),
    mk('android:com.netmarble.sololv', 'Solo Leveling: ARISE', 'mobile', '#1b3a8a', '#7b5cff', { source: 'bluestacks', min: 240, ses: 9, last: 1 }),
    Object.assign(mk('manual:pc:valorant', 'VALORANT', 'pc', '#ff4655', '#0f1923', { source: 'manual', noart: 1 }), { art: { logo: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><text x="200" y="88" text-anchor="middle" font-family="Arial Black" font-size="78" fill="#ff4655">VALORANT</text></svg>'), hero: svg(1920, 620, '#ff4655', '#0f1923', '') } }),
  ];
  const sessions = [];
  for (let i = 0; i < 30; i++) {
    if (i % 3 === 2) continue;
    const g = games[(i * 7) % games.length];
    const s = now - i * D - 3 * 36e5;
    sessions.push({ g: g.id, s, e: s + (20 + ((i * 37) % 140)) * 60000 });
  }
  const emulatorsBase = [
    { id: 'melonds', name: 'melonDS', platforms: ['ds'], blurb: 'Nintendo DS. Stable et précis, aucun fichier système nécessaire.', installed: true, version: '1.1', latest: '1.1', needsKeys: false, page: '#' },
    { id: 'azahar', name: 'Azahar', platforms: ['3ds'], blurb: 'Nintendo 3DS. Successeur officiel de Citra. Les jeux doivent être déchiffrés.', installed: true, version: '2125.0', latest: '2126.1.1', needsKeys: false, page: '#' },
    { id: 'eden', name: 'Eden', platforms: ['switch'], blurb: 'Nintendo Switch. Le plus suivi des successeurs de Yuzu.', installed: true, version: 'v0.2.0-rc2', latest: 'v0.2.0-rc2', needsKeys: true, keys: { keys: true, firmware: false }, page: '#' },
    { id: 'lichii', name: 'Lichii', platforms: ['switch2', 'switch'], blurb: 'Nintendo Switch 2. Très expérimental : bugs fréquents, bon PC requis.', experimental: true, installed: false, needsKeys: true, page: '#' },
  ];
  const emulators = (window.__CAT ? window.__CAT.emulators : []).map((c) => ({ ...c, ...(emulatorsBase.find((b) => b.id === c.id) || {}) }));
  Object.assign(emulators.find((e) => e.id === 'pcsx2') || {}, { installed: true, version: 'v2.4.0', latest: 'v2.4.0', dir: 'C:\\Users\\Hamza\\HMZ\\Emulateurs\\PCSX2' });

  const state = {
    version: '2.0.0',
    settings: { root: 'C:\\Users\\Hamza\\HMZ', romDirs: { ds: ['C:\\Users\\Hamza\\HMZ\\Jeux\\DS'], '3ds': ['C:\\Users\\Hamza\\HMZ\\Jeux\\3DS'], switch: ['C:\\Users\\Hamza\\HMZ\\Jeux\\Switch', 'D:\\Jeux Switch'], switch2: ['C:\\Users\\Hamza\\HMZ\\Jeux\\Switch 2'], ps2: ['C:\\Users\\Hamza\\HMZ\\Jeux\\PS2'] }, sgdbKey: '', backups: true, backupDirShown: 'C:\\Users\\Hamza\\HMZ\\Sauvegardes', padQuit: true, padHome: true, scanOthers: true, autostart: false, startInTV: false, emuFullscreen: true, minimizeOnPlay: true, scanSteam: true, scanEpic: true },
    platforms: window.__CAT ? window.__CAT.platforms : {},
    games, emulators, sessions, padKinds: ['playstation'], collections: [{ id: 'c1', name: 'À finir', color: '#ff6b5e', games: ['switch:zelda-totk', 'ds:pokemon-heartgold'] }, { id: 'c2', name: 'Soirées entre potes', color: '#7aa2ff', games: ['switch2:mario-kart-world', 'switch:smash', 'steam:730'] }],
  };
  if (location.hash === '#empty') state.games = [];
  const listeners = {};
  const emit = (ch, d) => (listeners[ch] || []).forEach((f) => f(d));
  window.hmz = {
    on: (ch, fn) => { (listeners[ch] = listeners[ch] || []).push(fn); },
    call: async (ch, ...a) => {
      console.log('call', ch, a);
      if (ch === 'state:get') return JSON.parse(JSON.stringify(state));
      if (ch === 'game:update') { Object.assign(games.find((g) => g.id === a[0]), a[1]); emit('state:changed', JSON.parse(JSON.stringify(state))); }
      if (ch === 'game:launch') { const g = games.find((x) => x.id === a[0]); return g.emuReady ? { ok: true } : { needEmu: g.emu }; }
      if (ch === 'collection:toggle') { const c = state.collections.find((x) => x.id === a[0]); const has = c.games.includes(a[1]); const want = a[2] === undefined ? !has : a[2]; if (want && !has) c.games.push(a[1]); if (!want && has) c.games = c.games.filter((x) => x !== a[1]); emit('state:changed', JSON.parse(JSON.stringify(state))); return want; }
      if (ch === 'collection:create') { const c = { id: 'c' + Date.now(), name: a[0], color: '#c084fc', games: a[1] ? [a[1]] : [] }; state.collections.push(c); emit('state:changed', JSON.parse(JSON.stringify(state))); return c; }
      if (ch === 'settings:set') { Object.assign(state.settings, a[0]); emit('state:changed', JSON.parse(JSON.stringify(state))); }
      if (ch === 'emu:install' && a[0] === 'eden') { throw new Error('git.eden-emu.dev : HTTP 503'); }
      if (ch === 'emu:install') {
        for (let i = 0; i <= 10; i++) { emit('emu:progress', { id: a[0], step: 'Téléchargement de Lichii build-83', done: i * 4e7, total: 4e8 }); await new Promise((r) => setTimeout(r, 150)); }
        const e = emulators.find((x) => x.id === a[0]); e.installed = true; e.version = 'build-83'; e.latest = 'build-83'; e.keys = { keys: false, firmware: false };
        emit('state:changed', JSON.parse(JSON.stringify(state)));
        return { version: 'build-83' };
      }
      if (ch === 'emu:uninstall') { const e = emulators.find((x) => x.id === a[0]); e.installed = false; e.version = null; emit('state:changed', JSON.parse(JSON.stringify(state))); return { removed: true }; }
      if (ch === 'bluestacks:candidates') { await new Promise((r) => setTimeout(r, 300)); return { installed: true, list: [{ pkg: 'com.netmarble.sololv', name: 'Solo Leveling:Arise' }, { pkg: 'com.com2us.smon.normal.freefull.google.kr.android.common', name: 'Summoners War' }] }; }
      if (ch === 'art:options') { await new Promise((r) => setTimeout(r, 300)); return Array.from({ length: 9 }, (_, i) => ({ url: 'x' + i, thumb: a[1] === 'cover' ? svg(600, 900, ['#ff4655','#2b6fd6','#3d9b4f','#f6c344'][i % 4], '#111', 'Cover ' + (i + 1), 60) : svg(1920, 620, '#333', ['#ff4655','#2b6fd6','#3d9b4f'][i % 3], 'Fond ' + (i + 1), 120) })); }
      return null;
    },
  };
})();
