// HMZ · Fiche d'un jeu, sélecteur d'images, succès, infos.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// --- Fiche d'un jeu -----------------------------------------------------------------------
function openDetail(id) {
  const g = gameById(id);
  if (!g) return;
  const h = heroInfo(g);
  const days = [...Array(30)].map((_, i) => dayStart(Date.now()) - (29 - i) * 864e5);
  const per = days.map((d) => S.sessions.filter((s) => s.g === id && dayStart(s.s) === d).reduce((a, s) => a + (s.e - s.s) / 60000, 0));
  const pmax = Math.max(20, ...per);
  const isSwitchRom = (g.platform === 'switch' || g.platform === 'switch2') && g.source !== 'steam';
  const isEmulated = g.source === 'rom' || (g.source === 'manual' && g.platform !== 'pc' && g.platform !== 'mobile');
  // Tous les émulateurs de la console (le choix est gardé pour ce jeu).
  const emus = isEmulated ? S.emulators.filter((e) => e.platforms.includes(g.platform) || (isSwitchRom && (e.id === 'eden' || e.id === 'lichii'))) : [];
  setAmbientFor(g);
  modal(`<div class="modal dpage" style="--c:${plat(g.platform).color}">
    <button class="x" data-close>${ICON.x}</button>
    <div class="d-hero">${h ? `<div class="hero-bg${h.blur ? ' blur' : ''}" style="background-image:url('${esc(h.url)}')"></div>` : `<div class="hero-bg" style="background:radial-gradient(80% 100% at 30% 0%, ${plat(g.platform).color}66, transparent 70%)"></div>`}</div>
    <div class="d-head">
      ${coverHTML(g)}
      <div class="info">
        <div class="row1"><span class="tag" style="--c:${plat(g.platform).color}">${esc(plat(g.platform).label)}</span><span style="color:var(--muted);font-size:13px">${esc(sourceLabel(g))}</span>${g.running ? '<span class="kicker live" style="font-size:11px"><i class="dot"></i>En cours</span>' : ''}</div>
        ${g.art.logo ? `<img class="d-logo" src="${esc(g.art.logo)}" alt="${esc(g.name)}" data-title="${esc(g.name)}">` : `<h2>${esc(g.name)}</h2>`}
        <div class="acts">
          <button class="btn primary play" data-play="${esc(g.id)}">${playIcon(g)}${playLabel(g)}</button>
          <button class="btn" data-fav="${esc(g.id)}">${ICON.star}${g.favorite ? 'Retirer des favoris' : 'Favori'}</button>
        </div>
      </div>
    </div>
    <div class="d-body">
      <div>
        <div class="kv">
          <div><div class="k">Temps de jeu</div><div class="v">${fmtTime(g.minutes)}</div></div>
          <div><div class="k">Dernière partie</div><div class="v">${g.last ? esc(fmtLast(g.last)) : '—'}</div></div>
          <div><div class="k">Sessions</div><div class="v">${g.sessions || '—'}</div></div>
          <div><div class="k">Taille</div><div class="v">${fmtSize(g.size)}</div></div>
        </div>
        <div class="field-label">30 derniers jours</div>
        <div class="mini-chart">${per.map((m) => `<i class="${m < 1 ? 'z' : ''}" style="height:${Math.max(3, (m / pmax) * 100)}%" title="${fmtTime(m)}"></i>`).join('')}</div>
        <div id="dMeta">${metaHTML(metaCache[id])}</div>
        <div id="dAch">${achHTML(extrasCache[id])}</div>
        <div class="field-label">Ma progression</div>
        <div class="seg status-seg">${STATUS.map(([k, l]) => `<button class="${(g.status || '') === k ? 'on' : ''}" data-gstatus="${k}" data-id="${esc(g.id)}">${l}</button>`).join('')}</div>
        <div class="rate-row"><span class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="${g.rating >= n ? 'on' : ''}" data-rate="${n}" data-id="${esc(g.id)}" title="${n} sur 5">${ICON.star}</button>`).join('')}</span><span class="rate-l">${g.rating ? `${g.rating} sur 5` : 'Pas encore noté'}</span></div>
        <textarea class="input notes" id="gNotes" data-id="${esc(g.id)}" rows="3" placeholder="Mes notes : où j'en suis, astuces, codes…">${esc(g.notes || '')}</textarea>
        <div class="field-label">Genres</div>
        <div class="genre-chips">${(g.genres || []).map((x) => `<span class="genre-chip">${esc(x)}<button data-genre-rm="${esc(x)}" data-id="${esc(g.id)}" title="Retirer">×</button></span>`).join('')}<button class="genre-chip add" data-genre-add="${esc(g.id)}">${ICON.plus}Ajouter</button></div>
        ${S.collections.length ? `<div class="field-label">Collections</div><div class="genre-chips">${S.collections.map((c) => `<button class="genre-chip" data-colltoggle="${esc(c.id)}" data-id="${esc(g.id)}" style="${c.games.includes(g.id) ? `background:color-mix(in srgb, ${c.color} 25%, transparent);color:var(--text)` : ''}"><span class="dot-c" style="width:8px;height:8px;border-radius:50%;background:${c.color}"></span>${esc(c.name)}${c.games.includes(g.id) ? ' ✓' : ''}</button>`).join('')}</div>` : ''}
        ${emus.length > 1 ? `<div class="field-label">Lancer avec</div><div class="seg wrap">${emus.map((e) => `<button class="${g.emu === e.id ? 'on' : ''}" data-setemu="${e.id}" data-id="${esc(g.id)}">${esc(e.name)}${e.installed ? '' : ' (à installer)'}</button>`).join('')}</div>` : ''}
        ${g.notInstalled ? '' : `<div class="field-label">Lancement</div>
        <div class="lopts">
          ${g.platform !== 'mobile' && (g.canAdmin || isEmulated) ? `<label class="lopt"><span><b>Options de lancement</b><small>${isEmulated ? 'Ajoutées à la commande de l\'émulateur.' : 'Ajoutées à la commande du jeu (ex. -windowed, -dx11).'}</small></span><input class="input" id="gArgs" data-id="${esc(g.id)}" value="${esc(g.launchArgs || '')}" placeholder="Aucune" spellcheck="false"></label>` : ''}
          <div class="lopt"><span><b>Activer le HDR</b><small>Windows passe en HDR au lancement, puis revient comme avant à la fin. Seulement sur un écran compatible.</small></span><button class="toggle${g.hdr ? ' on' : ''}" data-gtoggle="hdr" data-id="${esc(g.id)}"></button></div>
          ${g.canAdmin ? `<div class="lopt"><span><b>Lancer en administrateur</b><small>Windows te demandera de confirmer à chaque lancement.</small></span><button class="toggle${g.runAsAdmin ? ' on' : ''}" data-gtoggle="runAsAdmin" data-id="${esc(g.id)}"></button></div>` : ''}
        </div>`}
        ${g.source === 'manual' && g.platform !== 'pc' ? `<div class="field-label">Console</div><select class="select" id="setPlat" data-id="${esc(g.id)}">${ORDER.filter((p) => S.platforms[p] && S.platforms[p].family !== 'pc').map((p) => `<option value="${p}"${g.platform === p ? ' selected' : ''}>${esc(plat(p).label)}</option>`).join('')}</select>` : ''}
        ${g.extras && g.extras.length ? `<div class="field-label">Contenu supplémentaire</div><div class="extras">${g.extras.filter((x) => x === 'update').length ? `<span class="tag" style="--c:#5fd38d">${g.extras.filter((x) => x === 'update').length} mise${g.extras.filter((x) => x === 'update').length > 1 ? 's' : ''} à jour</span>` : ''}${g.extras.filter((x) => x === 'dlc').length ? `<span class="tag" style="--c:#7aa2ff">${g.extras.filter((x) => x === 'dlc').length} DLC</span>` : ''}<span style="color:var(--muted);font-size:12.5px">Trouvés dans tes dossiers et signalés à l'émulateur. Si le jeu ne les voit pas : ouvre l'émulateur › Fichier › Installer des fichiers.</span></div>` : ''}
        <div class="path-box">${esc(g.path)}</div>
      </div>
      <div class="side-list">
        <button data-rename="${esc(g.id)}">${ICON.edit}Renommer</button>
        <button data-pick="cover" data-id="${esc(g.id)}">${ICON.image}Choisir la jaquette</button>
        <button data-pick="hero" data-id="${esc(g.id)}">${ICON.image}Choisir l'image de fond</button>
        <button data-pick="logo" data-id="${esc(g.id)}">${ICON.image}Choisir le logo</button>
        <button data-resetart="${esc(g.id)}">${ICON.refresh}Images d'origine</button>
        ${g.notInstalled ? '' : `<button data-openfolder="${esc(g.id)}">${ICON.folder}Ouvrir l'emplacement</button>`}
        ${g.platform !== 'mobile' ? `<button data-hltb="${esc(g.id)}">${ICON.clock}Durée de vie ↗</button>` : ''}
        <button data-hide="${esc(g.id)}">${ICON.eye}${g.hidden ? 'Afficher dans la bibliothèque' : 'Masquer ce jeu'}</button>
        ${g.source === 'manual' ? `<button class="danger" data-remove="${esc(g.id)}">${ICON.trash}Retirer de HMZ</button>` : ''}
      </div>
    </div>
  </div>`, { detail: id });
  loadExtras(id);
  loadMeta(id);
}

// Capture d'écran en grand (flèches pour passer à la suivante, Échap pour fermer).
function openShot(shots, i) {
  const el = document.createElement('div');
  el.className = 'shot-view';
  const show = () => { el.innerHTML = `<img src="${esc(shots[i].full)}" alt=""><span class="shot-n">${i + 1} / ${shots.length}</span>`; };
  show();
  const key = (e) => {
    if (e.key === 'ArrowRight') { i = (i + 1) % shots.length; show(); }
    else if (e.key === 'ArrowLeft') { i = (i - 1 + shots.length) % shots.length; show(); }
    else if (e.key === 'Escape') { close(); }
    e.stopPropagation(); e.preventDefault();
  };
  const close = () => { el.remove(); document.removeEventListener('keydown', key, true); };
  el.addEventListener('click', close);
  document.addEventListener('keydown', key, true);
  document.body.appendChild(el);
}

// Statut de progression d'un jeu.
const STATUS = [['', 'Aucun'], ['todo', 'Pas commencé'], ['playing', 'En cours'], ['done', 'Terminé'], ['perfect', '100 %'], ['dropped', 'Abandonné']];
const STATUS_LABEL = Object.fromEntries(STATUS);
const STATUS_ORDER = ['playing', 'todo', '', 'perfect', 'done', 'dropped'];

// Jeu au hasard : de préférence un jeu installé, pas fini, peu joué.
function randomGame() {
  const pool = visible().filter((g) => g.emuReady && !['done', 'perfect', 'dropped'].includes(g.status));
  const list = pool.length ? pool : visible();
  if (!list.length) return toast('Aucun jeu dans ta bibliothèque.', 'info');
  const weights = list.map((g) => 1 / (1 + Math.sqrt(g.minutes || 0) / 6) + (g.status === 'playing' ? 0.6 : 0) + (g.favorite ? 0.3 : 0));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const pick = list.find((_, i) => (r -= weights[i]) <= 0) || list[0];
  toast(`Et si tu jouais à ${pick.name} ?`, 'ok', 3500);
  openDetail(pick.id);
}

// Infos de la fiche (résumé, date, studio, captures), chargées à part.
const metaCache = {};
async function loadMeta(id) {
  try { metaCache[id] = await api.call('game:meta', id); } catch { return; }
  const box = $('#dMeta');
  if (box && modalState && modalState.detail === id) box.innerHTML = metaHTML(metaCache[id]);
}
function metaHTML(m) {
  if (!m || m.none) return '';
  const facts = [m.releasedText && ['Sortie', m.releasedText], m.dev && ['Développeur', m.dev], m.pub && m.pub !== m.dev && ['Éditeur', m.pub]].filter(Boolean);
  return `<div class="field-label">À propos</div>
    ${m.desc ? `<p class="d-desc${ui.descOpen ? ' open' : ''}">${esc(m.desc)}</p>${m.desc.length > 260 ? `<button class="linkish ach-more" data-action="desc-toggle">${ui.descOpen ? 'Réduire' : 'Lire la suite'}</button>` : ''}` : ''}
    ${facts.length ? `<div class="d-facts">${facts.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
    ${(m.shots || []).length ? `<div class="d-shots">${m.shots.map((x, i) => `<button data-shot="${i}"><img src="${esc(x.thumb)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    ${m.url ? `<div class="d-src">Source : <span class="linkish" data-url="${esc(m.url)}">${m.src === 'steam' ? 'boutique Steam' : 'Wikipédia'}</span></div>` : ''}`;
}

// Succès Steam de la fiche (chargés à part, gardés le temps de la session).
const extrasCache = {};
async function loadExtras(id) {
  const g = gameById(id);
  if (!g || g.source !== 'steam') return;
  try {
    extrasCache[id] = await api.call('game:extras', id);
  } catch { return; }
  const box = $('#dAch');
  if (box && modalState && modalState.detail === id) box.innerHTML = achHTML(extrasCache[id]);
}
function achHTML(x) {
  const a = x && x.achievements;
  if (!a) return '';
  const pct = Math.round((a.unlocked / a.total) * 100);
  const open = ui.achOpen;
  const shown = open ? a.list : a.list.slice(0, 18);
  const item = (t) => {
    const name = t.hidden && !t.unlocked ? 'Succès caché' : t.name;
    const desc = t.hidden && !t.unlocked ? 'Continue à jouer pour le découvrir.' : t.desc;
    const when = t.time ? new Date(t.time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return open
      ? `<div class="ach-row${t.unlocked ? ' on' : ''}">${t.icon ? `<img src="${esc(t.icon)}" alt="" loading="lazy">` : '<span class="ach-ph"></span>'}<div><div class="an">${esc(name)}</div><div class="ad">${esc(desc || '')}</div></div><span class="aw">${t.unlocked ? esc(when || 'Débloqué') : ''}</span></div>`
      : `<span class="ach${t.unlocked ? ' on' : ''}" title="${esc(name + (desc ? ' — ' + desc : '') + (when ? ' · ' + when : ''))}">${t.icon ? `<img src="${esc(t.icon)}" alt="" loading="lazy">` : ''}</span>`;
  };
  return `<div class="field-label">Succès Steam</div>
    <div class="ach-head"><div class="ach-bar"><i style="width:${pct}%"></i></div><b>${a.unlocked} / ${a.total}</b><span>${pct} %</span></div>
    <div class="${open ? 'ach-list' : 'ach-grid'}">${shown.map(item).join('')}</div>
    ${a.total > 18 || open ? `<button class="linkish ach-more" data-action="ach-toggle">${open ? 'Réduire' : `Voir les ${a.total} succès`}</button>` : ''}`;
}

let modalState = null;
function modal(html, state = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg">${html}</div>`;
  modalState = state;
  const bg = root.firstElementChild;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) closeModal(); });
}
function closeModal() { const wasDetail = modalState && modalState.detail; $('#modal-root').innerHTML = ''; modalState = null; if (wasDetail) setAmbientFor(featured()); }
function refreshModal() { if (modalState && modalState.detail) { const st = $('.modal')?.scrollTop; openDetail(modalState.detail); if (st) $('.modal').scrollTop = st; } }

async function openPicker(id, kind) {
  const g = gameById(id);
  const label = { cover: 'la jaquette', hero: "l'image de fond", logo: 'le logo' }[kind];
  const ratio = { cover: '2/3', hero: '96/31', logo: '16/9' }[kind];
  const cols = { cover: 'repeat(auto-fill, minmax(130px, 1fr))', hero: 'repeat(auto-fill, minmax(260px, 1fr))', logo: 'repeat(auto-fill, minmax(180px, 1fr))' }[kind];
  modal(`<div class="modal picker"><button class="x" data-close>${ICON.x}</button>
    <div style="padding:26px 30px 8px"><div class="kicker" style="color:var(--muted)">${esc(g.name)}</div><h2 style="margin:10px 0 4px;font:800 30px var(--display);letter-spacing:-.03em">Choisir ${label}</h2></div>
    <div class="pick-tabs">${['cover', 'hero', 'logo'].map((k) => `<button class="${k === kind ? 'on' : ''}" data-pick="${k}" data-id="${esc(id)}">${{ cover: 'Jaquette', hero: 'Fond', logo: 'Logo' }[k]}</button>`).join('')}
      <span style="flex:1"></span><button class="btn sm ghost" data-art="${kind}" data-id="${esc(id)}">${ICON.folder}Depuis mon PC</button><button class="btn sm ghost" data-pickback="${esc(id)}">Retour</button></div>
    <div class="pick-grid" id="pickGrid" style="grid-template-columns:${cols}"><div class="pick-msg"><div class="spin-s"></div>Recherche des propositions…</div></div>
  </div>`, { picker: id });
  try {
    const opts = await api.call('art:options', id, kind);
    if (!$('#pickGrid')) return;
    $('#pickGrid').innerHTML = opts.length
      ? opts.map((o) => `<button class="pick-it${kind === 'logo' ? ' lg' : ''}" data-pickurl="${esc(o.url)}" data-kind="${kind}" data-id="${esc(id)}" style="aspect-ratio:${ratio}"><img src="${esc(o.thumb)}" loading="lazy"></button>`).join('')
      : '<div class="pick-msg">Aucune proposition trouvée pour ce jeu. Tu peux choisir une image depuis ton PC.</div>';
  } catch (e) {
    if ($('#pickGrid')) $('#pickGrid').innerHTML = `<div class="pick-msg">${esc(e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''))}<br><br><button class="btn sm" data-go="settings" data-close>Ouvrir les Paramètres</button></div>`;
  }
}

async function openBlueStacks() {
  modal(`<div class="modal dialog" style="width:min(560px,92vw)"><button class="x" data-close>${ICON.x}</button>
    <h3>Ajouter mes jeux BlueStacks</h3><p>Coche les jeux à ajouter dans la catégorie Mobile.</p>
    <div id="bsList" class="bs-list"><div class="pick-msg" style="padding:30px"><div class="spin-s"></div>Recherche des jeux installés dans BlueStacks…</div></div>
    <div class="field-label">Un jeu manque ? Colle son lien Google Play</div>
    <input class="input" id="bsManual" placeholder="https://play.google.com/store/apps/details?id=…">
    <div class="acts"><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-action="bs-confirm">Ajouter</button></div></div>`);
  try {
    const r = await api.call('bluestacks:candidates');
    const el = $('#bsList'); if (!el) return;
    if (!r.installed) { el.innerHTML = '<p class="chint" style="padding:10px 0">BlueStacks n\'est pas installé sur ce PC (ou pas dans son dossier habituel).</p>'; return; }
    el.innerHTML = r.list.length
      ? r.list.map((x) => `<label class="bs-it"><input type="checkbox" value="${esc(x.pkg)}" data-name="${esc(x.name)}" checked><span class="nm">${esc(x.name)}</span><span class="pk">${esc(x.pkg)}</span></label>`).join('')
      : '<p class="chint" style="padding:10px 0">Aucun jeu trouvé automatiquement. Colle le lien Google Play de chaque jeu ci-dessous : tu le trouves en cherchant le jeu sur play.google.com.</p>';
  } catch (e) { const el = $('#bsList'); if (el) el.innerHTML = `<p class="chint">${esc(e.message)}</p>`; }
}

function askText(title, text, value) {
  return new Promise((resolve) => {
    modal(`<div class="modal dialog"><h3>${esc(title)}</h3><p>${esc(text)}</p><input class="input" id="askInput" value="${esc(value)}">
      <div class="acts"><button class="btn ghost" id="askNo">Annuler</button><button class="btn primary" id="askYes">Valider</button></div></div>`);
    const inp = $('#askInput');
    inp.focus(); inp.select();
    const done = (v) => { closeModal(); resolve(v); };
    $('#askNo').onclick = () => done(null);
    $('#askYes').onclick = () => done(inp.value.trim());
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(null); };
  });
}

function confirmBox(title, text, yes = 'Continuer', danger = false) {
  return new Promise((resolve) => {
    modal(`<div class="modal dialog"><h3>${esc(title)}</h3><p>${text}</p>
      <div class="acts"><button class="btn ghost" id="cNo">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cYes">${esc(yes)}</button></div></div>`);
    $('#cNo').onclick = () => { closeModal(); resolve(false); };
    $('#cYes').onclick = () => { closeModal(); resolve(true); };
    $('#cYes').focus();
  });
}
