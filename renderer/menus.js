// HMZ · Recherche rapide, menu contextuel, notifications.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// --- Recherche rapide (Ctrl+K) -------------------------------------------------------------
function paletteActions() {
  return [
    { label: 'Passer en mode TV', icon: ICON.play, kbd: 'F11', run: () => enterTV() },
    { label: 'Aller à l\'accueil', icon: ICON.grid, kbd: 'Ctrl 1', run: () => go('home') },
    { label: 'Aller à la bibliothèque', icon: ICON.shelf, kbd: 'Ctrl 2', run: () => go('library') },
    { label: 'Aller aux émulateurs', icon: ICON.pad, kbd: 'Ctrl 3', run: () => go('emulators') },
    { label: 'Aller aux statistiques', icon: ICON.clock, kbd: 'Ctrl 4', run: () => go('stats') },
    { label: 'Ouvrir les paramètres', icon: ICON.edit, kbd: 'Ctrl 5', run: () => go('settings') },
    { label: 'Jeu au hasard', icon: ICON.sparkle, kbd: 'Ctrl R', run: () => randomGame() },
    { label: 'Ajouter un jeu', icon: ICON.plus, run: async () => { const n = await call('game:add'); if (n) toast(`${n} jeu${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`, 'ok'); } },
    { label: 'Rechercher mes jeux', icon: ICON.refresh, run: async () => { toast('Recherche des jeux…'); await call('library:scan'); toast('Bibliothèque à jour.', 'ok'); } },
    { label: 'Nouvelle collection', icon: ICON.folder, run: () => { ui.coll = { type: 'all' }; go('library'); setTimeout(() => $('[data-action="new-coll"]')?.click(), 80); } },
    { label: 'Afficher en étagère', icon: ICON.shelf, run: () => { setAppearance({ libView: 'shelf' }); go('library'); render(); } },
    { label: 'Afficher en grille', icon: ICON.grid, run: () => { setAppearance({ libView: 'grid' }); go('library'); render(); } },
    { label: 'Afficher en liste', icon: ICON.list, run: () => { setAppearance({ libView: 'list' }); go('library'); render(); } },
    { label: 'Ajouter mes jeux BlueStacks', icon: ICON.plus, run: () => openBlueStacks() },
    { label: 'Raccourcis clavier', icon: ICON.info, kbd: '?', run: () => openKeys() },
  ];
}

function openPalette() {
  modal(`<div class="palette"><input id="palIn" placeholder="Rechercher un jeu ou une action"><div class="res" id="palRes"></div>
    <div class="foot"><span><kbd>↑</kbd><kbd>↓</kbd>naviguer</span><span><kbd>Entrée</kbd>ouvrir</span><span><kbd>Maj</kbd><kbd>Entrée</kbd>voir la fiche</span><span><kbd>Échap</kbd>fermer</span></div></div>`);
  let sel = 0, items = [];
  const draw = () => {
    const q = $('#palIn').value.trim().toLowerCase();
    const games = visible().filter((g) => !q || g.name.toLowerCase().includes(q)).sort(byRecent).slice(0, q ? 12 : 5).map((g) => ({ type: 'game', g }));
    const acts = paletteActions().filter((a) => !q || a.label.toLowerCase().includes(q)).slice(0, q ? 8 : 7).map((a) => ({ type: 'act', a }));
    items = [...games, ...acts];
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let html = '', i = 0;
    if (games.length) html += `<div class="grp">${q ? 'Jeux' : 'Joués récemment'}</div>` + games.map((x) => `<button class="it${i === sel ? ' on' : ''}" data-i="${i++}"><span class="mini">${coverHTML(x.g)}</span><span class="nm">${esc(x.g.name)}</span><span class="tag" style="--c:${plat(x.g.platform).color}">${esc(plat(x.g.platform).label)}</span></button>`).join('');
    if (acts.length) html += '<div class="grp">Actions</div>' + acts.map((x) => `<button class="it${i === sel ? ' on' : ''}" data-i="${i++}"><span class="ico">${x.a.icon}</span><span class="nm">${esc(x.a.label)}</span>${x.a.kbd ? `<kbd>${esc(x.a.kbd)}</kbd>` : ''}</button>`).join('');
    $('#palRes').innerHTML = html || '<div class="none">Rien trouvé. Essaie un autre mot.</div>';
    $('.it.on', $('#palRes'))?.scrollIntoView({ block: 'nearest' });
  };
  const runItem = (it, shift) => {
    closeModal();
    if (it.type === 'game') { if (shift) openDetail(it.g.id); else play(it.g.id); } else it.a.run();
  };
  const inp = $('#palIn');
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[sel]) runItem(items[sel], e.shiftKey);
    else if (e.key === 'Escape') closeModal();
  };
  $('#palRes').onclick = (e) => { const b = e.target.closest('.it'); if (b) runItem(items[+b.dataset.i], e.shiftKey); };
  draw(); inp.focus();
}

function openKeys() {
  const row = (label, keys) => `<span>${label}</span><span class="k">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span>`;
  modal(`<div class="modal dialog" style="width:min(540px,92vw)"><button class="x" data-close>${ICON.x}</button><h3>Raccourcis clavier</h3>
    <div class="keys">
      <h5>Partout</h5>
      ${row('Rechercher un jeu ou une action', ['Ctrl', 'K'])}${row('Accueil, bibliothèque, émulateurs, stats, paramètres', ['Ctrl', '1 à 5'])}${row('Mode TV', ['F11'])}${row('Cette aide', ['?'])}
      <h5>Étagère</h5>
      ${row('Choisir un jeu', ['←', '→'])}${row('Retourner le boîtier', ['Espace'])}${row('Jouer', ['Entrée'])}${row('Remettre les boîtiers', ['Échap'])}
      <h5>Manette</h5>
      ${row('Quitter un jeu', ['Select', 'Start'])}${row('Changer de rayon en mode TV', ['LB', 'RB'])}${row('Ajouter aux favoris', ['Y'])}
    </div></div>`);
}

// --- Menu contextuel ----------------------------------------------------------------------
function openCtx(id, x, y) {
  const g = gameById(id);
  if (!g) return;
  const ctx = $('#ctx');
  ctx.innerHTML = `<button data-play="${esc(id)}">${playIcon(g)}${playLabel(g)}</button>
    <button data-detail="${esc(id)}">${ICON.info}Voir la fiche</button>
    <button data-fav="${esc(id)}">${ICON.star}${g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
    <div class="sub-wrap"><button data-noop="1">${ICON.folder}Ajouter à une collection<span style="margin-left:auto;opacity:.5">›</span></button>
      <div class="sub-menu">${S.collections.map((c) => `<button data-colltoggle="${esc(c.id)}" data-id="${esc(id)}"><span class="chk${c.games.includes(id) ? ' on' : ''}">${c.games.includes(id) ? ICON.check : ''}</span><span class="dot-c" style="--c:${c.color}"></span>${esc(c.name)}</button>`).join('')}${S.collections.length ? '<hr>' : ''}<button data-collnewfor="${esc(id)}">${ICON.plus}Nouvelle collection…</button></div></div>
    <hr>
    <button data-rename="${esc(id)}">${ICON.edit}Renommer</button>
    <button data-pick="cover" data-id="${esc(id)}">${ICON.image}Choisir la jaquette</button>
    <button data-pick="hero" data-id="${esc(id)}">${ICON.image}Choisir le fond</button>
    <button data-openfolder="${esc(id)}">${ICON.folder}Ouvrir l'emplacement</button>
    <button data-hide="${esc(id)}">${ICON.eye}${g.hidden ? 'Afficher' : 'Masquer'}</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctx.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
}
const closeCtx = () => { $('#ctx').hidden = true; };
function openCollCtx(id, x, y) {
  const c = S.collections.find((k) => k.id === id);
  if (!c) return;
  const COLORS = ['#ff6b5e', '#f6c344', '#5fd38d', '#7aa2ff', '#c084fc', '#ff3ea5', '#5ef0c6', '#ff9f43'];
  const ctx = $('#ctx');
  ctx.innerHTML = `<button data-collrename="${esc(id)}">${ICON.edit}Renommer</button>
    <div style="display:flex;gap:6px;padding:8px 10px">${COLORS.map((k) => `<button class="swatch${c.color === k ? ' on' : ''}" data-collcolor="${k}" data-id="${esc(id)}" style="width:20px;height:20px;background:${k};padding:0"></button>`).join('')}</div>
    <button data-collmove="-1" data-id="${esc(id)}">↑ Monter</button><button data-collmove="1" data-id="${esc(id)}">↓ Descendre</button>
    <hr><button class="danger" data-colldelete="${esc(id)}" style="color:var(--red)">${ICON.trash}Supprimer la collection</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctx.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
}

// --- Notifications -----------------------------------------------------------------------
function toast(text, kind = 'info', ms = 4200, action = null) {
  // Pas deux fois le même message à l'écran.
  if ($$('#toasts .toast').some((x) => x.firstChild && x.firstChild.textContent === text)) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}${action ? ' act' : ''}`;
  el.textContent = text;
  if (action) {
    const b = document.createElement('button');
    b.className = 'btn sm';
    b.textContent = action.label;
    b.onclick = () => { action.fn(); el.remove(); };
    el.appendChild(b);
    ms = Math.max(ms, 6500);
  }
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

// Menu ⋯ d'un émulateur : les actions rares, pour garder la page légère.
function openEmuCtx(id, x, y) {
  const e = S.emulators.find((k) => k.id === id);
  if (!e) return;
  const ctx = $('#ctx');
  const b = (attr, icon, label, cls = '') => `<button ${attr}="${esc(e.id)}"${cls ? ` class="${cls}"` : ''}>${icon}${label}</button>`;
  ctx.innerHTML = e.installed
    ? `${e.tuned ? b('data-emucfg', ICON.refresh, 'Réglages conseillés') + b('data-emupad', ICON.pad, 'Régler la manette') + '<hr>' : ''}
      ${b('data-installzip', ICON.download, 'Mettre à jour depuis une archive')}
      ${b('data-locate', ICON.ext, 'Choisir un autre .exe')}
      <button data-url="${esc(e.page)}">${ICON.ext}Page officielle</button>
      <hr>${b('data-emudel', ICON.trash, e.custom ? 'Oublier cet émulateur' : 'Supprimer', 'danger')}`
    : `${b('data-installzip', ICON.download, 'Installer depuis une archive')}
      ${b('data-locate', ICON.folder, 'Je l\'ai déjà installé')}
      <button data-url="${esc(e.page)}">${ICON.ext}Page officielle</button>`;
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.max(10, Math.min(x - r.width, innerWidth - r.width - 10)) + 'px';
  ctx.style.top = (y + r.height > innerHeight - 10 ? Math.max(10, y - r.height - 40) : y) + 'px';
}
