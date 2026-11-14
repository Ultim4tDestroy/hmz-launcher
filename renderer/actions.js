// HMZ · Clics, clavier, glisser-déposer, lancement.
// (Les fichiers de l'interface partagent leurs variables : ils sont chargés dans l'ordre de index.html.)
// --- Actions ------------------------------------------------------------------------------
async function call(ch, ...args) {
  try { return await api.call(ch, ...args); } catch (e) { toast(e.message, 'error', 6000); throw e; }
}

async function play(id, emu) {
  const g = gameById(id);
  if (!g) return;
  const res = await call('game:launch', id, emu);
  if (res && res.needEmu) {
    const e = S.emulators.find((x) => x.id === res.needEmu);
    if (!$('#tv').hidden) { tvMessage(`Installe d'abord ${e.name} depuis la page Émulateurs.`); return; }
    const ok = await confirmBox(`Il te faut ${e.name}`, `Pour jouer à <b>${esc(g.name)}</b>, HMZ doit installer ${esc(e.name)}, l'émulateur ${esc(e.platforms.map((p) => plat(p).label).join(' / '))}. Il sera téléchargé depuis sa page officielle.${e.needsKeys ? '<br><br>Il te faudra ensuite tes clés et ton firmware, extraits de ta console.' : ''}`, `Installer ${e.name}`);
    if (ok) { go('emulators'); installEmu(e.id); }
    return;
  }
  if (res && res.viaLauncher) { toast(`Launcher ${res.viaLauncher} ouvert : clique sur « Jouer » pour lancer ${g.name}.`, 'ok', 5000); return; }
  if (res && res.installing) { toast(`Installation de ${g.name} ouverte dans ${res.store}.`, 'ok', 4000); return; }
  if (res && res.ok) {
    if (!$('#tv').hidden) tvLaunching(g);
    else toast(`Lancement de ${g.name}…`, 'ok', 2500);
  }
}

async function installEmu(id) {
  emuProg[id] = { step: 'Préparation…' };
  render();
  try {
    delete emuErr[id];
    const r = await api.call('emu:install', id);
    const e = S.emulators.find((x) => x.id === id);
    toast(r.upToDate ? `${e.name} est déjà à jour.` : `${e.name} ${r.version} est installé.`, 'ok');
    if (!r.upToDate && e.needsKeys) setTimeout(() => toast(`Ajoute maintenant tes clés et ton firmware pour ${e.name}.`, 'info', 6000), 600);
  } catch (err) {
    emuErr[id] = err.message;
    toast(err.message, 'error', 9000);
  } finally {
    delete emuProg[id];
    render();
  }
}

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-url], .linkish, a, .lrow, .slot');
  if (!ev.target.closest('.theme-pop, #themeBtn')) $('.theme-pop')?.remove();
  if (!$('#ctx').hidden && !ev.target.closest('#ctx')) closeCtx();
  if (!t) return;
  const d = t.dataset;
  if (t.classList.contains('slot')) {
    toggleFlip(t);
    if (ui.view === 'home') { ui.heroId = t.dataset.game; renderHero(); }
    return;
  }
  if (d.noop) return;
  if (t.closest('#ctx') && !d.colltoggle && !d.collnewfor) closeCtx();

  if (d.view) return go(d.view);
  if (d.go) return go(d.go);
  if (d.win) return api.call('win:' + d.win);
  if (d.close !== undefined) return closeModal();
  if (d.play) { if (modalState) closeModal(); return play(d.play); }
  if (d.detail) return openDetail(d.detail);
  if (d.menu) { const r = t.getBoundingClientRect(); return openCtx(d.menu, r.left, r.bottom + 8); }
  if (d.fav) { const g = gameById(d.fav); await call('game:update', d.fav, { favorite: !g.favorite }); return; }
  if (d.hide) {
    const g = gameById(d.hide); const was = g.hidden;
    await call('game:update', d.hide, { hidden: !was });
    if (!was) { if (modalState) closeModal(); toast(`${g.name} est masqué.`, 'info', 6500, { label: 'Annuler', fn: () => call('game:update', g.id, { hidden: false }) }); }
    return;
  }
  if (d.rename) { const g = gameById(d.rename); const v = await askText('Renommer', 'Laisse vide pour reprendre le nom d\'origine.', g.name); if (v !== null) await call('game:update', g.id, { customName: v === g.originalName ? '' : v }); return; }
  if (d.art) { if (modalState && modalState.picker) { const back = modalState.picker; closeModal(); await call('game:setArt', d.id, d.art); openDetail(back); return; } return call('game:setArt', d.id, d.art); }
  if (d.pick) return openPicker(d.id, d.pick);
  if (d.pickurl) { await call('game:setArtUrl', d.id, d.kind, d.pickurl); const id = d.id; closeModal(); openDetail(id); toast('Image changée.', 'ok', 2000); return; }
  if (d.pickback) { const id = d.pickback; closeModal(); return openDetail(id); }
  if (d.resetart) return call('game:resetArt', d.resetart);
  if (d.openfolder) return call('game:openFolder', d.openfolder);
  if (d.remove) { closeModal(); return call('game:remove', d.remove); }
  if (d.setemu) return call('game:update', d.id, { emu: d.setemu });
  if (d.setplat) return call('game:setPlatform', d.id, d.setplat);
  if (d.seeall) { ui.coll = d.seeall === 'fav' ? { type: 'fav' } : d.seeall.startsWith('c:') ? { type: 'user', key: d.seeall.slice(2) } : { type: 'platform', key: d.seeall }; ui.q = ''; return go('library'); }
  const co = ev.target.closest('[data-collopen]');
  if (co) { ui.openColl[co.dataset.collopen] = !ui.openColl[co.dataset.collopen]; return render(); }
  if (d.genrePick) { ui.genre = ui.genre === d.genrePick ? null : d.genrePick; ui.genreOpen = false; return render(); }
  if (ui.genreOpen && !t.closest('.gsel')) { ui.genreOpen = false; render(); }
  if (d.coll) { ui.coll = JSON.parse(d.coll); $('#view').scrollTop = 0; return render(); }
  if (d.collsec) { ui.closed[d.collsec] = !ui.closed[d.collsec]; return render(); }
  if (d.snav) { const el = document.getElementById(d.snav); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.libview) { setAppearance({ libView: d.libview }); return render(); }
  if (d.themePick) { setAppearance({ theme: d.themePick }); $$('[data-theme-pick]').forEach((b) => b.classList.toggle('on', b.dataset.themePick === d.themePick)); return; }
  if (d.accent !== undefined) { setAppearance({ accent: d.accent }); $$('[data-accent]').forEach((b) => b.classList.toggle('on', b.dataset.accent === d.accent)); return; }
  if (d.collmenu) { const r = t.getBoundingClientRect(); return openCollCtx(d.collmenu, r.left, r.bottom + 8); }
  if (d.colltoggle) {
    const gid = d.id, cid = d.colltoggle;
    const on = await call('collection:toggle', cid, gid); const c = S.collections.find((x) => x.id === cid);
    toast(on ? `Ajouté à « ${c.name} ».` : `Retiré de « ${c.name} ».`, 'ok', 3000, { label: 'Annuler', fn: () => call('collection:toggle', cid, gid, !on) });
    closeCtx(); return;
  }
  if (d.collnewfor) { closeCtx(); const name = await askText('Nouvelle collection', 'Donne un nom à ta collection.', ''); if (name) { await call('collection:create', name, d.collnewfor); toast(`Collection « ${name} » créée.`, 'ok'); } return; }
  if (d.collrename) { closeCtx(); const c = S.collections.find((x) => x.id === d.collrename); const v = await askText('Renommer la collection', '', c.name); if (v) await call('collection:update', c.id, { name: v }); return; }
  if (d.collcolor) { closeCtx(); return call('collection:update', d.id, { color: d.collcolor }); }
  if (d.collmove) { closeCtx(); return call('collection:move', d.id, Number(d.collmove)); }
  if (d.colldelete) { closeCtx(); const c = S.collections.find((x) => x.id === d.colldelete); if (await confirmBox('Supprimer la collection ?', `« ${esc(c.name)} » sera supprimée. Les jeux restent dans ta bibliothèque.`, 'Supprimer')) { await call('collection:delete', c.id); if (ui.coll.type === 'user' && ui.coll.key === c.id) { ui.coll = { type: 'all' }; render(); } } return; }
  if (d.genreRm) { const g = gameById(d.id); await call('game:setGenres', d.id, (g.genres || []).filter((x) => x !== d.genreRm)); return; }
  if (d.genreAdd) { const g = gameById(d.genreAdd); const v = await askText('Ajouter un genre', 'Par exemple : RPG, Course, Plateforme, Combat…', ''); if (v) await call('game:setGenres', g.id, [...(g.genres || []), v]); openDetail(g.id); return; }
  if (d.install) return installEmu(d.install);
  if (d.locate) return call('emu:locate', d.locate);
  if (d.installzip) {
    try { const r = await call('emu:installZip', d.installzip); if (r) { delete emuErr[d.installzip]; toast(`${S.emulators.find((x) => x.id === d.installzip).name} est installé.`, 'ok'); render(); } } catch {}
    return;
  }
  if (d.emucfg) { const r = await call('emu:configure', d.emucfg); toast(`Réglages appliqués : ${r.done.join(', ')}.`, 'ok'); return; }
  if (d.emupad) {
    const e = S.emulators.find((x) => x.id === d.emupad);
    if (e.id === 'melonds') { const r = await call('emu:configure', e.id); toast(`Manette ${PAD_LABEL[(padKinds[0] || 'xbox')] || ''} configurée dans melonDS. Si un bouton ne répond pas : ${PAD_HELP.melonds}`, 'ok', 9000); return; }
    await call('emu:open', e.id);
    toast(PAD_HELP[e.id], 'info', 14000);
    return;
  }
  if (d.forget) return call('emu:forget', d.forget);
  if (d.emudel) {
    const e = S.emulators.find((x) => x.id === d.emudel);
    const text = e.custom
      ? `HMZ va oublier ${esc(e.name)}. Ton dossier <b>${esc(e.dir || '')}</b> n'est pas touché.`
      : `Le dossier de ${esc(e.name)} sera supprimé avec ses réglages${S.settings.backups ? '. Tes sauvegardes de parties sont d\'abord copiées dans le dossier Sauvegardes' : ' et les sauvegardes de parties qu\'il contient'}. Tes jeux ne sont pas touchés.`;
    if (!(await confirmBox(`${e.custom ? 'Oublier' : 'Supprimer'} ${e.name} ?`, text, e.custom ? 'Oublier' : 'Supprimer', true))) return;
    try { await call('emu:uninstall', e.id); delete emuErr[e.id]; toast(`${e.name} est ${e.custom ? 'oublié' : 'supprimé'}.`, 'ok'); } catch {}
    return;
  }
  if (d.emufam) { ui.emu.fam = d.emufam; return render(); }
  if (d.gstatus !== undefined && d.id) { await call('game:update', d.id, { status: d.gstatus }); return refreshModal(); }
  if (d.rate && d.id) { const g = gameById(d.id); const n = Number(d.rate); await call('game:update', d.id, { rating: g.rating === n ? 0 : n }); return refreshModal(); }
  if (d.gtoggle && d.id) { const g = gameById(d.id); await call('game:update', d.id, { [d.gtoggle]: !g[d.gtoggle] }); return refreshModal(); }
  if (d.shot !== undefined && modalState && modalState.detail) { const m = metaCache[modalState.detail]; if (m && m.shots[d.shot]) openShot(m.shots, Number(d.shot)); return; }
  if (d.hltb) { const x = extrasCache[d.hltb]; const g = gameById(d.hltb); return call('open:url', (x && x.hltb) || `https://howlongtobeat.com/?q=${encodeURIComponent(g.name)}`); }
  if (d.emust) { ui.emu.st = d.emust; return render(); }
  if (d.emureset) { ui.emu = { q: '', fam: 'all', st: 'all', sort: ui.emu.sort }; return render(); }
  if (d.emuopen) return call('emu:open', d.emuopen);
  if (d.emudir) return call('emu:openDir', d.emudir);
  if (d.keys) { const r = await call('emu:keys', d.keys); if (r) toast(`Clés installées : ${r.copied.join(', ')}`, 'ok'); return; }
  if (d.fw) { const r = await call('emu:firmware', d.fw); if (r) toast(`Firmware installé (${r.count} fichiers).`, 'ok'); return; }
  if (d.opendir) return call('dir:open', d.opendir);
  if (d.adddir) return call('dir:add', d.adddir);
  if (d.rmdir) return call('dir:remove', d.rmdir, d.dir);
  if (d.url) return call('open:url', d.url);
  if (d.toggle) return call('settings:set', { [d.toggle]: !S.settings[d.toggle] });

  const card = t.closest('.card[data-game], .lrow[data-game]');
  if (card) {
    if (ui.view === 'home' && card.closest('.rows')) {
      ui.heroId = card.dataset.game;
      render();
      $('#view').scrollTo({ top: 0, behavior: 'smooth' });
    } else openDetail(card.dataset.game);
    return;
  }

  switch (d.action) {
    case 'bluestacks-add': openBlueStacks(); break;
    case 'bs-confirm': {
      const items = $$('.bs-it input:checked').map((c) => ({ pkg: c.value, name: c.dataset.name }));
      const extra = ($('#bsManual') || {}).value;
      if (extra && extra.trim()) items.push({ pkg: extra.trim() });
      if (!items.length) { toast('Coche au moins un jeu, ou colle un lien Play Store.'); break; }
      const n = await call('bluestacks:add', items);
      closeModal();
      toast(n ? `${n} jeu${n > 1 ? 'x' : ''} BlueStacks ajouté${n > 1 ? 's' : ''} dans Mobile.` : 'Lien ou nom de paquet non reconnu.', n ? 'ok' : 'error');
      break;
    }
    case 'genre-menu': ui.genreOpen = !ui.genreOpen; render(); break;
    case 'genre-clear': ui.genre = null; ui.genreOpen = false; render(); break;
    case 'report': call('app:report'); break;
    case 'diag': {
      modal(`<div class="modal dialog diag"><h3>Diagnostic</h3><p>Analyse en cours…</p></div>`);
      call('diag:run').then((txt) => {
        modal(`<div class="modal dialog diag"><button class="x" data-close>${ICON.x}</button><h3>Diagnostic</h3><pre class="diag-out">${esc(txt)}</pre>
          <div class="acts"><button class="btn ghost" data-close>Fermer</button><button class="btn primary" id="diagCopy">Copier le rapport</button></div></div>`);
        $('#diagCopy').onclick = () => { navigator.clipboard.writeText(txt).then(() => toast('Rapport copié : colle-le dans ton message.', 'ok')); };
      }).catch(() => closeModal());
      break;
    }
    case 'discord-test': call('discord:test').then(() => toast('Regarde ton profil Discord : HMZ y apparaît pendant 15 secondes.', 'ok', 5000)).catch(() => {}); break;
    case 'lib-export': call('library:export').then((f) => { if (f) toast('Bibliothèque sauvegardée.', 'ok'); }).catch(() => {}); break;
    case 'lib-backups': call('library:openBackups'); break;
    case 'lib-import': confirmBox('Restaurer une bibliothèque ?', 'Ta bibliothèque actuelle sera remplacée par celle du fichier choisi. Une copie de l\'actuelle est faite avant. HMZ redémarrera.', 'Choisir le fichier').then((ok) => { if (ok) call('library:import').catch(() => {}); }); break;
    case 'desc-toggle': { ui.descOpen = !ui.descOpen; const box = $('#dMeta'); if (box && modalState) box.innerHTML = metaHTML(metaCache[modalState.detail]); break; }
    case 'open-log': call('log:open'); break;
    case 'toggle-genres': ui.allGenres = !ui.allGenres; render(); break;
    case 'ach-toggle': { ui.achOpen = !ui.achOpen; const box = $('#dAch'); if (box && modalState) box.innerHTML = achHTML(extrasCache[modalState.detail]); break; }
    case 'new-coll': ui.newColl = true; render(); setTimeout(() => $('#newCollName')?.focus(), 0); break;
    case 'add-game': {
      if (!t.dataset.direct) {
        const r = t.getBoundingClientRect();
        const ctx = $('#ctx');
        ctx.innerHTML = `<button data-action="add-game" data-direct="1">${ICON.folder}Un jeu PC ou console…<span style="margin-left:auto;color:var(--faint);font-size:12px">fichier .exe, .nsp…</span></button>
          <button data-action="bluestacks-add">${ICON.pad}Mes jeux BlueStacks…</button>`;
        ctx.hidden = false;
        const w = ctx.getBoundingClientRect().width;
        ctx.style.left = Math.max(10, Math.min(r.right - w, innerWidth - w - 10)) + 'px';
        ctx.style.top = (r.bottom + 8) + 'px';
        break;
      } const n = await call('game:add'); if (n) toast(`${n} jeu${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`, 'ok'); break; }
    case 'rescan': toast('Recherche des jeux…'); await call('library:scan'); toast('Bibliothèque à jour.', 'ok'); break;
    case 'refresh-art': await call('art:refresh', true); toast('Recherche des images en cours…'); break;
    case 'check-updates': toast('Vérification…'); await call('emu:checkUpdates'); toast('Vérification terminée.', 'ok'); break;
    case 'choose-root': await call('root:choose'); break;
    case 'open-root': await call('root:open'); break;
    case 'restart': await call('app:restart'); break;
    case 'open-backups': await call('backup:open'); break;
    case 'backup-dir': await call('backup:chooseDir'); break;
    case 'backup-now': { const r = await call('backup:now'); toast(r.length ? `Sauvegardé : ${r.join(', ')}.` : 'Aucune sauvegarde à copier pour l\'instant.', 'ok'); break; }
    case 'check-app-update': {
      const r = await call('app:checkUpdate');
      if (r.dev) toast('Les mises à jour automatiques marchent seulement dans la version installée.');
      else if (r.newer) { /* HMZ annonce lui-même la mise à jour trouvée */ }
      else toast(`Tu as la dernière version (${S.version}).`, 'ok');
      break;
    }
    case 'rollback': if (await confirmBox('Revenir à la version installée ?', `HMZ va redémarrer en version ${esc(S.builtinVersion)}. Tes jeux, réglages et temps de jeu sont conservés.`, 'Redémarrer')) await call('app:rollback'); break;
    case 'toggle-hidden': ui.showHidden = !ui.showHidden; render(); break;
  }
});

// Glisser un jeu sur une collection.
let dragId = null;
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest && e.target.closest('[data-game][draggable="true"]');
  if (c) $$('.slot.flipped').forEach((x) => x.classList.remove('flipped'));
  if (!c) return;
  dragId = c.dataset.game;
  c.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', dragId);
  if (ui.view !== 'library') return;
  if (!S.collections.length) toast('Crée d\'abord une collection avec le + de « Mes collections ».', 'info', 3500);
});
document.addEventListener('dragend', (e) => { $$('.dragging').forEach((x) => x.classList.remove('dragging')); $$('.drop').forEach((x) => x.classList.remove('drop')); dragId = null; });
document.addEventListener('dragover', (e) => {
  const it = e.target.closest && e.target.closest('[data-collid]');
  $$('.drop').forEach((x) => { if (x !== it) x.classList.remove('drop'); });
  if (it && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; it.classList.add('drop'); }
});
document.addEventListener('drop', async (e) => {
  const it = e.target.closest && e.target.closest('[data-collid]');
  if (!it || !dragId) return;
  e.preventDefault();
  const id = dragId; dragId = null;
  const c = S.collections.find((x) => x.id === it.dataset.collid);
  await call('collection:toggle', c.id, id, true);
  toast(`${gameById(id).name} ajouté à « ${c.name} ».`, 'ok', 2200);
});

document.addEventListener('dblclick', (e) => {
  const card = e.target.closest('.card[data-game], .lrow[data-game], .slot[data-game]');
  if (card && $('#tv').hidden && !e.target.closest('.play-ic, .f-back button')) { $$('.slot.flipped').forEach((x) => x.classList.remove('flipped')); play(card.dataset.game); }
});
document.addEventListener('contextmenu', (e) => {
  const coll = e.target.closest('[data-collid]');
  if (coll && $('#tv').hidden) { e.preventDefault(); return openCollCtx(coll.dataset.collid, e.clientX, e.clientY); }
  const card = e.target.closest('[data-game], [data-game-ctx]');
  if (card && $('#tv').hidden) { e.preventDefault(); openCtx(card.dataset.game || card.dataset.gameCtx, e.clientX, e.clientY); }
});
document.addEventListener('keydown', async (e) => {
  if (e.target.id === 'newCollName') {
    if (e.key === 'Enter' && e.target.value.trim()) { const c = await call('collection:create', e.target.value.trim()); ui.newColl = false; ui.coll = { type: 'user', key: c.id }; render(); }
    if (e.key === 'Escape') { ui.newColl = false; render(); }
  }
}, true);
document.addEventListener('focusout', (e) => { if (e.target.id === 'newCollName' && ui.newColl) setTimeout(() => { if (ui.newColl && document.activeElement?.id !== 'newCollName') { ui.newColl = false; render(); } }, 150); });
document.addEventListener('input', (e) => {
  if (e.target.id === 'cardSize') {
    document.documentElement.style.setProperty('--card-min', `${e.target.value}px`); S.settings.cardSize = Number(e.target.value);
    clearTimeout(window.__cs); window.__cs = setTimeout(() => { api.call('settings:set', { cardSize: Number(e.target.value) }); if ($('.slot')) { const v = e.target.value; render(); const r = $('#cardSize'); if (r) r.value = v; } }, 250);
    return;
  }
  if (e.target.id === 'emuQ') {
    ui.emu.q = e.target.value.trim();
    const box = $('.emu-results'); if (box) box.innerHTML = emuResultsHTML();
    return;
  }
  if (e.target.id === 'libSearch') {
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const inp = $('#libSearch'); inp.focus(); inp.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'libSort') { ui.sort = e.target.value; render(); }
  if (e.target.id === 'emuSort') { ui.emu.sort = e.target.value; render(); }
  if (e.target.id === 'discordId') { call('settings:set', { discordId: e.target.value.trim() }).then(() => toast('Identifiant enregistré.', 'ok', 2000)); }
  if (e.target.id === 'tvDisplay') { call('settings:set', { tvDisplay: e.target.value }); }
  if (e.target.id === 'tvScale') { call('settings:set', { tvScale: Number(e.target.value) }); }
  if (e.target.id === 'gArgs') { call('game:update', e.target.dataset.id, { launchArgs: e.target.value.trim() }).then(() => toast('Options de lancement enregistrées.', 'ok', 2000)); }
  if (e.target.id === 'gNotes') { call('game:update', e.target.dataset.id, { notes: e.target.value.slice(0, 4000) }); }
  if (e.target.id === 'setPlat') { call('game:setPlatform', e.target.dataset.id, e.target.value); }
  if (e.target.id === 'sgdbKey') { call('settings:set', { sgdbKey: e.target.value.trim() }).then(() => { if (e.target.value.trim()) toast('Clé enregistrée. Recherche des images…', 'ok'); }); }
});

document.addEventListener('keydown', (e) => {
  if (!$('#tv').hidden) return tvKey(e);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openPalette(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !e.shiftKey) { e.preventDefault(); return randomGame(); }
  if ((e.ctrlKey || e.metaKey) && /^[1-5]$/.test(e.key)) { e.preventDefault(); closeModal(); return go(['home', 'library', 'emulators', 'stats', 'settings'][+e.key - 1]); }
  const typing = e.target.matches('input, select, textarea');
  if (!typing && !modalState && e.key === '?') { e.preventDefault(); return openKeys(); }
  const slot = document.activeElement && document.activeElement.closest && document.activeElement.closest('.slot');
  if (slot && !modalState) {
    const sibs = $$('.slot', slot.closest('.shelf'));
    const i = sibs.indexOf(slot);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const n = sibs[Math.max(0, Math.min(sibs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
      if (n) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); if (ui.view === 'home') { ui.heroId = n.dataset.game; renderHero(); } }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); return toggleFlip(slot); }
    if (e.key === 'Enter') { e.preventDefault(); return play(slot.dataset.game); }
  }
  if (e.key === 'Escape' && $('.slot.flipped') && !modalState) { $$('.slot.flipped').forEach((x) => x.classList.remove('flipped')); return; }
  if (e.key === 'F11') { e.preventDefault(); return enterTV(); }
  if (e.key === 'Escape') { if (!$('#ctx').hidden) return closeCtx(); if (modalState) return closeModal(); }
  if (e.target.matches('input, select, textarea') || modalState) return;
  if (ui.view === 'home' && !slot && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const first = $(`.slot[data-game="${CSS.escape((featured() || {}).id || '')}"]`) || $('.slot');
    if (first) { e.preventDefault(); first.focus(); }
  }
  if (ui.view === 'home' && !slot && e.key === 'Enter' && featured()) play(featured().id);
});

$('#searchBtn').onclick = openPalette;
let resizeT = null;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (ui.view === 'library' && (S.settings.libView || 'shelf') === 'shelf' && !$('#view input:focus')) render(); }, 160); });
$('#tvBtn').onclick = () => enterTV();
$('#themeBtn').onclick = (e) => { e.stopPropagation(); toggleThemePop(); };
$('#randomBtn').onclick = () => randomGame();
