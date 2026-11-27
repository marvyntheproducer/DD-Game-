// Real offline Electron smoke test, including CSP, Worker/WASM and AudioWorklet.
// Run through Electron: electron --no-sandbox --ozone-platform=headless tests/desktop-smoke.cjs
const {app,BrowserWindow,protocol}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {assetResponse}=require('../desktop/assets.cjs');
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
  const game=await prepareDesktop(),errors=[];
  let html=await fs.readFile(path.join(root,'Drift Drive/index.html'),'utf8');
  html=html.replace('\n</script>\n</body>',`\nwindow.__DD_SMOKE={startMode,setSplit,setSoloGraphics,createAnalyser:()=>{const a=AC.createAnalyser();a.fftSize=2048;AU.master.connect(a);window.__DD_ANALYSER=a;},measure:()=>{const a=window.__DD_ANALYSER;if(!a)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length);},snapshot:()=>({ready:window.gameReady,started,split,live:liveEngine&&{ready:liveEngine.ready,failed:liveEngine.failed,stats:liveEngine.stats},context:AC?.state,cars:cars.map(c=>({model:c.root.userData.model,detail:c.root.userData.detail,slot:c.playerSlot,audio:!!c.au,wheels:c.wheels.length})),modelTriangles:renderer.info.render.triangles,draws:renderer.info.render.calls})};\n</script>\n</body>`);
  const bytes=Buffer.from(makeDesktopHTML(html));
  protocol.handle('drift',request=>new URL(request.url).pathname==='/index.html'?new Response(bytes,{headers:{'Content-Type':'text/html; charset=utf-8'}}):assetResponse(game,request));
  win=new BrowserWindow({width:1280,height:800,show:true,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  win.webContents.on('console-message',(_event,level,message)=>{if(typeof level==='object'){message=level.message;level=level.level;}if(level===3||level==='error')errors.push(message);console.log('GAME:',message);});
  win.webContents.on('render-process-gone',(_event,details)=>{throw new Error('Renderer stopped: '+details.reason);});
  const evaluate=code=>win.webContents.executeJavaScript(code,true);
  await win.loadURL('drift://game/index.html');
  const deadline=Date.now()+240000;
  while(!(await evaluate('window.gameReady===true'))){if(Date.now()>deadline)throw new Error('Game startup timed out');await delay(1000);}
  await evaluate('window.__DD_SMOKE.startMode(false);window.__DD_SMOKE.createAnalyser();');
  await delay(6000);let solo=await evaluate('window.__DD_SMOKE.snapshot()');console.log('SOLO',JSON.stringify(solo));
  assert.equal(solo.live?.ready,true);assert.equal(solo.live?.failed,false);assert.equal(solo.context,'running');assert.equal(solo.cars[0].wheels,4);assert.match(solo.cars[0].model,/approved blueprint/);
  const rms=await evaluate('window.__DD_SMOKE.measure()');assert.ok(rms>.0001,'engine output should be audible');
  await evaluate('window.__DD_SMOKE.startMode(true)');await delay(5000);
  const split=await evaluate('window.__DD_SMOKE.snapshot()');console.log('SPLIT',JSON.stringify(split));assert.equal(split.split,true);assert.equal(split.live?.ready,true);assert.equal(split.live?.failed,false);assert.equal(split.cars.length,2);assert.ok(split.cars.every(c=>c.audio));assert.equal(split.cars[0].detail,false);
  assert.deepEqual(errors,[]);console.log('PASS: offline Electron model, live WASM, AudioWorklet, audible output and split-screen smoke test.');app.exit(0);
})().catch(error=>{console.error(error);app.exit(1);});
