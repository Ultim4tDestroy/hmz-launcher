const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const util=require('../src/util');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v23-'));
const CFG=require('../src/emuconfig');
// 1. Modifier un ini existant sans casser le reste
const ini=path.join(tmp,'qt-config.ini');
fs.writeFileSync(ini,'[Renderer]\r\nbackend\\default=true\r\nbackend=0\r\nother=5\r\n\r\n[UI]\r\ntheme=dark\r\nPaths\\gamedirs\\1\\path=SDMC\r\nPaths\\gamedirs\\1\\deep_scan=false\r\nPaths\\gamedirs\\1\\expanded=true\r\nPaths\\gamedirs\\size=1\r\n');
CFG.setKeys(ini,{Renderer:{'backend\\default':'false',backend:'1'},Controls:{x:'1'}});
CFG.addYuzuGameDirs(ini,['C:\\Users\\h\\HMZ\\Jeux\\Switch','D:\\Jeux']);
CFG.addYuzuGameDirs(ini,['C:\\Users\\h\\HMZ\\Jeux\\Switch']);
const t=fs.readFileSync(ini,'utf8');
assert.ok(t.includes('backend\\default=false\r\nbackend=1\r\nother=5'));
assert.ok(t.includes('theme=dark'));
assert.equal(CFG.getKey(ini,'UI','Paths\\gamedirs\\size'),'3');
assert.equal(CFG.getKey(ini,'UI','Paths\\gamedirs\\2\\path'),'C:/Users/h/HMZ/Jeux/Switch');
assert.equal(CFG.getKey(ini,'UI','Paths\\gamedirs\\3\\deep_scan'),'true');
assert.equal(CFG.getKey(ini,'Controls','x'),'1');
console.log('ini OK');
// 2. Niveaux de carte graphique
assert.equal(CFG.gpuTier(['NVIDIA GeForce RTX 4070']),3);
assert.equal(CFG.gpuTier(['NVIDIA GeForce RTX 3060']),3);
assert.equal(CFG.gpuTier(['NVIDIA GeForce GTX 1660 SUPER']),2);
assert.equal(CFG.gpuTier(['AMD Radeon RX 7800 XT']),3);
assert.equal(CFG.gpuTier(['Intel(R) UHD Graphics 620']),1);
assert.equal(CFG.gpuTier(['Intel(R) UHD Graphics','NVIDIA GeForce RTX 2060']),2);
console.log('GPU OK');
// 3. Application complète sur des émulateurs factices
(async()=>{
  const mk=(n,exe)=>{const d=path.join(tmp,n);fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,exe),'');return {exe:path.join(d,exe)};};
  const eden=mk('Eden','eden.exe'), mel=mk('melonDS','melonDS.exe'), az=mk('Azahar','azahar.exe');
  let r=await CFG.apply('eden',eden,{gameDirs:['C:\\HMZ\\Jeux\\Switch'],padKinds:[]});
  const ei=path.join(tmp,'Eden','user','config','qt-config.ini');
  assert.equal(CFG.getKey(ei,'Renderer','backend'),'1'); assert.equal(CFG.getKey(ei,'UI','confirmClose'),'false'); assert.equal(CFG.getKey(ei,'UI','Paths\\gamedirs\\4\\path'),'C:/HMZ/Jeux/Switch');
  r=await CFG.apply('melonds',mel,{padKinds:['playstation']});
  const toml=fs.readFileSync(path.join(tmp,'melonDS','melonDS.toml'),'utf8');
  assert.ok(toml.includes('[Instance0.Joystick]') && toml.includes('L = 9') && toml.includes('A = 1'));
  await CFG.apply('melonds',mel,{padKinds:['xbox']});
  const toml2=fs.readFileSync(path.join(tmp,'melonDS','melonDS.toml'),'utf8');
  assert.ok(toml2.includes('L = 4') && !toml2.includes('L = 9') && (toml2.match(/\[Instance0\.Joystick\]/g)||[]).length===1);
  await CFG.apply('azahar',az,{});
  assert.equal(CFG.getKey(path.join(tmp,'Azahar','user','config','qt-config.ini'),'Renderer','graphics_api'),'2');
  console.log('réglages OK\n'+toml2);
  // 4. Sauvegardes
  util.run=(cmd,args)=>new Promise((res,rej)=>{try{ if(args[0]==='-a'){ execFileSync('zip',['-qr',args[3],'.'],{cwd:args[5]}); } res(''); }catch(e){rej(e);}});
  delete require.cache[require.resolve('../src/backup')];
  const B=require('../src/backup');
  const save=path.join(tmp,'Eden','user','nand','user','save','0000');
  fs.mkdirSync(save,{recursive:true}); fs.writeFileSync(path.join(save,'game.sav'),'x');
  const br=path.join(tmp,'Saves');
  const a=await B.backup('eden','Eden',eden,{},br,0);
  assert.ok(a.file && fs.existsSync(a.file));
  const b=await B.backup('eden','Eden',eden,{},br,a.mtime);
  assert.equal(b.file,null,'rien de neuf = pas de nouvelle sauvegarde');
  for(let i=0;i<20;i++) fs.writeFileSync(path.join(br,'Eden',`Eden_2026-01-${String(i).padStart(2,'0')}.zip`),'');
  B.prune(path.join(br,'Eden'));
  assert.equal(fs.readdirSync(path.join(br,'Eden')).length,15);
  // melonDS : .sav à côté des jeux
  const ds=path.join(tmp,'DS'); fs.mkdirSync(ds); fs.writeFileSync(path.join(ds,'Pokemon.nds'),''); fs.writeFileSync(path.join(ds,'Pokemon.sav'),'s');
  const m=await B.backup('melonds','melonDS',mel,{ds:[ds]},br,0);
  assert.ok(m.file); console.log('sauvegardes OK', path.basename(a.file));
  // 5. Riot et extras Switch
  process.env.ProgramData=path.join(tmp,'PD');
  const rg=path.join(tmp,'PD','Riot Games'); fs.mkdirSync(path.join(rg,'Metadata','valorant.live'),{recursive:true});
  fs.mkdirSync(path.join(rg,'Metadata','riot_client'),{recursive:true});
  const rc=path.join(tmp,'RiotClientServices.exe'); fs.writeFileSync(rc,'');
  const vdir=path.join(tmp,'VALORANT'); fs.mkdirSync(vdir);
  fs.writeFileSync(path.join(rg,'RiotClientInstalls.json'),JSON.stringify({rc_default:rc}));
  fs.writeFileSync(path.join(rg,'Metadata','valorant.live','valorant.live.product_settings.yaml'),`product_install_full_path: "${vdir.replace(/\\/g,'/')}"\n`);
  const SCAN=require('../src/scan');
  const riot=SCAN.scanRiot();
  assert.equal(riot.length,1); assert.equal(riot[0].name,'VALORANT'); assert.deepEqual(riot[0].launch.args,['--launch-product=valorant','--launch-patchline=live']);
  const sw=path.join(tmp,'SW'); fs.mkdirSync(sw);
  for (const f of ['Pokopia [0100F4300BF2C000][v0].nsp','Pokopia [0100F4300BF2C800][v65536].nsp','Pokopia DLC [0100F4300BF2D001][v0].nsp']) fs.writeFileSync(path.join(sw,f),'');
  const ex=SCAN.scanSwitchExtras({switch2:[sw]});
  assert.deepEqual(ex['0100F4300BF2'].map(x=>x.kind).sort(),['dlc','update']);
  console.log('Riot + extras OK');
})().catch(e=>{console.error(e);process.exit(1);});
