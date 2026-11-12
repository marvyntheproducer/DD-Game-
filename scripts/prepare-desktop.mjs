import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const root=path.resolve(import.meta.dirname,'..');
export async function prepareDesktop(){
 const out=path.join(root,'.desktop/game');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
 await fs.cp(path.join(root,'Drift Drive'),out,{recursive:true});
 const vendor=path.join(out,'vendor');await fs.mkdir(path.join(vendor,'addons/objects'),{recursive:true});
 await fs.copyFile(path.join(root,'node_modules/three/build/three.module.js'),path.join(vendor,'three.module.js'));
 await fs.copyFile(path.join(root,'node_modules/three/examples/jsm/objects/Sky.js'),path.join(vendor,'addons/objects/Sky.js'));
 await fs.copyFile(path.join(root,'node_modules/three/LICENSE'),path.join(vendor,'THREE-LICENSE.txt'));
 let html=await fs.readFile(path.join(out,'index.html'),'utf8');
 const old='{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}';
 if(!html.includes(old))throw new Error('The game import map changed; update desktop vendor mapping.');
 html=html.replace(old,'{"imports":{"three":"./vendor/three.module.js","three/addons/":"./vendor/addons/"}}');
 const hashes=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')).map(m=>"'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'");
 const policy="default-src 'none'; script-src 'self' "+hashes.join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' blob: data:; font-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'";
 html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="'+policy+'">');
 await fs.writeFile(path.join(out,'index.html'),html);
 for(const name of ['THIRD_PARTY_LICENSES.txt','ENGINE_REFERENCES.md'])await fs.copyFile(path.join(root,name),path.join(out,name));
 const manifest={};
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else manifest[path.relative(out,file).split(path.sep).join('/')]=createHash('sha256').update(await fs.readFile(file)).digest('hex');}}
 await walk(out);await fs.writeFile(path.join(root,'.desktop/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared '+Object.keys(manifest).length+' offline game files.');return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)await prepareDesktop();
