// HMZ · Démarrage.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// --- Démarrage ------------------------------------------------------------------------------------
let lastStateJson = '';
api.on('state:changed', (st) => {
  // Rien n'a changé à l'écran : on ne redessine pas (évite les clignotements).
  const json = JSON.stringify(st);
  if (json === lastStateJson) return;
  lastStateJson = json;
  S = st;
  applyAppearance();
  // Pas de mise à jour de la fiche pendant que tu écris dedans (notes, options).
  if (modalState && modalState.detail && !document.activeElement?.closest?.('.modal input, .modal textarea')) refreshModal();
  if (!$('#tv').hidden) renderTV(true);
  const view = $('#view');
  if (!view.querySelector('input:focus')) render();
});
api.on('tv:enter', () => { if ($('#tv').hidden) enterTV(); });
api.on('palette:open', () => { if ($('#tv').hidden) openPalette(); });
api.on('pad:kinds', (k) => { padKinds = k || []; if (ui.view === 'settings' && !modalState) render(); });
api.on('scan:progress', (t) => { $('#scanStatus').textContent = t || ''; });
api.on('emu:progress', (p) => {
  if (p.step === null) { delete emuProg[p.id]; } else emuProg[p.id] = p;
  if (ui.view === 'emulators') {
    const e = S.emulators.find((x) => x.id === p.id);
    const el = $(`.emu[data-emu="${p.id}"]`);
    if (e && el) { const tmp = document.createElement('div'); tmp.innerHTML = emuCard(e); el.replaceWith(tmp.firstElementChild); }
  }
});
api.on('toast', (t) => toast(t.text, t.kind));
api.on('update:ready', (u) => {
  if ($('#toasts .toast.update')) return;
  const el = document.createElement('div');
  el.className = 'toast ok update';
  el.innerHTML = `<div><b>Mise à jour ${esc(u.version)} prête</b><br><span style="color:var(--muted);font-weight:500">Redémarre HMZ pour l'installer.</span></div><button class="btn primary sm">Redémarrer</button><button class="icon-btn" title="Plus tard">${ICON.x}</button>`;
  el.querySelector('.btn').onclick = () => api.call('app:restart');
  el.querySelector('.icon-btn').onclick = () => el.remove();
  $('#toasts').appendChild(el);
});
api.on('window:state', (s) => {
  if (s.fullscreen === false && !$('#tv').hidden && tv.fullscreenSet) { tv.fullscreenSet = false; exitTV(); }
});

(async function init() {
  S = await api.call('state:get');
  padKinds = S.padKinds || [];
  applyAppearance();
  render();
  if (S.settings.startInTV) enterTV();
})();
