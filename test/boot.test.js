const Module=require('module'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
function run(home, setup){
  process.env.HOME=home; for(const k of Object.keys(process.env)) if(k.startsWith('HMZ_')) delete process.env[k];
  const ev={relaunch:0,exit:0,loaded:null};
  const orig=Module._load;
  Module._load=function(r,parent,...a){
    if(r==='electron') return {app:{relaunch:()=>ev.relaunch++,exit:()=>ev.exit++}};
    const full = r.startsWith('.')||path.isAbsolute(r) ? path.resolve(parent?path.dirname(parent.filename):'',r) : r;
    if(/main\.js$/.test(full)){ ev.loaded=full; if(fs.existsSync(full+'.boom')) throw new Error('boom'); return {}; }
    return orig.call(this,r,parent,...a);
  };
  delete require.cache[require.resolve('../boot.js')];
  require('../boot.js'); Module._load=orig;
  return {...ev, env:{v:process.env.HMZ_VERSION,src:process.env.HMZ_CODE_SOURCE}};
}
const home=fs.mkdtempSync(path.join(os.tmpdir(),'boot-')); const ov=path.join(home,'HMZ','app');
let r=run(home); assert.equal(r.env.src,'installée'); assert.ok(r.loaded.endsWith('/hmz/main.js')); console.log('1 sans mise à jour →', r.env);
fs.mkdirSync(ov,{recursive:true}); fs.writeFileSync(path.join(ov,'package.json'),'{"version":"2.1.1"}'); fs.writeFileSync(path.join(ov,'main.js'),'');
r=run(home); assert.equal(r.env.src,'mise à jour'); assert.equal(r.loaded,path.join(ov,'main.js')); assert.ok(fs.existsSync(path.join(ov,'.demarrage'))); console.log('2 mise à jour →', r.env);
r=run(home); assert.equal(r.env.src,'installée'); assert.ok(!fs.existsSync(ov)); console.log('3 démarrage précédent raté → écartée', fs.readdirSync(path.join(home,'HMZ')));
fs.mkdirSync(ov,{recursive:true}); fs.writeFileSync(path.join(ov,'package.json'),'{"version":"2.1.2"}'); fs.writeFileSync(path.join(ov,'main.js'),''); fs.writeFileSync(path.join(ov,'main.js.boom'),'');
r=run(home); assert.equal(r.relaunch,1); assert.ok(!fs.existsSync(ov)); console.log('4 plantage au chargement → relance', r.relaunch, r.exit);
fs.mkdirSync(ov,{recursive:true}); fs.writeFileSync(path.join(ov,'package.json'),'{"version":"2.0.9"}'); fs.writeFileSync(path.join(ov,'main.js'),'');
r=run(home); assert.equal(r.env.src,'installée'); console.log('5 version plus ancienne ignorée →', r.env);
