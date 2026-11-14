// HMZ · Guide de bienvenue (premier lancement d'une nouvelle installation).
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
const welcome = { step: 0, picked: new Set() };
const WELCOME_CONSOLES = [
  ['switch', 'Switch'], ['3ds', '3DS'], ['ds', 'DS'], ['wii', 'Wii et GameCube'], ['wiiu', 'Wii U'], ['n64', 'Nintendo 64'],
  ['gba', 'Game Boy et GBA'], ['snes', 'Super Nintendo'], ['ps1', 'PS1'], ['ps2', 'PS2'], ['ps3', 'PS3'], ['psp', 'PSP'], ['x360', 'Xbox 360'], ['dc', 'Dreamcast'],
];
const WELCOME_EMU = { switch: 'eden', '3ds': 'azahar', ds: 'melonds', wii: 'dolphin', wiiu: 'cemu', n64: 'rmg', gba: 'mgba', snes: 'snes9x', ps1: 'duckstation', ps2: 'pcsx2', ps3: 'rpcs3', psp: 'ppsspp', x360: 'xenia', dc: 'flycast' };

function welcomeHTML() {
  const g = S.games || [];
  const by = (src) => g.filter((x) => x.source === src && !x.notInstalled).length;
  const found = [['Steam', by('steam')], ['Epic Games', by('epic')], ['GOG', by('gog')], ['Xbox', by('xbox')], ['Battle.net', by('battlenet')], ['Ubisoft', by('ubisoft')], ['Riot', by('riot')], ['EA', by('ea')], ['BlueStacks', by('bluestacks')]].filter(([, n]) => n);
  const dots = `<div class="wl-dots">${[0, 1, 2].map((i) => `<i class="${i === welcome.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body;
  if (welcome.step === 0) {
    body = `<h2>Bienvenue sur HMZ</h2>
      <p>Tous tes jeux au même endroit : PC, boutiques et consoles émulées.</p>
      ${found.length ? `<div class="wl-found">${found.map(([k, n]) => `<div><b>${n}</b><span>${esc(k)}</span></div>`).join('')}</div><p class="wl-small">HMZ a déjà trouvé ces jeux sur ton PC. Il continue de chercher en arrière-plan.</p>`
        : '<p class="wl-small">HMZ cherche tes jeux en arrière-plan : Steam, Epic, GOG, Xbox, Battle.net, Ubisoft, Riot, EA et BlueStacks.</p>'}`;
  } else if (welcome.step === 1) {
    body = `<h2>Tu joues à quelles consoles ?</h2>
      <p>HMZ installe l'émulateur conseillé de chacune, depuis son site officiel. Tu pourras en ajouter d'autres plus tard.</p>
      <div class="wl-consoles">${WELCOME_CONSOLES.map(([k, l]) => `<button class="${welcome.picked.has(k) ? 'on' : ''}" data-wlpick="${k}">${esc(l)}</button>`).join('')}</div>
      <p class="wl-small">Les jeux, BIOS et clés ne sont pas fournis : ils doivent venir de ta propre console.</p>`;
  } else {
    body = `<h2>Prêt à jouer</h2>
      <div class="wl-tips">
        <div><b>Ctrl + K</b><span>chercher un jeu, n'importe quand</span></div>
        <div><b>Ctrl + Alt + Espace</b><span>même quand HMZ est réduit</span></div>
        <div><b>Bouton Xbox / PS / Home</b><span>passe en mode TV, pour jouer depuis le canapé</span></div>
        <div><b>Select + Start (1 s)</b><span>quitte le jeu en cours à la manette</span></div>
        <div><b>Clic droit sur un jeu</b><span>favori, collection, images, réglages</span></div>
      </div>`;
  }
  const next = welcome.step === 1 ? (welcome.picked.size ? `Installer ${welcome.picked.size} émulateur${welcome.picked.size > 1 ? 's' : ''}` : 'Passer') : welcome.step === 2 ? 'C\'est parti' : 'Continuer';
  return `<div class="modal welcome">${dots}${body}
    <div class="acts">${welcome.step > 0 ? '<button class="btn ghost" data-wl="back">Retour</button>' : '<span></span>'}<button class="btn primary" data-wl="next">${next}</button></div></div>`;
}
function openWelcome() { welcome.step = 0; modal(welcomeHTML(), { welcome: true }); }
function welcomeRender() { const m = $('.modal.welcome'); if (m) m.outerHTML = welcomeHTML(); }
async function welcomeNext() {
  if (welcome.step === 1 && welcome.picked.size) {
    const ids = [...new Set([...welcome.picked].map((k) => WELCOME_EMU[k]).filter(Boolean))].filter((id) => !(S.emulators.find((e) => e.id === id) || {}).installed);
    // Installations l'une après l'autre, en arrière-plan (la page Émulateurs montre l'avancement).
    (async () => { for (const id of ids) { try { await installEmu(id); } catch {} } })();
    if (ids.length) toast(`Installation de ${ids.length} émulateur${ids.length > 1 ? 's' : ''} en cours : suis-la dans Émulateurs.`, 'ok', 5000);
  }
  if (welcome.step >= 2) { closeModal(); api.call('welcome:done').catch(() => {}); return; }
  welcome.step++;
  welcomeRender();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-wl], [data-wlpick]');
  if (!b || !b.closest('.modal.welcome')) return;
  e.stopPropagation();
  if (b.dataset.wlpick) { const k = b.dataset.wlpick; welcome.picked.has(k) ? welcome.picked.delete(k) : welcome.picked.add(k); welcomeRender(); return; }
  if (b.dataset.wl === 'back') { welcome.step = Math.max(0, welcome.step - 1); welcomeRender(); return; }
  welcomeNext();
}, true);
