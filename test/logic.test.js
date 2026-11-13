const assert = require('assert');
const fs = require('fs'), path = require('path'), os = require('os');
const util = require('../src/util');
const { execFileSync } = require('child_process');

// 1. Noms de jeux
const T = util.cleanRomTitle;
assert.equal(T('Pokemon_Pokopia [0100F4300BF2C000][v0] (Europe).nsp'), 'Pokemon Pokopia');
assert.equal(T('Mario Kart World [010018E011D92000][v0].xci'), 'Mario Kart World');
assert.equal(T('New Super Mario Bros. (Europe) (En,Fr,De,Es,It).nds'), 'New Super Mario Bros.');
assert.equal(T('Pokemon.HeartGold.nds'), 'Pokemon HeartGold');
assert.equal(T('The Legend of Zelda - Tears of the Kingdom v1.2.1.nsp'), 'The Legend of Zelda - Tears of the Kingdom');
const scan = require('../src/scan');
assert.equal(scan.isSwitchExtra('Zelda [0100F2C0115B6800][v393216].nsp'), true);
assert.equal(scan.isSwitchExtra('Zelda [0100F2C0115B6000][v0].nsp'), false);
assert.equal(scan.isSwitchExtra('Zelda DLC Pack.nsp'), true);
console.log('noms OK');

// 2. Choix du fichier à télécharger
const EMU = require('../src/emulators');
const lichii = ['lichii-linux-x86_64.AppImage','lichii-macos-arm64.zip','lichii-windows-x86_64-pgo.zip','lichii-windows-x86_64.zip'].map(name=>({name}));
assert.equal(EMU.pickAsset(lichii, EMU.EMULATORS.lichii).name, 'lichii-windows-x86_64-pgo.zip');
const az = ['azahar-libretro-windows-x86_64-2126.1.1.zip','azahar-windows-msvc-2126.1.1-installer.exe','azahar-windows-msvc-2126.1.1.zip','azahar-windows-msys2-2126.1.1.zip','azahar-windows-mxe-2126.1.1.zip','azahar-macos-universal-2126.1.1.zip'].map(name=>({name}));
assert.equal(EMU.pickAsset(az, EMU.EMULATORS.azahar).name, 'azahar-windows-msvc-2126.1.1.zip');
const mel = ['melonDS-1.1-windows-x86_64.zip','melonDS-1.1-ubuntu-x86_64.zip','melonDS-1.1-macOS-universal.zip','melonDS-1.1-appimage-x86_64.zip'].map(name=>({name}));
assert.equal(EMU.pickAsset(mel, EMU.EMULATORS.melonds).name, 'melonDS-1.1-windows-x86_64.zip');
const eden = ['Eden-Windows-v0.2.0-rc2-amd64-msvc-standard.zip','Eden-Windows-v0.2.0-rc2-arm64-msvc.zip','Eden-Windows-v0.2.0-rc2-amd64-clang-pgo.zip','Eden-Source-v0.2.0-rc2.tar.zst','Eden-Android-v0.2.0-rc2.apk'].map(name=>({name}));
assert.equal(EMU.pickAsset(eden, EMU.EMULATORS.eden).name, 'Eden-Windows-v0.2.0-rc2-amd64-msvc-standard.zip');
console.log('choix des fichiers OK');

// 3. VDF Steam
const v = scan.parseVdf(`"libraryfolders"{"0"{"path"		"C:\\\\Program Files (x86)\\\\Steam" "apps"{"730" "123"}}"1"{"path" "D:\\\\SteamLibrary"}}`);
assert.equal(scan.getCI(v,'LibraryFolders','1','path'), 'D:\\SteamLibrary');
assert.equal(scan.getCI(v,'libraryfolders','0','apps','730'), '123');
console.log('VDF OK');

// 4. Recherche des ROM
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'hmzt-'));
const mk = (rel, size=10) => { const p = path.join(tmp, rel); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, Buffer.alloc(size)); };
mk('Switch 2/Pokemon Pokopia [0100F4300BF2C000][v0].nsp', 100);
mk('Switch 2/Pokemon Pokopia [0100F4300BF2C800][v65536].nsp', 200);
mk('Switch/Zelda/Zelda TOTK [0100F2C0115B6000][v0].xci', 50);
mk('3DS/Mario Kart 7 (Europe).3ds');
mk('3DS/notes.txt');
mk('DS/sub/deep/Pokemon HeartGold (France).nds');
const roms = scan.scanRoms({ switch2:[path.join(tmp,'Switch 2')], switch:[path.join(tmp,'Switch')], '3ds':[path.join(tmp,'3DS')], ds:[path.join(tmp,'DS')] });
const names = roms.map(r=>`${r.platform}:${r.name}`).sort();
assert.deepEqual(names, ['3ds:Mario Kart 7','ds:Pokemon HeartGold','switch2:Pokemon Pokopia','switch:Zelda TOTK']);
console.log('ROM OK', names);

// 5. Installation complète simulée (téléchargement + extraction + mise à jour qui garde « user »)
(async () => {
  const srv = fs.mkdtempSync(path.join(os.tmpdir(),'hmzsrv-'));
  fs.mkdirSync(path.join(srv,'pkg','lichii-build'),{recursive:true});
  fs.writeFileSync(path.join(srv,'pkg','lichii-build','lichii.exe'),'EXE');
  fs.writeFileSync(path.join(srv,'pkg','lichii-build','Qt6Core.dll'),'DLL');
  execFileSync('zip',['-qr', path.join(srv,'lichii-windows-x86_64-pgo.zip'),'lichii-build'],{cwd:path.join(srv,'pkg')});
  const http = require('http');
  const server = http.createServer((q,r)=>{ const f=path.join(srv,path.basename(q.url)); r.writeHead(200,{'content-length':fs.statSync(f).size}); fs.createReadStream(f).pipe(r); }).listen(0);
  const port = server.address().port;
  const realFetch = global.fetch;
  let tag = 'build-83';
  global.fetch = async (url, o) => {
    if (String(url).includes('api.github.com')) return new Response(JSON.stringify([{tag_name:tag, prerelease:true, assets:[{name:'lichii-windows-x86_64-pgo.zip', size:0, browser_download_url:`http://127.0.0.1:${port}/lichii-windows-x86_64-pgo.zip`}]}]),{status:200});
    return realFetch(url,o);
  };
  // Sous Linux, on remplace tar.exe par unzip pour le test.
  util.run = (cmd,args) => new Promise((res,rej)=>{ try{ execFileSync('unzip',['-qo',args[1],'-d',args[3]]); res(''); }catch(e){rej(e);} });
  delete require.cache[require.resolve('../src/emulators')];
  const E = require('../src/emulators');
  const root = path.join(tmp,'root');
  const steps=[];
  const r1 = await E.install('lichii', root, null, p=>steps.push(p.step));
  assert.ok(r1.exe.endsWith(path.join('Emulateurs','Lichii','lichii.exe')), r1.exe);
  assert.ok(fs.existsSync(path.join(root,'Emulateurs','Lichii','user')));
  fs.mkdirSync(path.join(root,'Emulateurs','Lichii','user','keys'),{recursive:true});
  fs.writeFileSync(path.join(root,'Emulateurs','Lichii','user','keys','prod.keys'),'k');
  const same = await E.install('lichii', root, r1, ()=>{});
  assert.equal(same.upToDate, true);
  tag='build-90';
  const r2 = await E.install('lichii', root, r1, ()=>{});
  assert.equal(r2.version,'build-90');
  assert.ok(fs.existsSync(path.join(root,'Emulateurs','Lichii','user','keys','prod.keys')), 'les clés doivent survivre à la mise à jour');
  assert.deepEqual(E.keysStatus('lichii', r2), {keys:true, firmware:false});
  // Firmware depuis un dossier de .nca
  const fw = path.join(tmp,'fw'); fs.mkdirSync(fw); for (const n of ['a.nca','b.nca']) fs.writeFileSync(path.join(fw,n),'x');
  const f = await E.installFirmware('lichii', r2, fw);
  assert.equal(f.count, 2);
  assert.deepEqual(E.keysStatus('lichii', r2), {keys:true, firmware:true});
  // Clés
  const kd = path.join(tmp,'mykeys'); fs.mkdirSync(kd); fs.writeFileSync(path.join(kd,'prod.keys'),'p'); fs.writeFileSync(path.join(kd,'title.keys'),'t');
  const k = E.installKeys('eden', {exe: r2.exe}, path.join(kd,'prod.keys'));
  assert.deepEqual(k.copied, ['prod.keys','title.keys']);
  console.log('installation OK', [...new Set(steps)].join(' → '));
  server.close();
  global.fetch = realFetch;

  // 6. Correspondance des jaquettes libretro (liste simulée)
  const { ArtFinder } = require('../src/art');
  const af = new ArtFinder(tmp, ()=> '');
  af.libretroLists.ds = ['Pokemon - HeartGold Version (USA)','Pokemon - HeartGold Version (France)','New Super Mario Bros. (Europe) (En,Fr,De,Es,It)','New Super Mario Bros. (USA)'];
  const u1 = await af.libretro({ name:'New Super Mario Bros.', platform:'ds' });
  assert.ok(u1.includes(encodeURIComponent('New Super Mario Bros. (Europe) (En,Fr,De,Es,It)')), u1);
  const u2 = await af.libretro({ name:'Pokemon HeartGold', platform:'ds' });
  console.log('libretro OK', decodeURIComponent(u1.split('/').pop()), '|', u2 && decodeURIComponent(u2.split('/').pop()));
})().catch(e=>{ console.error(e); process.exit(1); });
