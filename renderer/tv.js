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
  el.classList.remove('leaving');
  el.classList.add('entering');
  uiSound('open');
  clearTimeout(tv.enterT);
  tv.enterT = setTimeout(() => el.classList.remove('entering'), 1100);
  renderTV();
}
function exitTV() {
  const el = $('#tv');
  if (el.hidden || el.classList.contains('leaving')) return;
  // Petite sortie en fondu, sauf si Windows demande de réduire les animations.
  if (!reduceMotion()) { el.classList.add('leaving'); setTimeout(closeTV, 240); } else closeTV();
}
function closeTV() {
  $('#tv').classList.remove('leaving', 'entering');
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
      <div class="tv-top"><div class="brand"><span class="brand-mark"></span>HMZ</div><div class="tv-hello" id="tvHello"></div><div class="tv-clock" id="tvClock"></div></div>
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
  const onTab = $('.tv-tabs button.on', el);
  if (onTab) { const bar = onTab.parentElement; const l = onTab.offsetLeft - 120; if (l < bar.scrollLeft || onTab.offsetLeft + onTab.offsetWidth > bar.scrollLeft + bar.clientWidth - 120) bar.scrollLeft = Math.max(0, l); }
  $$('.tv-card', el).forEach((c, i) => c.classList.toggle('on', i === tv.idx));
  const on = $('.tv-card.on', el);
  if (on) {
    const track = $('#tvTrack');
    const left = on.offsetLeft - 80;
    track.scrollTo({ left: Math.max(0, left), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  const h = heroInfo(g);
  tvSetBg(h);
  tvGlow(g);
  const cov = $('#tvCover');
  if (h && h.cover) { cov.style.display = ''; $('img', cov).src = h.cover; cov.style.opacity = 1; } else cov.style.opacity = 0;

  const p = plat(g.platform);
  const stat = (v, l, cls = '') => `<div class="hz-stat${cls}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`;
  const info = $('#tvInfo');
  const changed = info.dataset.game !== g.id;
  info.dataset.game = g.id;
  info.innerHTML = `
    <div class="kicker${g.running ? ' live' : ''}"><i class="dot"></i>${g.running ? 'En cours' : (g.emuReady ? 'Prêt à jouer' : 'Émulateur à installer')}</div>
    ${g.art.logo ? `<img class="tv-logo" src="${esc(g.art.logo)}" alt="" data-title="${esc(g.name)}">` : `<h1 class="tv-title${g.name.length > 20 ? ' long' : ''}">${esc(g.name)}</h1>`}
    <div class="hz-stats tv-stats">
      ${stat(g.minutes >= 1 ? fmtTime(g.minutes) : '0 h', 'de jeu', ' big')}
      ${stat(g.last ? fmtLast(g.last).replace(/^./, (c) => c.toUpperCase()) : 'Jamais', 'dernière partie')}
      ${weekMinutes(g.id) >= 1 ? stat(fmtTime(weekMinutes(g.id)), 'cette semaine') : stat(p.label, sourceLabel(g))}
    </div>
    <div class="tv-acts"><button class="btn primary play focus" data-tvplay>${ICON.play}Jouer</button><button class="btn round" data-tvmenu title="Options">${ICON.dots}</button></div>`;
  if (changed) { info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap'); }

  if (tv.menu) drawTvMenu();
}

let tvBgShown = 'A', tvBgUrl = null;
// Couleur dominante du jeu sélectionné : sert à la lueur de la carte et au fond.
function tvGlow(g) {
  const el = $('#tv');
  const key = g.art.cover || g.art.hero || g.art.header;
  el.style.setProperty('--gl', (key && colorCache.get(key)) || hexToRgb(plat(g.platform).color));
  if (key && !colorCache.has(key)) colorFor(key).then((rgb) => { if (rgb && tvCurrent() === g) el.style.setProperty('--gl', rgb); });
}
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
  const d = new Date();
  if (c) c.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const h = $('#tvHello');
  if (h) { const hr = d.getHours(); h.textContent = hr < 5 ? 'Bonne nuit' : hr < 18 ? 'Bonjour' : 'Bonsoir'; }
}
setInterval(tvClock, 10000);

function tvMove(dx) {
  const tab = tvTabs()[tv.tab];
  if (!tab) return;
  const before = tv.idx;
  tv.idx = Math.max(0, Math.min(tab.games.length - 1, tv.idx + dx));
  if (tv.idx !== before) { uiSound('move'); padRumble(); } else uiSound('edge');
  renderTV(true);
}
function tvTab(d) {
  const n = tvTabs().length;
  tv.tab = (tv.tab + d + n) % n;
  tv.idx = 0;
  uiSound('tab');
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
    case 'ok': if (g) { uiSound('play'); padRumble(60, .5); play(g.id); } break;
    case 'fav': if (g) api.call('game:update', g.id, { favorite: !g.favorite }); break;
    case 'menu': tvMenuOpen(); break;
    case 'back': uiSound('back'); exitTV(); break;
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
    else deskPad(k);
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

// --- Manette sur le bureau : se déplacer dans les rangées de l'accueil ----------------------
// Croix ou stick : choisir un jeu (la carte grossit et brille) ; A : afficher le jeu en haut,
// puis A sur « Jouer » ; B : revenir en haut. Start ouvre toujours le mode TV.
function deskPad(k) {
  if (ui.view !== 'home' || modalState) return;
  const cur = document.activeElement;
  const rows = $$('.rows .row-track');
  const inRow = cur && cur.closest && cur.closest('.rows .card[data-game]');
  const playBtn = $('.hz .btn.play');
  const focus = (el) => { if (!el) return; el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' }); padRumble(); };
  if (!inRow && cur !== playBtn) { if (['left', 'right', 'up', 'down'].includes(k)) focus(playBtn || $('.rows .card[data-game]')); return; }
  if (cur === playBtn) {
    if (k === 'down') focus($('.rows .card.selected') || $('.rows .card[data-game]'));
    else if (k === 'ok') playBtn.click();
    return;
  }
  const track = inRow.closest('.row-track');
  const cards = $$('.card[data-game]', track);
  const i = cards.indexOf(inRow), r = rows.indexOf(track);
  if (k === 'left' || k === 'right') focus(cards[Math.max(0, Math.min(cards.length - 1, i + (k === 'right' ? 1 : -1)))]);
  else if (k === 'down' && rows[r + 1]) { const n = $$('.card[data-game]', rows[r + 1]); focus(n[Math.min(i, n.length - 1)]); }
  else if (k === 'up') { if (r > 0) { const n = $$('.card[data-game]', rows[r - 1]); focus(n[Math.min(i, n.length - 1)]); } else { $('#view').scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); focus(playBtn); } }
  else if (k === 'ok') { ui.heroId = inRow.dataset.game; renderHero(); uiSound('tab'); $('#view').scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); setTimeout(() => focus($('.hz .btn.play')), 50); }
  else if (k === 'back') { $('#view').scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); focus(playBtn); }
}

// --- Sons d'interface (créés à la volée, aucun fichier) et vibration de la manette ----------
let audioCtx = null;
function uiSound(kind) {
  if (!S || S.settings.tvSounds === false || $('#tv').hidden && kind !== 'open') return;
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const tone = (f1, f2, dur, vol, type = 'sine', at = 0) => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t + at); o.frequency.exponentialRampToValueAtTime(f2, t + at + dur);
      gn.gain.setValueAtTime(0.0001, t + at); gn.gain.exponentialRampToValueAtTime(vol, t + at + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(gn).connect(audioCtx.destination); o.start(t + at); o.stop(t + at + dur + 0.02);
    };
    if (kind === 'move') tone(1250, 1050, 0.045, 0.035, 'triangle');
    else if (kind === 'edge') tone(300, 260, 0.06, 0.04, 'triangle');
    else if (kind === 'tab') tone(700, 900, 0.07, 0.04, 'triangle');
    else if (kind === 'play') { tone(523, 523, 0.12, 0.05, 'triangle'); tone(784, 784, 0.22, 0.05, 'triangle', 0.08); }
    else if (kind === 'back') tone(600, 380, 0.09, 0.04, 'triangle');
    else if (kind === 'open') { tone(392, 392, 0.18, 0.04, 'sine'); tone(587, 587, 0.24, 0.04, 'sine', 0.09); tone(784, 784, 0.36, 0.035, 'sine', 0.18); }
  } catch {}
}
function padRumble(ms = 22, strength = 0.22) {
  if (!S || S.settings.tvSounds === false) return;
  try {
    for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) {
      if (gp && gp.connected && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, weakMagnitude: strength, strongMagnitude: strength / 3 }).catch(() => {});
    }
  } catch {}
}
