import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {installSilviaTemplates,createSilviaModel} from '../Drift Drive/silvia-model.js';
const loader=new GLTFLoader(),models=[];
for(const level of ['detail','laptop']){const bytes=await fs.readFile(new URL('../Drift Drive/models/silvia-'+level+'.glb',import.meta.url));models.push((await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene);}
installSilviaTemplates(...models);
test('approved Silvia keeps aligned arches, rotating wheels, stationary calipers and independent per-player paint',()=>{
  const a=createSilviaModel('#112233'),b=createSilviaModel('#994455');
  const bounds=new THREE.Box3().setFromObject(a.body),size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.x>4.6&&size.x<4.9);assert.ok(size.y>1.2&&size.y<1.4);assert.ok(size.z>1.9&&size.z<2.2);
  assert.ok(a.factorySpoiler.children.length>0);assert.equal(a.frontPlate.children.length,2);
  for(const [i,w]of a.wheels.entries()){
    assert.equal(w.pivot.position.x,i<2?1.18:-1.345);assert.equal(w.front,i<2);
    const caliper=w.pivot.children.find(m=>m.isMesh);assert.ok(caliper);assert.notEqual(caliper.parent,w.spin);assert.ok(w.factorySpokes.length>0);
    a.root.updateMatrixWorld(true);const before=caliper.getWorldPosition(new THREE.Vector3());w.spin.rotation.z=1.2;a.root.updateMatrixWorld(true);
    assert.ok(caliper.getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-12);
  }
  const original=b.paint.color.getHex();a.paint.color.set('#77aa55');assert.equal(b.paint.color.getHex(),original);
  let high=0,low=0;a.root.traverse(m=>{if(m.isMesh)high+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});
  a.root.userData.setDetail(false);a.root.traverse(m=>{if(m.isMesh)low+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});
  assert.ok(high<125000);assert.ok(low<56000);assert.ok(low<high*.5);
  const newBounds=new THREE.Box3().setFromObject(a.body);assert.ok(newBounds.min.distanceTo(bounds.min)<.025);assert.ok(newBounds.max.distanceTo(bounds.max)<.025);
  assert.equal(a.root.userData.approvedSilvia,true);
});

test('Silvia model instances reuse immutable geometry without sharing tunable materials',()=>{
  const a=createSilviaModel('#123456'),b=createSilviaModel('#654321');
  const meshes=[];for(const m of [a,b]){const parts=[];m.root.traverse(x=>{if(x.isMesh&&x.geometry.userData.sharedVehicleGeometry)parts.push(x);});meshes.push(parts);}
  assert.ok(meshes[0].length>40);assert.equal(meshes[0].length,meshes[1].length);
  for(let i=0;i<meshes[0].length;i++){assert.equal(meshes[0][i].geometry,meshes[1][i].geometry);assert.notEqual(meshes[0][i].material,meshes[1][i].material);}
});


test('direct-file companion contains the exact laptop mesh instead of a different fallback car',async()=>{
  const script=await fs.readFile(new URL('../Drift Drive/models/silvia-file.js',import.meta.url),'utf8');
  const encoded=JSON.parse(script.split('window.DD_SILVIA_FILE=')[1].trim().slice(0,-1));
  assert.deepEqual(Buffer.from(encoded,'base64'),await fs.readFile(new URL('../Drift Drive/models/silvia-laptop.glb',import.meta.url)));
});
