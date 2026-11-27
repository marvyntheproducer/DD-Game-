import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const templates=new Map(),derived=new Map();
export function installSilviaTemplates(detail,laptop){
  derived.clear();
  for(const [level,scene] of [['detail',detail],['laptop',laptop]]){
    scene.updateMatrixWorld(true);const meshes=new Map();
    scene.traverse(o=>{if(o.isMesh)meshes.set(o.name,{geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material});});
    templates.set(level,meshes);
  }
}
export async function preloadSilvia(){
  if(templates.size)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const loader=new GLTFLoader();
    // Directly opened source-game folders cannot fetch local GLBs through CORS.
    // A classic-script companion keeps that existing launch path usable.
    if(globalThis.location?.protocol==='file:'){
      if(!globalThis.DD_SILVIA_FILE)await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=new URL('./models/silvia-file.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(new Error('The Silvia companion file is missing. Extract the complete game folder.'));document.head.appendChild(script);
        controller.signal.addEventListener('abort',()=>reject(new Error('Silvia model loading timed out.')),{once:true});
      });
      const raw=atob(globalThis.DD_SILVIA_FILE),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      const model=(await loader.parseAsync(bytes.buffer,'')).scene;installSilviaTemplates(model,model);return;
    }
    const scenes=await Promise.all(['detail','laptop'].map(async level=>{
      const response=await fetch(new URL('./models/silvia-'+level+'.glb',import.meta.url),{signal:controller.signal});
      if(!response.ok)throw new Error('Silvia model could not load ('+response.status+').');
      return (await loader.parseAsync(await response.arrayBuffer(),'')).scene;
    }));installSilviaTemplates(...scenes);
  }finally{clearTimeout(timer);}
}

export function createSilviaModel(color,{A=1.18,B=1.345,R=.32,detail=true}={}){
  if(templates.size!==2)throw new Error('Approved Silvia has not finished loading.');
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  root.userData.model='Silvia approved blueprint coupe (S14 game slot)';
  root.userData.approvedSilvia=true;
  root.userData.dimensions={length:4.66,width:1.79,height:1.26,wheelbase:A+B};
  const materials=new Map(),pieces=[],wheels=[],factorySpoiler=new THREE.Group(),interior=new THREE.Group();body.add(factorySpoiler,interior);
  const source=templates.get('detail'),scaleX=(A+B)/2.52,offsetX=A-1.30*scaleX;
  const transform=new THREE.Matrix4().makeTranslation(offsetX,0,0).multiply(new THREE.Matrix4().makeScale(-scaleX,1,-1));
  const wheelNames=['Front left','Front right','Rear left','Rear right'];
  for(let i=0;i<4;i++){
    const pivot=new THREE.Group(),spin=new THREE.Group(),spokeMesh=new THREE.Group(),front=i<2;
    // The visual track follows the approved arches. Physics track is unchanged.
    pivot.position.set(front?A:-B,R,i%2===0?-.79:.79);pivot.add(spin);spin.add(spokeMesh);root.add(pivot);
    wheels.push({pivot,spin,front,rimMaterial:null,spokeMesh,approved:true});
  }
  const plateAnchor=new THREE.Group();plateAnchor.position.set(2.291,.29,0);body.add(plateAnchor);
  const glassShell=new THREE.Group();body.add(glassShell);
  let paint,tailMat,headMat;
  const materialFor=original=>{
    const name=original.name;
    if(!materials.has(name)){
      const m=/Smoked automotive|Optical clear/.test(name)?new THREE.MeshStandardMaterial({color:original.color.clone(),metalness:.18,roughness:.14}):name.includes('Pearl silver')?new THREE.MeshPhysicalMaterial({color,metalness:.65,roughness:.25,clearcoat:.85}):original.clone();
      if(name.includes('Smoked automotive')){m.transparent=true;m.opacity=.72;m.depthWrite=false;m.side=THREE.DoubleSide;}
      if(name.includes('Red tail')){m.emissive.setHex(0xff1810);m.emissiveIntensity=.3;tailMat=m;}
      if(name.includes('Optical clear')){m.emissive.setHex(0xc5c6b6);m.emissiveIntensity=.32;headMat=m;}
      if(name.includes('Pearl silver'))paint=m;
      materials.set(name,m);
    }return materials.get(name);
  };
  for(const [name,entry] of source){
    const [rawGroup,kind]=name.split('_|_');
    const group=rawGroup.replaceAll('_',' ');
    const wi=wheelNames.indexOf(group),wheel=wi>=0?wheels[wi]:null;
    const geometries={};
    for(const level of ['detail','laptop']){
      const item=templates.get(level).get(name);if(!item)throw new Error('Silvia LOD part missing: '+name);
      let matrix=transform;
      if(wheel)matrix=new THREE.Matrix4().makeTranslation(-wheel.pivot.position.x,-R,-wheel.pivot.position.z).multiply(transform);
      const key=[name,level,A,B,R].join(':');
      if(!derived.has(key)){
        const geometry=item.geometry.clone().applyMatrix4(matrix);
        if(kind==='frontplate')geometry.translate(-2.291,-.29,0);
        geometry.userData.sharedVehicleGeometry=true;derived.set(key,geometry);
      }geometries[level]=derived.get(key);
    }
    const mesh=new THREE.Mesh(geometries[detail?'detail':'laptop'],materialFor(entry.material));mesh.name=name;mesh.castShadow=detail;mesh.receiveShadow=true;pieces.push({mesh,geometries});
    if(wheel){
      if(kind==='caliper')wheel.pivot.add(mesh);
      else if(kind==='spokes'){wheel.spokeMesh.add(mesh);wheel.rimMaterial=mesh.material;}
      else wheel.spin.add(mesh);
    }else if(kind==='spoiler')factorySpoiler.add(mesh);
    else if(kind==='interior')interior.add(mesh);
    else if(kind==='frontplate')plateAnchor.add(mesh);
    else if(entry.material.name.includes('Smoked automotive')){glassShell.add(mesh);glassShell.material=mesh.material;}
    else body.add(mesh);

  }
  for(const w of wheels){w.rimMaterial=w.rimMaterial||materials.get('Machined silver spokes');w.factorySpokes=w.spokeMesh.children.slice();}
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.9,1.9).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x080b10,transparent:true,opacity:.13,depthWrite:false}));shadow.position.y=.015;root.add(shadow);
  root.userData.approvedInterior=interior;root.userData.seatMaterial=materials.get('Cloth interior');
  root.userData.setDetail=on=>{for(const p of pieces){p.mesh.geometry=p.geometries[on?'detail':'laptop'];p.mesh.castShadow=on;}root.userData.detail=on;};
  return {root,body,wheels,paint,tailMat,headMat,windowShell:glassShell,factorySpoiler,frontPlate:plateAnchor,approvedInterior:interior};
}
