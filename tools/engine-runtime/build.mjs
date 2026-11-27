import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const here=import.meta.dirname,root=path.resolve(here,'../..');
const names=JSON.parse(await fs.readFile(path.join(here,'sources.json'),'utf8'));
const out=path.join(root,'Drift Drive/engine-sim');await fs.mkdir(out,{recursive:true});
const args=['-std=c++17','-O3','-DNDEBUG','-include',path.join(here,'compat.h'),'-I'+path.join(here,'vendor/include'),'-I'+path.join(here,'vendor/solver/include'),path.join(here,'runtime.cpp'),...names.map(n=>path.join(here,'vendor/src/'+n+'.cpp')),...['rigid_body','force_generator'].map(n=>path.join(here,'vendor/solver/src/'+n+'.cpp')),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker,node','-sFILESYSTEM=0','-sALLOW_MEMORY_GROWTH=0','-sINITIAL_MEMORY=33554432','-sEXPORTED_FUNCTIONS=["_dd_init","_dd_destroy","_dd_state","_dd_render","_dd_metric"]','-sEXPORTED_RUNTIME_METHODS=["HEAPF32"]','-o',path.join(out,'core.js')];
const result=spawnSync(process.env.EMXX||'em++',args,{stdio:'inherit'});
if(result.error)throw result.error;if(result.status)process.exit(result.status);
const files={};
async function hash(file){const relative=path.relative(root,file).split(path.sep).join('/');const bytes=await fs.readFile(file);files[relative]=createHash('sha256').update(file.endsWith('.wasm')?bytes:Buffer.from(bytes.toString('utf8').replace(/\r\n?/g,'\n'))).digest('hex');}
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(cpp|h)$/.test(entry.name))await hash(file);}}
await walk(path.join(here,'vendor'));for(const file of ['runtime.cpp','compat.h','sources.json','build.mjs'])await hash(path.join(here,file));for(const file of ['core.js','core.wasm'])await hash(path.join(out,file));
await fs.writeFile(path.join(here,'build-manifest.json'),JSON.stringify({compiler:'Emscripten 4.0.20',upstream:'a548360a33c6ddcc28265ac08b71b8a5f514ed3c',files},null,2)+'\n');
console.log('Built stripped Engine Simulator WebAssembly core.');
