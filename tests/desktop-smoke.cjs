// Real offline Electron smoke test, including CSP, Worker/WASM and AudioWorklet.
// Run through Electron: electron --no-sandbox --ozone-platform=headless tests/desktop-smoke.cjs
const {app,BrowserWindow,protocol,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
let {assetResponse}=require('../desktop/assets.cjs');
let {installGameSession}=require('../desktop/session.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'drift',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('use-gl','angle');app.commandLine.appendSwitch('use-angle','swiftshader');
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let win;
(async()=>{
  await app.whenReady();
  const {prepareDesktop,makeDesktopHTML}=await import('../scripts/prepare-desktop.mjs');
  let game,html;const errors=[];
  if(process.env.DD_SMOKE_PACKAGED==='1'){
    const release=path.join(root,'release'),files=await fs.readdir(release,{recursive:true});
    const archive=files.find(file=>path.basename(file)==='app.asar');assert.ok(archive,'the packaged app.asar must exist');
    const appRoot=path.join(release,archive);game=path.join(appRoot,'.desktop/game');
    ({assetResponse}=require(path.join(appRoot,'desktop/assets.cjs')));({installGameSession}=require(path.join(appRoot,'desktop/session.cjs')));
    html=(await fs.readFile(path.join(game,'index.html'),'utf8')).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/,'').replace('{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}','{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}');
    console.log('Testing packaged ASAR:',appRoot);
  }else{game=await prepareDesktop();html=await fs.readFile(path.join(root,'Drift Drive/index.html'),'utf8');}

  html=html.replace('\n</script>\n</body>',`\nwindow.__DD_SMOKE={startMode,setSplit,setSoloGraphics,openMainMenu,createAnalyser:(slot=0)=>{const a=AC.createAnalyser();a.fftSize=2048;cars[slot].au.engBus.connect(a);window.__DD_ANALYSER=a;},measure:()=>{const a=window.__DD_ANALYSER;if(!a)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length);},snapshot:()=>({ready:window.gameReady,started,split,live:liveEngine&&{ready:liveEngine.ready,failed:liveEngine.failed,phase:liveEngine.phase,quality:liveEngine.quality,error:liveEngine.error,stats:liveEngine.stats},context:AC?.state,sampleRate:AC?.sampleRate,cars:cars.map(c=>({model:c.root.userData.model,detail:c.root.userData.detail,slot:c.playerSlot,audio:!!c.au,recordedLayers:c.au?.layers??null,wheels:c.wheels.length})),modelTriangles:renderer.info.render.triangles,draws:renderer.info.render.calls})};\n</script>\n</body>`);
  const bytes=Buffer.from(makeDesktopHTML(html));
  protocol.handle('drift',request=>new URL(request.url).pathname==='/index.html'?new Response(bytes,{headers:{'Content-Type':'text/html; charset=utf-8'}}):assetResponse(game,request));
  // CI has a software GPU. Bound its pixel/CPU budget so graphics emulation does
  // not starve the real-time audio worker. Production rendering is unchanged.
  win=new BrowserWindow({width:640,height:400,show:true,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.setFrameRate(15);
  win.webContents.on('console-message',(_event,level,message)=>{if(typeof level==='object'){message=level.message;level=level.level;}if(level===3||level==='error')errors.push(message);console.log('GAME:',message);});
  win.webContents.on('render-process-gone',(_event,details)=>{throw new Error('Renderer stopped: '+details.reason);});
  installGameSession(session.defaultSession);
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await win.loadURL('drift://game/index.html');
  const deadline=Date.now()+240000;
  while(!(await evaluate('window.gameReady===true'))){if(Date.now()>deadline)throw new Error('Game startup timed out');await delay(1000);}
  if(process.env.DD_SMOKE_LOW_POWER==='1')await evaluate(`Object.defineProperty(navigator,'hardwareConcurrency',{value:4,configurable:true});void 0;`);
  if(process.env.DD_SMOKE_RETRY==='1')await evaluate(`window.__DD_FAIL_COUNT=0;const NativeWorker=window.Worker;window.Worker=class{constructor(...args){if(window.__DD_FAIL_COUNT++===0)throw new Error('Simulated worker startup interruption');return new NativeWorker(...args);}};void 0;`);
  await evaluate('window.__DD_SMOKE.startMode(false);window.__DD_SMOKE.createAnalyser();');
  const audioDeadline=Date.now()+25000;while(!(await evaluate('window.__DD_SMOKE.snapshot().live?.ready'))){if(Date.now()>audioDeadline)throw new Error('Live engine did not recover: '+JSON.stringify(await evaluate('window.__DD_SMOKE.snapshot()')));await delay(250);}
  await delay(1500);let solo=await evaluate('window.__DD_SMOKE.snapshot()');console.log('SOLO',JSON.stringify(solo));
  assert.equal(solo.live?.ready,true);assert.equal(solo.live?.failed,false);assert.equal(solo.context,'running');assert.equal(solo.sampleRate,44100);if(process.env.DD_SMOKE_LOW_POWER==='1')assert.ok(solo.live.quality>=1);assert.equal(solo.cars[0].wheels,4);assert.match(solo.cars[0].model,/approved blueprint/);assert.equal(solo.cars[0].recordedLayers,null);
  if(process.env.DD_SMOKE_RETRY==='1')assert.ok((await evaluate('window.__DD_FAIL_COUNT'))>=2,'a new real worker should start after the injected failure');
  const audible=async(slot)=>{
    await evaluate(`window.__DD_SMOKE.createAnalyser(${slot})`);
    let sounding=0;for(let i=0;i<12;i++){await delay(150);if((await evaluate('window.__DD_SMOKE.measure()'))>.0001)sounding++;}
    assert.ok(sounding>=8,`player ${slot+1} needs sustained audible live output (${sounding}/12 samples)`);
  };
  await audible(0);
  await evaluate('window.__DD_SMOKE.startMode(true)');await delay(5000);
  const split=await evaluate('window.__DD_SMOKE.snapshot()');console.log('SPLIT',JSON.stringify(split));assert.equal(split.split,true);assert.equal(split.live?.ready,true);assert.equal(split.live?.failed,false);assert.equal(split.cars.length,2);assert.ok(split.cars.every(c=>c.audio));assert.equal(split.cars[0].detail,false);assert.ok(split.cars.every(c=>c.recordedLayers===null));
  await audible(1);
  await evaluate('window.__DD_SMOKE.openMainMenu()');await delay(300);assert.equal((await evaluate('window.__DD_SMOKE.snapshot()')).context,'suspended');
  await evaluate('window.__DD_SMOKE.startMode(false)');await delay(1500);const resumed=await evaluate('window.__DD_SMOKE.snapshot()');assert.equal(resumed.live.ready,true);assert.equal(resumed.live.failed,false);assert.equal(resumed.cars.length,1);
  assert.deepEqual(errors,[]);console.log('PASS: offline Electron model, live WASM, AudioWorklet, audible output and split-screen smoke test.');app.exit(0);
})().catch(error=>{console.error(error);app.exit(1);});
