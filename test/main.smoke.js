const Module = require('module'); const path=require('path'), fs=require('fs'), os=require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'hmzm-'));
setTimeout(() => { console.error('ÉCHEC : le test ne se termine pas (erreur avalée ?)'); process.exit(1); }, 25000).unref();
// Si le test s'arrête avant sa fin (erreur avalée par la protection de HMZ), c'est un échec.
let reachedEnd = false;
process.on('exit', (code) => { if (!reachedEnd && code === 0) { console.error('ÉCHEC : le test s\'est arrêté avant la fin'); process.exitCode = 1; } });
process.env.HOME = tmp;
const handlers = {}; let readyCb; const sent=[];
const fakeWin = { webContents:{ send:(c,d)=>sent.push(c), setWindowOpenHandler(){}, once(){} }, isDestroyed:()=>false, loadFile(){}, once(){}, on(){}, show(){}, minimize(){}, restore(){}, focus(){}, setFullScreen(){}, isFullScreen:()=>false, isMaximized:()=>false };
const electron = {
  app: { requestSingleInstanceLock:()=>true, quit(){}, exit:(c)=>{ console.error('app.exit', c); process.exit(c||0); }, relaunch(){}, setJumpList(){}, on(){}, getVersion:()=>'2.0.0', getPath:()=>path.join(tmp,'userData'), whenReady:()=>({ then:(cb)=>{ readyCb=cb; } }) },
  BrowserWindow: function(){ return fakeWin; },
  ipcMain: { handle:(ch,fn)=>{ handlers[ch]=fn; } },
  dialog: { showErrorBox:(t,m)=>console.error('BOÎTE D\'ERREUR:', t, m) }, shell: { openExternal: async()=>{}, openPath: async()=>'' }, Menu: { setApplicationMenu(){}, buildFromTemplate:()=>({}) },
  globalShortcut: { register:()=>true, unregister(){}, unregisterAll(){} }, Tray: function(){ return { setToolTip(){}, setContextMenu(){}, on(){}, destroy(){} }; }, nativeImage: { createFromPath:()=>({ resize(){ return this; } }) },
};
const orig = Module._load;
Module._load = function(req, ...a){ if (req==='electron') return electron; return orig.call(this, req, ...a); };
global.fetch = async () => { throw new Error('offline'); };
require('../main.js');
// Le chargement doit enregistrer les fonctions de la fenêtre, sans aucun plantage noté.
const logFile = path.join(tmp, 'userData', 'hmz.log');
const crashes = () => { try { return fs.readFileSync(logFile, 'utf8').split('\n').filter((l) => /PLANTAGE|error during load/i.test(l)); } catch { return []; } };
if (!handlers['state:get'] || crashes().length) { console.error('ÉCHEC : main.js ne se charge pas correctement', crashes()); process.exit(1); }
try { readyCb(); } catch (e) { console.error('ÉCHEC au démarrage :', e); process.exit(1); }
(async()=>{
  // Faux jeux
  const dir = path.join(tmp,'HMZ','Jeux','Switch 2'); fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'Pokemon Pokopia [0100F4300BF2C000][v0].nsp'),'x');
  const call = async (ch,...a)=>{ const r = await handlers[ch]({},...a); if(!r.ok) throw new Error(ch+': '+r.error); return r.data; };
  await call('library:scan');
  const st = await call('state:get');
  console.log('jeux:', st.games.map(g=>`${g.platform}:${g.name} emu=${g.emu} prêt=${g.emuReady}`));
  console.log('émulateurs:', st.emulators.map(e=>`${e.name}:${e.installed}`).join(', '));
  const r = await call('game:launch', st.games[0].id);
  console.log('lancer sans émulateur →', r);
  await call('game:update', st.games[0].id, {favorite:true, customName:'Pokopia'});
  const st2 = await call('state:get');
  console.log('après modif:', st2.games[0].name, st2.games[0].favorite);
  await call('settings:set', {emuFullscreen:false});
  console.log('dossiers créés:', fs.readdirSync(path.join(tmp,'HMZ','Jeux')).join(', '), '|', fs.existsSync(path.join(tmp,'HMZ','Emulateurs')));
  await new Promise(r=>setTimeout(r,1500));
  console.log('événements envoyés:', [...new Set(sent)].join(', '));
  if (crashes().length) { console.error('ÉCHEC : plantage noté', crashes()); process.exit(1); }
  reachedEnd = true;
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
