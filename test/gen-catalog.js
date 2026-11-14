// Génère test/mock-catalog.js à partir des vrais catalogues (consoles + émulateurs).
const fs = require('fs');
const path = require('path');
const PLAT = require('../src/platforms');
const EMU = require('../src/emulators');
const emulators = Object.values(EMU.EMULATORS).map((d) => ({
  id: d.id, name: d.name, platforms: d.platforms, blurb: d.blurb, experimental: !!d.experimental, page: '#',
  needs: d.needs || '', needsKeys: !!d.needsKeys, tuned: ['melonds', 'azahar', 'eden', 'lichii'].includes(d.id),
  isDefault: d.platforms.some((p) => EMU.DEFAULT_EMU[p] === d.id), installed: false,
}));
fs.writeFileSync(path.join(__dirname, 'mock-catalog.js'), `window.__CAT = ${JSON.stringify({ platforms: PLAT.publicPlatforms(), emulators })};\n`);
