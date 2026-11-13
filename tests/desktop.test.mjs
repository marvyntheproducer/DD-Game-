import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import fsSync from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepareDesktop,makeDesktopHTML,root} from '../scripts/prepare-desktop.mjs';
const require=createRequire(import.meta.url);
const {resolveAsset,assetResponse,safeBounds}=require('../desktop/assets.cjs');
const game=await prepareDesktop();

test('desktop bundle resolves Three.js and all runtime assets locally with exact hashes',async()=>{
 const html=await fs.readFile(path.join(game,'index.html'),'utf8');
 const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 assert.equal(imports.three,'./vendor/three.module.js');assert.equal(imports['three/addons/'],'./vendor/addons/');
 assert.ok((await fs.stat(path.join(game,imports.three))).size>1000000);
 const sky=await fs.readFile(path.join(game,'vendor/addons/objects/Sky.js'),'utf8');assert.match(sky,/from 'three'/);
 for(const script of html.matchAll(/<script src="([^"]+)"/g))assert.ok((await fs.stat(path.join(game,script[1]))).isFile());
 const manifest=JSON.parse(await fs.readFile(path.join(root,'.desktop/manifest.json'),'utf8'));
 assert.ok(Object.keys(manifest).length>=23);
 for(const [file,hash] of Object.entries(manifest))assert.equal(createHash('sha256').update(await fs.readFile(path.join(game,file))).digest('hex'),hash);
 assert.ok(!/https?:/.test(JSON.stringify(imports)));
});

test('desktop CSP permits the exact inline game scripts without eval or external scripts',async()=>{
 const html=await fs.readFile(path.join(game,'index.html'),'utf8');
 const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(policy,/default-src 'none'/);assert.ok(!policy.includes("'unsafe-eval'"));
 const scriptPolicy=policy.split(';').find(s=>s.trim().startsWith('script-src'));
 assert.ok(!scriptPolicy.includes("'unsafe-inline'"));assert.ok(!scriptPolicy.includes('https:'));
 for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))assert.ok(scriptPolicy.includes("'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'"));
});

test('asset handler serves offline modules and recorded audio but cannot leave the game root',async()=>{
 for(const [url,type] of [['drift://game/','text/html'],['drift://game/vendor/three.module.js','text/javascript'],['drift://game/audio/jdm/jz2tour-r3300_on.ogg','audio/ogg'],['drift://game/audio/jdm/previews/2jz-3000rpm.mp3','audio/mpeg']]){
  const response=await assetResponse(game,{url,method:'GET'});assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));assert.ok((await response.arrayBuffer()).byteLength>100);
 }
 const head=await assetResponse(game,{url:'drift://game/index.html',method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 for(const url of ['https://example.com/index.html','drift://other/index.html','drift://game/%2f..%2f..%2fpackage.json','drift://game/..%5c..%5cpackage.json','drift://game/%00.html','drift://user:pass@game/index.html']){
  assert.throws(()=>resolveAsset(game,url));assert.equal((await assetResponse(game,{url,method:'GET'})).status,404);
 }
 assert.equal((await assetResponse(game,{url:'drift://game/index.html',method:'POST'})).status,405);
 assert.equal((await assetResponse(game,{url:'drift://game/missing.js',method:'GET'})).status,404);
});

test('desktop window and network settings preserve sandboxing and stable storage',async()=>{
 const main=await fs.readFile(path.join(root,'desktop/main.cjs'),'utf8');
 assert.match(main,/nodeIntegration:false/);assert.match(main,/contextIsolation:true/);assert.match(main,/sandbox:true/);assert.match(main,/webSecurity:true/);
 assert.match(main,/setWindowOpenHandler/);assert.match(main,/onBeforeRequest/);assert.match(main,/Drift Drive/);
 assert.deepEqual(safeBounds({width:10,height:99999,maximized:'true'}),{width:960,height:2160,maximized:false});
 assert.deepEqual(safeBounds({width:Infinity,height:NaN,maximized:true}),{width:1280,height:800,maximized:true});
});

test('native icon containers include small and retina sizes and have intact offsets',async()=>{
 const ico=await fs.readFile(path.join(root,'desktop/assets/icon.ico'));assert.equal(ico.readUInt16LE(2),1);const count=ico.readUInt16LE(4);assert.equal(count,7);
 for(let i=0;i<count;i++){const p=6+16*i,length=ico.readUInt32LE(p+8),offset=ico.readUInt32LE(p+12);assert.ok(offset+length<=ico.length);assert.equal(ico.toString('ascii',offset+1,offset+4),'PNG');}
 const icns=await fs.readFile(path.join(root,'desktop/assets/icon.icns'));assert.equal(icns.toString('ascii',0,4),'icns');assert.equal(icns.readUInt32BE(4),icns.length);
 const kinds=[];for(let p=8;p<icns.length;){kinds.push(icns.toString('ascii',p,p+4));const n=icns.readUInt32BE(p+4);assert.ok(n>8&&p+n<=icns.length);p+=n;}
 assert.ok(kinds.includes('ic10')&&kinds.includes('icp4'));
});

test('Windows CRLF checkouts produce the same runnable hashed HTML as Mac/Linux',async()=>{
 const source=await fs.readFile(path.join(root,'Drift Drive/index.html'),'utf8');
 const lf=source.replace(/\r\n?/g,'\n'),crlf=lf.replace(/\n/g,'\r\n');
 assert.equal(makeDesktopHTML(crlf),makeDesktopHTML(lf));assert.ok(!makeDesktopHTML(crlf).includes('\r'));
});

test('first desktop launch creates its save profile before asking Electron to use it',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'drift-first-launch-'));let selected;
 const electron={protocol:{registerSchemesAsPrivileged(){}},app:{
  setName(){},getPath(name){return name==='appData'?temporary:selected;},
  setPath(name,value){assert.equal(name,'userData');assert.ok(fsSync.statSync(value).isDirectory());selected=value;},
  requestSingleInstanceLock(){return true;},on(){},whenReady(){return new Promise(()=>{});}
 }};
 try{
  const source=await fs.readFile(path.join(root,'desktop/main.cjs'),'utf8');
  vm.runInNewContext(source,{require:name=>name==='electron'?electron:name==='./assets.cjs'?require('../desktop/assets.cjs'):require(name),__dirname:path.join(root,'desktop'),console,process});
  assert.equal(selected,path.join(temporary,'Drift Drive'));assert.ok((await fs.stat(selected)).isDirectory());
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
});
