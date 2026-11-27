// Keep the source game's direct-file launch path free of local ES module imports.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),game=path.join(root,'Drift Drive');
const begin='// BEGIN BUNDLED VEHICLE AUDIO MODULES',end='// END BUNDLED VEHICLE AUDIO MODULES';
export async function moduleBundle(){
  const sources=await Promise.all(['silvia-model.js','live-engine-audio.js'].map(name=>fs.readFile(path.join(game,name),'utf8')));
  return begin+'\n'+sources.map(s=>s.replace(/\r\n?/g,'\n').replace(/^import .*;\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url','document.baseURI')).join('\n')+'\n'+end;
}
const file=path.join(game,'index.html'),html=(await fs.readFile(file,'utf8')).replace(/\r\n?/g,'\n'),bundle=await moduleBundle();
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
if(process.argv.includes('--check')){
  if(!html.includes(bundle))throw new Error('Game module bundle is stale; run npm run game:bundle.');
}else{
  const a=html.indexOf(begin),b=html.indexOf(end,a);
  if(a<0||b<0)throw new Error('Game module bundle markers are missing.');
  await fs.writeFile(file,html.slice(0,a)+bundle+html.slice(b+end.length));
}

}
