const {app,BrowserWindow,Menu,protocol,session,dialog,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {assetResponse,safeBounds}=require('./assets.cjs');
const GAME='drift://game/index.html';
protocol.registerSchemesAsPrivileged([{scheme:'drift',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setName('Drift Drive');
const profile=path.join(app.getPath('appData'),'Drift Drive');
fs.mkdirSync(profile,{recursive:true});
app.setPath('userData',profile);
let win;
const stateFile=path.join(app.getPath('userData'),'window.json');
function readState(){try{return safeBounds(JSON.parse(fs.readFileSync(stateFile,'utf8')));}catch{return safeBounds();}}
function saveState(){if(!win||win.isDestroyed())return;const size=win.getNormalBounds();try{fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify({...size,maximized:win.isMaximized()}));}catch(error){console.warn('Window size could not be saved:',error.message);}}
function showControls(){dialog.showMessageBox(win,{type:'info',title:'Drift Drive · Controls',message:'Your engine. Your roads.',detail:'WASD: drive · Space: handbrake · Shift: clutch\nQ / E: gears · M: auto/manual · C: camera · R: reset\nStart menu: 1 Solo · 2 Split · 3 Quick Race · Enter to launch\nJ: Cruise Life / custom build · P: tuning\nO: photo mode · Tab: map · B: race builder · G: race\nEsc: menu / leave race · 2: local split-screen\n\nPhoto mode: drag to orbit, WASD to pan, Q/E to lift, Space to save PNG.\n\nAll game files are bundled. Builds, tuning and postcards save automatically in this app.'});}
function installMenu(){
 const view=[{role:'togglefullscreen',accelerator:process.platform==='darwin'?'Ctrl+Command+F':'F11'}];
 if(!app.isPackaged)view.push({role:'toggleDevTools'});
 const template=[
  ...(process.platform==='darwin'?[{role:'appMenu'}]:[]),
  {label:'Game',submenu:[{label:'Controls & shortcuts',click:showControls},{type:'separator'},...(process.platform==='darwin'?[]:[{role:'quit'}])]},
  {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
  {label:'View',submenu:view},{role:'windowMenu'},
  {label:'Help',submenu:[{label:'Controls & shortcuts',click:showControls},{label:'Open saved-data folder',click:()=>shell.openPath(app.getPath('userData'))},{label:'About Drift Drive',click:()=>dialog.showMessageBox(win,{type:'info',title:'About Drift Drive',message:'Drift Drive',detail:'Desktop '+app.getVersion()+' · JDM Nights V5.5\nCreated by Marvyn De Sousa\nFictional Japanese roads. Original procedural vehicle art.\nAudio and open-source credits are included with the game.'})}]}
 ];
 Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
function createWindow(){
 const bounds=readState();
 win=new BrowserWindow({width:bounds.width,height:bounds.height,minWidth:960,minHeight:600,show:false,backgroundColor:'#101b29',title:'Drift Drive',icon:path.join(__dirname,'assets/icon.png'),autoHideMenuBar:process.platform!=='darwin',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(url!==GAME)event.preventDefault();});
 win.on('close',saveState);win.on('closed',()=>{win=null;});
 win.once('ready-to-show',()=>{if(bounds.maximized)win.maximize();win.show();});
 win.webContents.on('render-process-gone',(_event,details)=>{dialog.showErrorBox('Drift Drive stopped','The game renderer stopped ('+details.reason+'). Your saved builds remain on this device. Close and reopen the app.');});
 win.loadURL(GAME).catch(error=>dialog.showErrorBox('Could not load Drift Drive',error.message));
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(()=>{
  protocol.handle('drift',request=>assetResponse(path.join(app.getAppPath(),'.desktop/game'),request));
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
   const url=new URL(details.url);callback({cancel:!(url.protocol==='drift:'&&url.host==='game'||url.protocol==='data:'||url.protocol==='blob:')});
  });
  session.defaultSession.on('will-download',(_event,item)=>{
   if(!item.getFilename().toLowerCase().endsWith('.png')){item.cancel();return;}
   item.setSaveDialogOptions({title:'Save your cruise photo',defaultPath:path.join(app.getPath('pictures'),path.basename(item.getFilename())),filters:[{name:'PNG photo',extensions:['png']}]});
  });
  installMenu();createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
 });
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
 app.on('before-quit',saveState);
}
