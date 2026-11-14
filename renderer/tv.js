// HMZ · Mode TV et manette.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// --- Mode TV -------------------------------------------------------------------------------------
const tv = { tab: 0, idx: 0, menu: null, fullscreenSet: false, launching: null };
function tvTabs() {
  const list = visible();
  const tabs = [];
  const recent = list.filter((g) => g.last).sort(byRecent);
  tabs.push({ key: 'recent', label: recent.length ? 'Récents' : 'Ta collection', games: recent.length ? recent.slice(0, 30) : [...list].sort(byRecent) });
  const fav = list.filter((g) => g.favorite).sort(byRecent);
  if (fav.length) tabs.push({ key: 'fav', label: 'Favoris', games: fav });
  for (const c of S.collections || []) {
    const gs = c.games.map(gameById).filter((g) => g && (ui.showHidden || !g.hidden));
    if (gs.length) tabs.push({ key: 'c:' + c.id, label: c.name, games: gs });
  }
  for (const p of ORDER) {
    const gs = list.filter((g) => g.platform === p).sort(byRecent);
    if (gs.length) tabs.push({ key: p, label: plat(p).label, games: gs });
  }
  if (tabs.length > 2) tabs.push({ key: 'all', label: 'Tous', games: [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr')) });
  return tabs;
}

function enterTV() {
  closeModal(); closeCtx();
  const el = $('#tv');
  el.hidden = false;
  tv.tab = 0; tv.idx = 0; tv.menu = null;
  const f = featured();
  const tabs = tvTabs();
  if (f && tabs[0]) { const i = tabs[0].games.findIndex((g) => g.id === f.id); if (i >= 0) tv.idx = i; }
  api.call('win:fullscreen', true).catch(() => {});
  tv.fullscreenSet = true;
  el.style.zoom = (Number(S.settings.tvScale) || 100) / 100;
  renderTV();
}
function exitTV() {
  $('#tv').hidden = true;
  $('#tv').innerHTML = '';
  if (tv.fullscreenSet) api.call('win:fullscreen', false).catch(() => {});
  tv.fullscreenSet = false;
  const g = tvCurrent();
  if (g) ui.heroId = g.id;
  render();
}
function tvCurrent() { const t = tvTabs()[tv.tab]; return t ? t.games[tv.idx] : null; }

function tvThumb(g) {
  const p = plat(g.platform);
  const wide = g.art.hero || g.art.header;
  if (wide) return `<div class="thumb"><img src="${esc(wide)}" draggable="false"><div class="fb"><b>${esc(g.name)}</b></div></div>`;
  if (g.art.cover) return `<div class="thumb"><div class="bgblur" style="background-image:url('${esc(g.art.cover)}')"></div><div class="port"><img src="${esc(g.art.cover)}" draggable="false"></div><div class="fb"><b>${esc(g.name)}</b></div></div>`;
  return `<div class="thumb noimg" style="--c:${p.color}"><div class="fb"><b>${esc(g.name)}</b></div></div>`;
}

function renderTV(keepShelf) {
  const el = $('#tv');
  const tabs = tvTabs();
  if (!tabs.length || !tabs[0].games.length) {
    el.innerHTML = `<div class="tv-empty"><div><h2>Aucun jeu pour l'instant</h2><p>Ajoute des jeux depuis le mode bureau, puis reviens ici.</p><br><button class="btn primary" id="tvQuit">Quitter le mode TV</button></div></div>`;
    $('#tvQuit').onclick = exitTV;
    return;
  }
  tv.tab = Math.min(tv.tab, tabs.length - 1);
  const tab = tabs[tv.tab];
  tv.idx = Math.max(0, Math.min(tv.idx, tab.games.length - 1));
  const g = tab.games[tv.idx];

  if (!keepShelf || !$('.tv-track', el) || el.dataset.tab !== tab.key || el.dataset.n !== String(tab.games.length)) {
    el.dataset.tab = tab.key; el.dataset.n = String(tab.games.length);
    el.innerHTML = `<div class="tv-bg" id="tvBgA"></div><div class="tv-bg" id="tvBgB" style="opacity:0"></div><div class="tv-shade"></div>
      <div class="tv-cover" id="tvCover" style="opacity:0"><img alt=""></div>
      <div class="tv-top"><div class="brand"><span class="brand-mark"></span>HMZ</div><div class="tv-clock" id="tvClock"></div></div>
      <div class="tv-info" id="tvInfo"></div>
      <div class="tv-shelf">
        <div class="tv-tabs"><span class="lb">LB</span>${tabs.map((t, i) => `<button class="${i === tv.tab ? 'on' : ''}" data-tvtab="${i}">${esc(t.label)}</button>`).join('')}<span class="lb">RB</span><span class="count">${tab.games.length} jeu${tab.games.length > 1 ? 'x' : ''}</span></div>
        <div class="tv-track" id="tvTrack">${tab.games.map((x, i) => `<button class="tv-card" data-tvi="${i}" style="--c:${plat(x.platform).color}">${tvThumb(x)}<div class="nm">${esc(x.name)}</div><div class="sb"><i class="pdot"></i>${esc(plat(x.platform).label)}${x.minutes >= 1 ? ` · ${fmtTime(x.minutes)}` : ''}${x.running ? ' · En cours' : ''}</div></button>`).join('')}</div>
      </div>
      <div class="tv-foot">
        <span><i class="k a">A</i>Jouer</span><span><i class="k">←→</i>Choisir</span><span><i class="k">LB RB</i>Catégorie</span><span><i class="k y">Y</i>Favori</span><span><i class="k">☰</i>Options</span>
        <span class="grow"></span><span class="pad" id="tvPad"></span><span><i class="k">Select + Start</i>Quitter un jeu</span><span><i class="k b">B</i>Quitter</span>
      </div>`;
    tvBgShown = 'A'; tvBgUrl = null;
    tvClock();
  }
  $$('.tv-card', el).forEach((c, i) => c.classList.toggle('on', i === tv.idx));
  const on = $('.tv-card.on', el);
  if (on) {
    const track = $('#tvTrack');
    const left = on.offsetLeft - 80;
    track.scrollTo({ left: Math.max(0, left - track.clientWidth * 0.0), behavior: 'smooth' });
  }

  const h = heroInfo(g);
  tvSetBg(h);
  const cov = $('#tvCover');
  if (h && h.cover) { cov.style.display = ''; $('img', cov).src = h.cover; cov.style.opacity = 1; } else cov.style.opacity = 0;

  const meta = metaParts(g).map((x) => `<span class="mi">${esc(x)}</span>`).join('');
  $('#tvInfo').innerHTML = `
    <div class="kicker${g.running ? ' live' : ''}"><i class="dot"></i>${g.running ? 'En cours' : (g.emuReady ? 'Prêt à jouer' : 'Émulateur à installer')}</div>
    ${g.art.logo ? `<img class="tv-logo" src="${esc(g.art.logo)}" alt="" data-title="${esc(g.name)}">` : `<h1 class="tv-title${g.name.length > 20 ? ' long' : ''}">${esc(g.name)}</h1>`}
    <div class="tv-meta">${meta}</div>
    <div class="tv-acts"><button class="btn primary play focus" data-tvplay>${ICON.play}Jouer</button><button class="btn round" data-tvmenu title="Options">${ICON.dots}</button></div>`;

  if (tv.menu) drawTvMenu();
}

let tvBgShown = 'A', tvBgUrl = null;
function tvSetBg(h) {
  const url = h ? h.url : null;
  if (url === tvBgUrl) return;
  tvBgUrl = url;
  const next = tvBgShown === 'A' ? 'B' : 'A';
  const a = $('#tvBg' + tvBgShown), b = $('#tvBg' + next);
  if (!a || !b) return;
  b.className = 'tv-bg' + (h && h.blur ? ' blur' : '');
  b.style.backgroundImage = url ? `url('${url.replace(/'/g, "\\'")}')` : 'none';
  b.style.opacity = '';
  b.style.opacity = h && h.blur ? '.7' : '1';
  a.style.opacity = '0';
  tvBgShown = next;
}

function tvClock() {
  const c = $('#tvClock');
  if (c) { const d = new Date(); c.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
}
setInterval(tvClock, 10000);

function tvMove(dx) {
  const tab = tvTabs()[tv.tab];
  if (!tab) return;
  tv.idx = Math.max(0, Math.min(tab.games.length - 1, tv.idx + dx));
  renderTV(true);
}
function tvTab(d) {
  const n = tvTabs().length;
  tv.tab = (tv.tab + d + n) % n;
  tv.idx = 0;
  renderTV();
}

function tvMenuItems() {
  const g = tvCurrent();
  if (!g) return [];
  const items = [{ label: 'Jouer', fn: () => play(g.id) }];
  if ((g.platform === 'switch' || g.platform === 'switch2') && g.source !== 'steam') {
    for (const e of S.emulators.filter((x) => x.id === 'eden' || x.id === 'lichii')) {
      if (e.id !== g.emu) items.push({ label: `Lancer avec ${e.name}`, fn: () => play(g.id, e.id) });
    }
  }
  items.push({ label: g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris', fn: () => api.call('game:update', g.id, { favorite: !g.favorite }) });
  items.push({ label: 'Quitter le mode TV', fn: exitTV });
  items.push({ label: 'Fermer HMZ', fn: () => api.call('win:close') });
  return items;
}
function drawTvMenu() {
  $('.tv-menu')?.remove();
  if (!tv.menu) return;
  const items = tvMenuItems();
  const m = document.createElement('div');
  m.className = 'tv-menu';
  m.innerHTML = items.map((it, i) => `<button class="${i === tv.menu.i ? 'on' : ''}" data-tvmi="${i}">${esc(it.label)}</button>`).join('');
  $('#tv').appendChild(m);
}
function tvMenuOpen() { tv.menu = { i: 0 }; drawTvMenu(); }
function tvMenuClose() { tv.menu = null; drawTvMenu(); }
function tvMenuAct() { const it = tvMenuItems()[tv.menu.i]; tvMenuClose(); it && it.fn(); }

function tvMessage(text) {
  const el = document.createElement('div');
  el.className = 'tv-launch';
  el.innerHTML = `<div><h2 style="font-size:34px;max-width:900px">${esc(text)}</h2><p style="color:rgba(255,255,255,.6);font-size:17px">Appuie sur B pour quitter le mode TV.</p></div>`;
  $('#tv').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function tvLaunching(g) {
  const el = document.createElement('div');
  el.className = 'tv-launch';
  el.innerHTML = `<div><div class="spin"></div><h2>${esc(g.name)}</h2><p style="color:rgba(255,255,255,.6);font-size:17px">Lancement…</p></div>`;
  $('#tv').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function tvAction(a) {
  if (tv.menu) {
    const n = tvMenuItems().length;
    if (a === 'up') { tv.menu.i = (tv.menu.i - 1 + n) % n; drawTvMenu(); }
    else if (a === 'down') { tv.menu.i = (tv.menu.i + 1) % n; drawTvMenu(); }
    else if (a === 'ok') tvMenuAct();
    else if (a === 'back' || a === 'menu') tvMenuClose();
    return;
  }
  const g = tvCurrent();
  switch (a) {
    case 'left': tvMove(-1); break;
    case 'right': tvMove(1); break;
    case 'up': case 'lb': tvTab(-1); break;
    case 'down': case 'rb': tvTab(1); break;
    case 'ok': if (g) play(g.id); break;
    case 'fav': if (g) api.call('game:update', g.id, { favorite: !g.favorite }); break;
    case 'menu': tvMenuOpen(); break;
    case 'back': exitTV(); break;
  }
}

function tvKey(e) {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', ' ': 'ok', Escape: 'back', Backspace: 'back', F11: 'back', f: 'fav', F: 'fav', m: 'menu', M: 'menu', ContextMenu: 'menu', PageUp: 'lb', PageDown: 'rb', q: 'lb', e: 'rb' };
  const a = map[e.key];
  if (a) { e.preventDefault(); tvAction(a); }
}

$('#tv').addEventListener('click', (e) => {
  const c = e.target.closest('[data-tvi]');
  if (c) { tv.idx = +c.dataset.tvi; renderTV(true); return; }
  const t = e.target.closest('[data-tvtab]');
  if (t) { tv.tab = +t.dataset.tvtab; tv.idx = 0; renderTV(); return; }
  if (e.target.closest('[data-tvplay]')) return tvAction('ok');
  if (e.target.closest('[data-tvmenu]')) return tvMenuOpen();
  const mi = e.target.closest('[data-tvmi]');
  if (mi) { tv.menu.i = +mi.dataset.tvmi; tvMenuAct(); return; }
  if (tv.menu && !e.target.closest('.tv-menu')) tvMenuClose();
});
$('#tv').addEventListener('dblclick', (e) => { if (e.target.closest('[data-tvi]')) tvAction('ok'); });
$('#tv').addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) tvMove((e.deltaY || e.deltaX) > 0 ? 1 : -1); }, { passive: true });
let cursorTimer = null;
$('#tv').addEventListener('mousemove', () => { $('#tv').classList.remove('hide-cursor'); clearTimeout(cursorTimer); if (S.settings.tvCursor !== false) cursorTimer = setTimeout(() => $('#tv').classList.add('hide-cursor'), 2000); });

// Manette (API Gamepad, disposition standard Xbox / PlayStation / Switch Pro).
const pad = { held: {}, next: {} };
function pollPad() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((x) => x && x.connected) : [];
  const label = $('#tvPad');
  if (label) label.textContent = pads.length || padKinds.length ? '● Manette connectée' : '';
  if (pads.length) {
    // Toutes les manettes comptent : Windows en liste parfois une virtuelle
    // (ou un casque, un volant…) avant la vraie.
    const b = (i) => pads.some((p) => p.buttons[i] && p.buttons[i].pressed);
    const axis = (i) => { let best = 0; for (const p of pads) { const v = (p.axes || [])[i] || 0; if (Math.abs(v) > Math.abs(best)) best = v; } return best; };
    const ax = [axis(0), axis(1)];
    const st = {
      left: b(14) || ax[0] < -0.55, right: b(15) || ax[0] > 0.55,
      up: b(12) || ax[1] < -0.6, down: b(13) || ax[1] > 0.6,
      ok: b(0), back: b(1), menu: b(2) || b(8), fav: b(3), lb: b(4), rb: b(5), start: b(9) || b(16),
    };
    const now = performance.now();
    for (const [k, v] of Object.entries(st)) {
      if (v && !pad.held[k]) {
        pad.held[k] = true;
        pad.next[k] = now + 380;
        onPad(k);
      } else if (v && ['left', 'right', 'up', 'down'].includes(k) && now >= pad.next[k]) {
        pad.next[k] = now + (k === 'left' || k === 'right' ? 110 : 260);
        onPad(k);
      } else if (!v) pad.held[k] = false;
    }
  }
  requestAnimationFrame(pollPad);
}
function onPad(k) {
  if (!document.hasFocus()) return;
  if ($('#tv').hidden) {
    if (k === 'start') enterTV();
    return;
  }
  tvAction(k === 'start' ? 'menu' : k);
}
requestAnimationFrame(pollPad);

// Manettes vues par la fenêtre (API Gamepad) : sert aussi d'appoint à la
// détection en arrière-plan, qui ne voit pas toujours une manette branchée après coup.
function padKindOf(gp) {
  const id = (gp.id || '').toLowerCase();
  const m = id.match(/vendor:\s*([0-9a-f]{4})/) || id.match(/^([0-9a-f]{4})-/);
  const v = m ? m[1] : '';
  if (v === '054c' || /dualshock|dualsense|wireless controller|playstation/.test(id)) return 'playstation';
  if (v === '057e' || /pro controller|nintendo/.test(id)) return 'switch';
  if (v === '045e' || /xinput|xbox/.test(id)) return 'xbox';
  return 'generic';
}
function windowPadKinds() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((x) => x && x.connected) : [];
  return [...new Set(pads.map(padKindOf))];
}
function allPadKinds() { const all = [...new Set([...padKinds, ...windowPadKinds()])]; return all.length > 1 ? all.filter((k) => k !== 'generic') : all; }
let padRefreshes = 0;
window.addEventListener('gamepadconnected', (e) => {
  const k = padKindOf(e.gamepad);
  toast(`Manette ${PAD_LABEL[k] || ''} connectée. Appuie sur ${k === 'playstation' ? 'PS ou Options' : k === 'xbox' ? 'Xbox ou Menu' : 'Home ou +'} pour passer en mode TV.`, 'ok', 5000);
  if (!padKinds.includes(k) && padRefreshes++ < 4) call('pad:refresh');
  if (ui.view === 'settings' && !modalState) render();
});
window.addEventListener('gamepaddisconnected', () => { if (ui.view === 'settings' && !modalState) render(); });
