import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadGame} from './game-harness.mjs';
const {game:g,context,Three}=loadGame();g.boot();
test('actual startup callback reaches ready with finite terrain, a car, and bounded tree batches',()=>{
  assert.equal(context.window.gameReady,true);
  assert.ok(g.arrays.N>1000);assert.equal(g.cars.length,1);
  for(const h of g.arrays.H)assert.ok(Number.isFinite(h));
  let tiles=0,batches=0,maxTrees=0;
  g.scene.traverse(o=>{if(o.userData.worldBatch==='trees'){batches++;maxTrees=Math.max(maxTrees,o.count);assert.ok(o.boundingSphere);}
    else if(o.userData.worldBatch==='terrain')tiles++;});
  assert.equal(tiles,196);assert.ok(batches>3);assert.ok(maxTrees<1000);
});
test('terrain query matches the rendered triangle at arbitrary interior points',()=>{
  const {H}=g.arrays;const {SEG,STEP,HALF}=g.world;
  for(const [tx,tz] of [[0.1,0.2],[0.7,0.8],[0.2,0.9]]){
    const ix=20,iz=30,k=iz*(SEG+1)+ix,[a,b,c,d]=[H[k],H[k+1],H[k+SEG+1],H[k+SEG+2]];
    const expected=tx+tz<=1?a+(b-a)*tx+(c-a)*tz:d+(c-d)*(1-tx)+(b-d)*(1-tz);
    assert.ok(Math.abs(g.terrainH(-HALF+(ix+tx)*STEP,-HALF+(iz+tz)*STEP)-expected)<1e-7);
  }
});
test('driving every road centre at 108 km/h does not launch at junctions',()=>{
  const c=g.cars[0],{RX,RZ,TXa,TZa}=g.arrays;let maxRise=0,maxAir=0,maxAt=null;
  for(const e of g.EDGES){g.placeCar(c,RX[e.s],RZ[e.s],0);
    for(let i=e.s;i<e.s+e.n-1;i++){
      const length=Math.hypot(RX[i+1]-RX[i],RZ[i+1]-RZ[i]),steps=Math.ceil(length/(30/240));
      for(let j=0;j<steps;j++){
        const t=j/steps;c.x=RX[i]+(RX[i+1]-RX[i])*t;c.z=RZ[i]+(RZ[i+1]-RZ[i])*t;
        c.yaw=Math.atan2(-TZa[i],TXa[i]);c.r=0;c.vwx=TXa[i]*30;c.vwz=TZa[i]*30;
        g.prePhys(c);g.step(c,1/240);maxRise=Math.max(maxRise,c.vyv);if(c.y-g.ground(c.x,c.z)>maxAir){maxAir=c.y-g.ground(c.x,c.z);maxAt={i,j,x:c.x,z:c.z,y:c.y,ground:g.ground(c.x,c.z),paved:g.pavedSurface(c.x,c.z),roadX:RX[i]+(RX[i+1]-RX[i])*t,roadZ:RZ[i]+(RZ[i+1]-RZ[i])*t};}
        assert.ok([c.x,c.z,c.y,c.vwx,c.vwz,c.r,c.rpm].every(Number.isFinite));
      }
    }}
  assert.equal(maxRise,0);assert.ok(maxAir<0.35,`max clearance ${maxAir}: ${JSON.stringify(maxAt)}`);
});
test('split-screen caps pixels and shadows, and restores solo settings',()=>{
  for(let i=0;i<3;i++){
    g.setSplit(true);assert.equal(g.cars.length,2);assert.equal(g.renderer.ratio,1);assert.equal(g.renderer.shadowMap.enabled,false);
    g.setSplit(false);assert.equal(g.cars.length,1);assert.equal(g.renderer.ratio,1.5);assert.equal(g.renderer.shadowMap.enabled,true);
  }
});
test('camera frusta skip most terrain and tree geometry',()=>{
  const c=g.cars[0];g.updVisual(c,1/60);g.updCam(c,1/60,16/9);c.cam.updateMatrixWorld();
  const f=new Three.Frustum().setFromProjectionMatrix(new Three.Matrix4().multiplyMatrices(c.cam.projectionMatrix,c.cam.matrixWorldInverse));
  let all=0,visible=0;
  g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(!o.isMesh)return;
    if(o.userData.worldBatch){const tris=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;
      const count=tris*(o.isInstancedMesh?o.count:1);all+=count;if(f.intersectsObject(o))visible+=count;}});
  assert.ok(visible<all*0.65,`${visible}/${all}`);console.log(`Cullable world triangles: ${visible} visible of ${all}`);
});
test('all bundled engine audio references exist and WAV is genuine PCM',()=>{
  vm.runInContext(fs.readFileSync(new URL('../Drift Drive/sounds.js',import.meta.url),'utf8'),context);
  vm.runInContext(fs.readFileSync(new URL('../Drift Drive/jdm-audio.js',import.meta.url),'utf8'),context);context.ENGINE_SOUNDS=context.window.ENGINE_SOUNDS;
  for(const bank of Object.values(context.window.ENGINE_SOUNDS))for(const k of ['idle','low','mid','high','limiter']){
    if(!bank[k])continue;
    if(bank[k].startsWith('audio/')){const b=fs.readFileSync(new URL('../Drift Drive/'+bank[k],import.meta.url));
      assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');}
    else{const b=Buffer.from(bank[k],'base64');assert.equal(b.toString('ascii',0,4),bank.synthesized?'RIFF':'OggS');if(bank.synthesized){assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),32000);assert.equal(b.readUInt16LE(34),16);}}
  }
});

test('expanded map has a curved mountain expressway and named Japanese landscapes',()=>{
  assert.equal(g.world.WORLD,14000);assert.ok(g.PLACES.length>=12);
  const highways=g.EDGES.filter(e=>e.type==='highway');
  const length=highways.reduce((sum,e)=>sum+e.length,0);
  assert.ok(length>13000&&length<14500);
  const highwayHeights=highways.flatMap(e=>[...g.arrays.RH.slice(e.s,e.s+e.n)]);
  assert.ok(Math.max(...highwayHeights)-Math.min(...highwayHeights)>80);
  const surface=[];g.scene.traverse(o=>{if(o.userData.worldBatch)surface.push(o.userData.worldBatch);});
  for(const kind of ['bamboo','paddies','trees','roads','rails'])assert.ok(surface.includes(kind));
});
test('road surface matches collision across the full road width with no soil breaking through asphalt',()=>{
  const {RX,RZ,RW,TXa,TZa}=g.arrays;let checked=0;
  for(const e of g.EDGES)for(let j=0;j<e.n-1;j+=4){const i=e.s+j;
    for(const side of [-.94,-.5,0,.5,.94]){
      const x=RX[i]-TZa[i]*RW[i]*side,z=RZ[i]+TXa[i]*RW[i]*side,p=g.pavedSurface(x,z);
      assert.ok(p,`missing paved road ${i} side ${side}`);const soil=g.soilSurface(x,z);if(soil)assert.ok(soil.h<p.h-.005&&soil.h>p.h-.03,`soil crosses asphalt at ${i}: ${soil.h-p.h}`);
      assert.ok(Math.abs(g.ground(x,z)-p.h)<1e-7);checked++;
    }}
  assert.ok(checked>30000);
});
test('crossing paved seams does not create height steps across the driving width',()=>{
  const {RX,RZ,RW,TXa,TZa}=g.arrays;let maxStep=0;
  for(const e of g.EDGES)for(let j=1;j<e.n-1;j+=8){const i=e.s+j,w=RW[i];let previous=null;
    for(let offset=-w*.95;offset<=w*.95;offset+=.35){const p=g.pavedSurface(RX[i]-TZa[i]*offset,RZ[i]+TXa[i]*offset);
      if(p&&previous){maxStep=Math.max(maxStep,Math.abs(p.h-previous.h));assert.ok(Math.abs(p.h-previous.h)<.075,`height seam at ${i}: ${p.h-previous.h}`);}previous=p;}
  }
  console.log(`Maximum cross-road sample step ${maxStep.toFixed(5)} m`);
});
test('clipped road polygons do not duplicate asphalt at crossings or hairpins',()=>{
  const seen=new Set(),ids=new Map(g.ROAD_SKIN.map((p,i)=>[p,i]));let checked=0;
  for(const entries of g.SKIN_GRID.values())for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j];
    if(a.bounds.minX>=b.bounds.maxX-1e-5||a.bounds.maxX<=b.bounds.minX+1e-5||a.bounds.minZ>=b.bounds.maxZ-1e-5||a.bounds.maxZ<=b.bounds.minZ+1e-5)continue;
    const key=ids.get(a)+':'+ids.get(b);if(seen.has(key))continue;seen.add(key);
    let poly=a.poly;for(let k=0;k<b.poly.length&&poly.length;k++)poly=g.clipHalf(poly,b.poly[k],b.poly[(k+1)%b.poly.length],true);
    assert.ok(!poly.length||Math.abs(g.polyArea(poly))<.0001,`overlapping roads ${a.i}/${b.i}`);checked++;
  }
  assert.ok(checked>100);console.log(`Checked ${checked} potentially overlapping road polygon pairs`);
});
test('all paved road profiles respect climbable grade limits',()=>{
  const {RX,RZ,RH}=g.arrays;for(const e of g.EDGES)for(let j=0;j<e.n-1;j++){
    const i=e.s+j,grade=Math.abs(RH[i+1]-RH[i])/Math.hypot(RX[i+1]-RX[i],RZ[i+1]-RZ[i]);
    assert.ok(grade<=e.maxGrade+.0001,`grade ${grade} at ${i}`);
  }
});
test('supporting road planes remain climbable and do not pull cars toward cut banks',()=>{
  for(const skin of g.ROAD_SKIN){const grade=Math.hypot(skin.plane.gx,skin.plane.gz),limit=g.EDGES[skin.owner].maxGrade;
    assert.ok(grade<=limit+.00005,`steep rendered face ${skin.i}: ${grade}`);}
  const c=g.cars[0],{RX,RZ,RW,TXa,TZa}=g.arrays;
  for(const e of g.EDGES){const i=e.s+Math.floor(e.n/2),x=RX[i]-TZa[i]*RW[i]*.92,z=RZ[i]+TXa[i]*RW[i]*.92,p=g.pavedSurface(x,z);
    if(!p)continue;g.placeCar(c,x,z,0);g.prePhys(c);
    assert.ok(Math.abs(c.gfx+g.P.mass*9.81*p.gx)<1e-6);assert.ok(Math.abs(c.gfz+g.P.mass*9.81*p.gz)<1e-6);}
});
test('every baseline engine launches uphill against a 14 percent incline load',()=>{
  const c=g.cars[0],e=g.EDGES.find(e=>e.type==='highway'),i=e.s+Math.floor(e.n/2),{RX,RZ,TXa,TZa}=g.arrays;
  for(const name of Object.keys(g.ENGINE_PROFILES)){
    g.selectEngine(name,'factory');g.placeCar(c,RX[i],RZ[i],Math.atan2(-TZa[i],TXa[i]));
    c.muF=g.P.gripF;c.muR=g.P.gripR;c.inWater=false;Object.assign(c.inp,{thr:1,brk:0,hb:false,clutch:false});
    c.gfx=-g.P.mass*9.81*.14*TXa[i];c.gfz=-g.P.mass*9.81*.14*TZa[i];
    for(let tick=0;tick<960;tick++)g.step(c,1/240);
    const progress=(c.x-RX[i])*TXa[i]+(c.z-RZ[i])*TZa[i];
    assert.ok(progress>5&&c.vx>2,`${name} failed uphill: progress ${progress}, speed ${c.vx}`);
  }
  g.selectEngine('2JZ','factory');
});
test('automatic gears hold a burnout and avoid wheel-RPM shift hunting',()=>{
  const c=g.cars[0];g.placeCar(c,0,0,0);c.gear=1;c.vx=2;c.wR=(g.P.redline-50)/(g.ratioOf(1)*60/(2*Math.PI));c.rpm=g.P.redline-50;c.inp.thr=1;
  for(let i=0;i<120;i++)g.updateAutoShift(c);
  assert.equal(c.gear,1);assert.equal(c.cutT,0);
});
test('a 1st to 2nd shift clears stale cuts and restores drive torque under hill load',()=>{
  const c=g.cars[0],e=g.EDGES.find(e=>e.type==='highway'),i=e.s+Math.floor(e.n/2),{RX,RZ,TXa,TZa}=g.arrays;
  g.placeCar(c,RX[i],RZ[i],Math.atan2(-TZa[i],TXa[i]));c.gear=1;c.vwx=TXa[i]*3;c.vwz=TZa[i]*3;c.vx=3;
  c.wR=(g.P.redline-100)/(g.ratioOf(1)*60/(2*Math.PI));c.rpm=g.P.redline-100;c.cutT=.07;c.limT=.15;c.spool=1;
  Object.assign(c.inp,{thr:1,brk:0,hb:false,clutch:false});c.gfx=-g.P.mass*9.81*.14*TXa[i];c.gfz=-g.P.mass*9.81*.14*TZa[i];
  assert.equal(g.shift(c,1),true);assert.equal(c.gear,2);assert.equal(c.cutT,0);assert.equal(c.limT,0);
  let powered=0;for(let tick=0;tick<96;tick++){g.step(c,1/240);g.updateAutoShift(c);if(c.driveTorque>100)powered++;}
  assert.equal(c.gear,2);assert.ok(powered>25);assert.equal(c.cutT,0);assert.ok(c.vx>3);
});
test('every engine applies a distinct physical tune and remembers its edits',()=>{
  const powers=new Set();
  for(const name of Object.keys(g.ENGINE_PROFILES)){
    g.selectEngine(name,'factory');assert.equal(g.P.hp,g.ENGINE_PROFILES[name].tune.hp);assert.equal(g.P.engine,name);
    assert.equal(g.P.gears,g.ENGINE_PROFILES[name].tune.gears);
    for(let rpm=800;rpm<=g.P.redline;rpm+=300)assert.ok(g.engineTorque(rpm,1)>0);
    powers.add(g.P.torque);assert.ok(Number.isFinite(g.ratioOf(g.P.gears)));
  }
  assert.ok(powers.size>=5);g.selectEngine('RB25','factory');g.P.boost=19;g.selectEngine('LS9','factory');g.selectEngine('RB25');assert.equal(g.P.boost,19);
  g.selectEngine('2JZ','factory');
});
test('clutch kick produces a controllable wheel-slip burst without a forced sideways impulse',()=>{
  const c=g.cars[0];g.placeCar(c,0,0,0);c.gear=2;c.inp.thr=1;c.rpm=6500;c.clutchHeld=.15;c.wR=20/.32;c.vwx=20;c.vwz=4;
  const before={wheel:c.wR,x:c.vwx,z:c.vwz,yaw:c.yaw};
  assert.equal(g.clutchKick(c,g.ratioOf(2),20),true);assert.ok(c.wR>before.wheel);assert.ok(c.kickTimer>0);
  assert.equal(c.vwx,before.x);assert.equal(c.vwz,before.z);assert.equal(c.yaw,before.yaw);
  assert.ok(g.slideSupport(c,20,6)>0);c.inp.thr=0;assert.equal(g.slideSupport(c,20,6),0);
  c.inp.thr=1;const strength=g.P.clutchKick;g.P.clutchKick=0;assert.equal(g.clutchKick(c,g.ratioOf(2),20),false);g.P.clutchKick=strength;
  g.placeCar(c,0,0,0);assert.equal(c.kickTimer,0);
});
test('releasing a revved clutch triggers one kick; handbrake release does not',()=>{
  const c=g.cars[0],q=g.nearestRoad(100,g.world.NODES[16][1]);g.placeCar(c,q.px,q.pz,0);c.gear=2;c.vwx=14;c.wR=14/.32;c.rpm=6300;
  Object.assign(c.inp,{thr:1,brk:0,hb:false,clutch:true});
  for(let i=0;i<24;i++){g.prePhys(c);g.step(c,1/240);}
  c.inp.clutch=false;g.step(c,1/240);assert.ok(c.kickTimer>0);const timer=c.kickTimer;
  for(let i=0;i<12;i++)g.step(c,1/240);assert.ok(c.kickTimer<timer);assert.equal(c.clutchHeld,0);
  g.placeCar(c,q.px,q.pz,0);Object.assign(c.inp,{thr:1,brk:0,hb:true,clutch:false});
  for(let i=0;i<24;i++)g.step(c,1/240);c.inp.hb=false;g.step(c,1/240);assert.equal(c.kickTimer,0);
});
test('slide support sustains lateral motion while manual countersteering keeps priority',()=>{
  g.selectEngine('2JZ','factory');const c=g.cars[0],q=g.nearestRoad(100,g.world.NODES[16][1]),old=g.P.slideAssist;
  function run(support){g.P.slideAssist=support;g.placeCar(c,q.px,q.pz,0);c.gear=2;c.vwx=20;c.vwz=-7;c.wR=20/.32;c.inp.thr=1;c.inp.brk=0;c.inp.clutch=false;c.inp.hb=false;
    let sideways=0;for(let i=0;i<120;i++){if(i%4===0)g.prePhys(c);g.step(c,1/240);sideways+=Math.abs(c.vy)/240;}return sideways;}
  const base=run(0),supported=run(.9);assert.ok(supported>base,`${supported} <= ${base}`);g.P.slideAssist=old;
  g.placeCar(c,q.px,q.pz,0);c.vx=20;c.vy=8;c.inp.thr=1;c.kickTimer=.6;
  g.keys.KeyA=true;g.readInput(c,1/60,0);assert.ok(c.rawSteer>0);assert.ok(c.steer>0);delete g.keys.KeyA;
});
test('travel reaches each landscape and is blocked during an active race',()=>{
  const c=g.cars[0];for(let i=0;i<g.PLACES.length;i++){g.travelToPlace(i);assert.ok(g.PLACES[i].siteId?g.pavedSurface(c.x,c.z):g.nearestRoad(c.x,c.z).d<1);assert.equal(c.vyv,0);}
  g.race.active=true;const x=c.x,z=c.z;g.travelToPlace(0);assert.equal(c.x,x);assert.equal(c.z,z);g.race.active=false;
});
test('route planner follows the highway and creates ordered directional gates',()=>{
  g.presetCourse('highway');assert.ok(g.race.length>12500&&g.race.length<14500);assert.ok(g.race.course.length>60);
  let previous=0;for(const gate of g.race.course){assert.ok(gate.distance>previous);previous=gate.distance;}
  assert.ok(Math.max(...g.race.route.map(p=>p.z))-Math.min(...g.race.route.map(p=>p.z))>1500);
  const gate=g.race.course[10],point=(along,side=0,height=0)=>({x:gate.x+gate.tx*along-gate.tz*side,z:gate.z+gate.tz*along+gate.tx*side,y:gate.y+height});
  assert.equal(g.crossesGate(point(-30),point(30),gate),true);
  assert.equal(g.crossesGate(point(30),point(-30),gate),false);
  assert.equal(g.crossesGate(point(-30,gate.width+4),point(30,gate.width+4),gate),false);
  assert.equal(g.crossesGate(point(-30,0,8),point(30,0,8),gate),false);
});
test('race countdown freezes cars; gates, recovery penalties and completion work end to end',()=>{
  const oldPerformance=context.performance;let now=0;context.performance={now:()=>now};
  g.presetCourse('highway');assert.equal(g.startRace(),true);const c=g.cars[0],x=c.x;
  c.inp.thr=1;g.step(c,1/240);assert.equal(c.x,x);assert.equal(c.frozen,true);
  now=3001;g.updRace();assert.equal(g.race.state,'run');assert.equal(c.frozen,false);
  g.recoverRaceCar(c);assert.equal(g.race.players[0].penalty,5);
  const p=g.race.players[0];
  for(const gate of g.race.course){
    p.previous={x:gate.x-gate.tx*5,z:gate.z-gate.tz*5,y:gate.y};
    c.x=gate.x+gate.tx*5;c.z=gate.z+gate.tz*5;c.y=gate.y;now+=3000;g.updRace();
  }
  assert.equal(p.done,true);assert.equal(p.next,g.race.total);assert.equal(g.race.state,'done');assert.ok(p.time>5);
  g.endRace();context.performance=oldPerformance;
});
test('circuits require every checkpoint on every lap',()=>{
  const oldPerformance=context.performance;let now=0;context.performance={now:()=>now};
  g.race.cps=[0,1,3].map(i=>({x:g.world.NODES[i][0],z:g.world.NODES[i][1]}));g.race.loop=true;g.race.laps=2;g.startRace();now=3001;g.updRace();
  const c=g.cars[0],p=g.race.players[0],n=g.race.course.length;
  for(let i=0;i<n*2;i++){const gate=g.race.course[i%n];p.previous={x:gate.x-gate.tx*4,z:gate.z-gate.tz*4,y:gate.y};
    c.x=gate.x+gate.tx*4;c.z=gate.z+gate.tz*4;c.y=gate.y;now+=2000;g.updRace();if(i===n-1)assert.equal(p.done,false);}
  assert.equal(p.done,true);assert.ok(Number.isFinite(p.bestLap));g.endRace();context.performance=oldPerformance;
});

class Param {
  constructor(){this.value=0;}
  setTargetAtTime(v){assert.ok(Number.isFinite(v));this.value=v;}
  setValueAtTime(v){this.value=v;}
  exponentialRampToValueAtTime(v){this.value=v;}
  linearRampToValueAtTime(v){this.value=v;}
}
class AudioNode {
  constructor(){this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.pan=new Param();this.playbackRate=new Param();this.delayTime=new Param();this.connections=[];this.stopped=false;}
  connect(n){this.connections.push(n);}disconnect(){this.connections=[];}start(time){this.startedAt=time;}stop(time){this.stoppedAt=time;assert.equal(this.stopped,false);this.stopped=true;}
}
class AudioBuffer {
  constructor(ch,len,sr){this.numberOfChannels=ch;this.length=len;this.sampleRate=sr;this.duration=len/sr;this.data=Array.from({length:ch},()=>new Float32Array(len));}
  getChannelData(ch){return this.data[ch];}
}
class FakeAudioContext {
  constructor(){this.sampleRate=44100;this.currentTime=1;this.destination=new AudioNode();}
  createBuffer(ch,len,sr){return new AudioBuffer(ch,len,sr);}
  async decodeAudioData(bytes){assert.ok(bytes.byteLength>44);const b=this.createBuffer(1,4410,44100);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.sin(i/10)*0.5;return b;}
  resume(){return Promise.resolve();}suspend(){return Promise.resolve();}
}
for(const name of ['Gain','BufferSource','DynamicsCompressor','Convolver','BiquadFilter','Delay','StereoPanner','Oscillator'])FakeAudioContext.prototype['create'+name]=()=>new AudioNode();
// Shared fixture also permits running menu/radio tests by name on their own.
context.ENGINE_SOUNDS=context.window.ENGINE_SOUNDS;context.AudioContext=FakeAudioContext;
context.fetch=async path=>({ok:true,arrayBuffer:async()=>{
  const b=fs.readFileSync(new URL('../Drift Drive/'+path,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
test('audio engine changes, cache, RPM mixing and split toggles release old nodes',async()=>{
  g.initAudio();await g.loadEngine('2JZ');assert.equal(g.cars[0].au.layers.length,4);
  for(const rpm of [950,2800,4800,6800,7900]){g.cars[0].rpm=rpm;g.updAudio(g.cars[0],1/60,30,0);}
  const old=g.cars[0].au.layers.slice();await g.loadEngine('LS9');
  assert.ok(old.every(l=>l.src.stopped&&l.src.connections.length===0&&l.g.connections.length===0));
  await Promise.all([g.loadEngine('Rotary'),g.loadEngine('Street')]);assert.equal(g.cars[0].au.layers.length,1);
  for(let i=0;i<5;i++){g.setSplit(true);assert.ok(g.cars[1].au);const a=g.cars[1].au;g.setSplit(false);
    assert.ok([...a.srcs,...a.layers.map(l=>l.src)].every(n=>n.stopped&&n.connections.length===0));assert.equal(a.out.connections.length,0);}
  assert.ok(g.engineCache.has('Street'));
});
test('loop preparation smooths the wrap and bounds sample peaks',()=>{
  const ac=g.state.AC,b=ac.createBuffer(1,4410,44100),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=0.9*Math.sin(i/30);
  const out=g.prepareLoop(b),v=out.getChannelData(0);
  assert.ok(out.length<b.length);assert.ok([...v].every(Number.isFinite));assert.ok(Math.max(...v.map(Math.abs))<=0.851);
  assert.ok(Math.abs(v[0]-v[v.length-1])<Math.abs(d[0]-d[d.length-1]));
});

test('road verges join soil within centimetres and edge poses remain upright',()=>{
  const c=g.cars[0];let samples=0;
  for(const skin of g.ROAD_SKIN.filter((_,i)=>i%61===0))for(let j=0;j<skin.poly.length;j++){
    const a=skin.poly[j],b=skin.poly[(j+1)%skin.poly.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.3)continue;
    const x=(a.x+b.x)/2+dz/len*.015,z=(a.z+b.z)/2-dx/len*.015;if(g.pavedSurface(x,z))continue;
    const soil=g.soilSurface(x,z);if(!soil)continue;
    const p=skin.plane,expected=p.h+p.gx*(x-p.x)+p.gz*(z-p.z);
    assert.ok(Math.abs(soil.h-expected)<.15,`verge step ${Math.abs(soil.h-expected)} at ${x},${z} road ${skin.i}`);samples++;
    g.placeCar(c,x,z,Math.atan2(-dz,dx));g.updVisual(c,1/60);
    const up=new Three.Vector3(0,1,0).applyQuaternion(c.q);assert.ok(up.y>.88);
    for(const w of c.wheels)assert.ok(Math.abs(w.pivot.position.y-.32)<=.07001);
  }
  assert.ok(samples>50);
});
test('clutch kick bounds wheel-speed gain and transfers only stored engine energy',()=>{
  g.selectEngine('2JZ','factory');const c=g.cars[0];g.placeCar(c,0,0,0);
  c.gear=2;c.inp.thr=1;c.rpm=7200;c.clutchHeld=.2;c.wR=25;
  const old=c.wR,ratio=g.ratioOf(2),energy=.5*g.P.inertia*((c.rpm*2*Math.PI/60)**2-(old*ratio)**2);
  assert.equal(g.clutchKick(c,ratio,8),true);assert.ok((c.wR-old)*.32<=4.50001);
  assert.ok(c.kickEnergy<=energy*.85+.001);assert.equal(c.kickTorque,0);assert.ok(c.kickTimer<=.45);
});
test('turbo tone stays silent and one loaded lift produces one flutter',async()=>{
  g.selectEngine('2JZ','factory');await g.loadEngine('2JZ');const c=g.cars[0];
  c.turboLiftArmed=false;c.turboCooldown=0;c.lastSpool=0;c.spool=1;c.rpm=4000;c.inp.thr=1;
  const count=c.au.flutterCount||0;for(let i=0;i<30;i++)g.updAudio(c,1/60,15,0);
  assert.equal(c.au.tg.gain.value,0);assert.equal(c.au.flutterCount||0,count);
  for(let i=29;i>=0;i--){c.inp.thr=i/30;g.updAudio(c,1/60,15,0);}
  assert.equal(c.au.flutterCount,count+1);for(let i=0;i<120;i++)g.updAudio(c,1/60,15,0);
  assert.equal(c.au.flutterCount,count+1);
  const volume=g.P.turboVolume;g.P.turboVolume=0;g.playTurboFlutter(c.au,1);assert.equal(c.au.flutterCount,count+1);g.P.turboVolume=volume;
});
test('traffic is bounded, yields to players, and disables itself on slow frames',()=>{
  g.endRace();g.setSplit(false);g.P.trafficMode=1;g.traffic.tier=2;g.setStarted(true);
  assert.equal(g.trafficLimit(),6);assert.equal(g.traffic.meshes.length,5);
  assert.ok(g.traffic.meshes.every(m=>m.isInstancedMesh&&!m.castShadow));
  g.setSplit(true);assert.equal(g.trafficLimit(),4);g.setSplit(false);
  const v=g.traffic.vehicles[0],c=g.cars[0],edge=g.EDGES.findIndex(e=>e.type==='highway');
  Object.assign(v,{edge,s:g.EDGES[edge].length/2,active:true,speed:15,x:0,z:0,fx:1,fz:0});
  g.placeCar(c,10,0,0);c.vwx=0;c.vwz=0;assert.ok(g.trafficTarget(v)<5);
  const y=c.y,vy=c.vyv;Object.assign(v,{x:c.x+1,z:c.z,y:c.y,speed:10});g.collideTraffic(c,1/240);
  assert.equal(c.y,y);assert.equal(c.vyv,vy);assert.ok(Math.abs(c.r)<=2.5);
  for(let i=0;i<100;i++)g.updateTrafficBudget(.1);assert.equal(g.trafficLimit(),0);
  for(let i=0;i<1000;i++)g.updateTrafficBudget(1/60);assert.equal(g.trafficLimit(),6);
  g.P.trafficMode=0;g.updateTraffic(1/60);assert.ok(g.traffic.vehicles.every(v=>!v.active));g.P.trafficMode=1;
  g.traffic.timer=0;const before=g.traffic.aiSteps;for(let i=0;i<60;i++)g.updateTraffic(1/60);
  assert.ok(g.traffic.aiSteps-before>=9&&g.traffic.aiSteps-before<=10);g.setStarted(false);
});
test('S14 inspired body uses coupe proportions with bounded geometry',()=>{
  const c=g.cars[0];assert.match(c.root.userData.model,/S14/);const d=c.root.userData.dimensions;
  assert.ok(d.length>4.4&&d.length<4.6);let triangles=0;c.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<18000);
});

test('arcade menu selects both modes and freezes the run while paused',()=>{
  assert.equal(g.startMode(true),true);assert.equal(g.state.started,true);assert.equal(g.cars.length,2);
  g.openMainMenu();const c=g.cars[0],x=c.x,z=c.z;c.vwx=15;c.inp.thr=1;g.frame();
  assert.equal(g.state.started,false);assert.equal(c.x,x);assert.equal(c.z,z);assert.equal(g.physicsClock.accumulator,0);
  assert.equal(context.document.getElementById('menu-controls').style.display,'block');
  assert.equal(g.startMode(false),true);assert.equal(g.cars.length,1);assert.equal(g.state.split,false);g.openMainMenu();
});
test('street and drift setups change handling while preserving engine configuration',()=>{
  const engine=g.P.engine,power=g.P.hp,gears=g.P.g1;
  g.applyHandlingPreset('street');assert.ok(g.P.gripR>g.P.gripF);assert.ok(g.P.slideAssist<.1);const lock=g.P.steer,kick=g.P.clutchKick;
  g.applyHandlingPreset('drift');assert.ok(g.P.steer>lock);assert.ok(g.P.clutchKick>kick);assert.ok(g.P.slideAssist>.3);
  assert.equal(g.P.engine,engine);assert.equal(g.P.hp,power);assert.equal(g.P.g1,gears);assert.equal(g.applyHandlingPreset('missing'),false);
});
test('traffic has solid oriented contacts that stop frontal penetration without lifting the car',()=>{
  g.setSplit(false);g.P.trafficMode=1;g.traffic.tier=2;for(const v of g.traffic.vehicles)v.active=false;
  const c=g.cars[0],v=g.traffic.vehicles[0];g.placeCar(c,-4.2,0,0);Object.assign(v,{active:true,x:0,z:0,y:c.y,fx:1,fz:0,speed:0});
  c.vwx=40;c.vwz=0;const y=c.y,vertical=c.vyv;
  assert.ok(g.trafficContact(c,v));g.collideTraffic(c,1/240);assert.equal(g.trafficContact(c,v),null);assert.ok(c.vwx<=0);
  assert.equal(c.y,y);assert.equal(c.vyv,vertical);assert.ok(v.hold>=1);
  g.placeCar(c,0,5,Math.PI/4);assert.equal(g.trafficContact(c,v),null);v.active=false;
});
test('solo backfire sound and flame use the same audio event and stay out of split-screen',()=>{
  g.setStarted(true);g.setSplit(false);const c=g.cars[0],ac=g.state.AC;ac.currentTime=10;
  c.nextBackfire=0;c.backfireArmed=false;c.lastFxGear=c.gear;c.lastFxCut=false;c.cutT=0;c.rpm=5000;c.inp.thr=1;g.updateBackfire(c);
  const before=c.backfireCount||0;c.inp.thr=0;g.updateBackfire(c);assert.equal(c.backfireCount,before+1);
  const event=c.backfireEvent;assert.ok(event.at>10);assert.equal(event.source.startedAt,event.at);g.updateSoloFX(0);assert.equal(c.fxFlame.visible,false);
  ac.currentTime=event.at+.02;g.updateSoloFX(0);assert.equal(c.fxFlame.visible,true);
  g.updateBackfire(c);assert.equal(c.backfireCount,before+1);assert.equal(g.triggerBackfire(c),false);
  ac.currentTime=event.until+.01;g.updateSoloFX(0);assert.equal(c.fxFlame.visible,false);
  event.source.onended();assert.equal(event.source.connections.length,0);
  g.setSplit(true);ac.currentTime+=1;assert.equal(g.triggerBackfire(c),false);g.updateSoloFX(0);assert.equal(c.fxFlame.visible,false);
  g.setSplit(false);g.setStarted(false);
});
test('solo graphics reduce their budget after slow frames and recover without changing split settings',()=>{
  g.setStarted(true);g.soloQuality.tier=1;g.soloQuality.ema=1/60;g.soloQuality.slow=g.soloQuality.fast=0;g.applyRenderQuality();
  assert.ok(g.roadRenderMats.every(m=>m.normalMap));for(let i=0;i<100;i++)g.updateSoloBudget(.08);
  assert.equal(g.soloQuality.tier,0);assert.equal(g.renderer.shadowMap.enabled,false);assert.ok(g.roadRenderMats.every(m=>!m.normalMap));
  for(let i=0;i<1200;i++)g.updateSoloBudget(1/60);assert.equal(g.soloQuality.tier,1);assert.equal(g.renderer.shadowMap.enabled,true);
  g.setSplit(true);assert.equal(g.renderer.shadowMap.enabled,false);assert.equal(g.renderer.ratio,1);g.setSplit(false);g.setStarted(false);
});
test('analog instruments follow speed and RPM, clamp needles, and cap redraws at 30 Hz',()=>{
  const c=g.cars[0],a=c.hud.analog;a.last=-Infinity;a.speed=a.rpm=0;c.vwx=20;c.vwz=0;c.rpm=6000;
  g.updateAnalogGauge(c,1000);assert.equal(a.rpm,2400);assert.ok(Math.abs(a.speed-28.8)<1e-8);
  g.updateAnalogGauge(c,1010);assert.equal(a.rpm,2400);g.updateAnalogGauge(c,1040);assert.ok(a.rpm>2400);
  assert.equal(g.dialAngle(-10,320),g.dialAngle(0,320));assert.equal(g.dialAngle(500,320),g.dialAngle(320,320));
});

test('drift stabilizer opposes growing spin with bounded torque and fades for player input',()=>{
  g.applyHandlingPreset('drift');const c=g.cars[0];g.placeCar(c,0,0,0);c.r=-1.5;c.rawSteer=0;c.inp.hb=false;c.inp.clutch=false;c.kickTimer=0;
  const inertia=g.P.mass*1.52,help=g.driftYawAssist(c,20,25,inertia);
  assert.ok(help>0&&help<=inertia*2.5);c.rawSteer=1;assert.ok(g.driftYawAssist(c,20,25,inertia)<help);
  c.rawSteer=0;c.inp.hb=true;assert.ok(g.driftYawAssist(c,20,25,inertia)<help);c.inp.hb=false;
  assert.equal(g.driftYawAssist(c,20,1,inertia),0);const vx=c.vwx,vz=c.vwz;g.driftYawAssist(c,20,25,inertia);assert.equal(c.vwx,vx);assert.equal(c.vwz,vz);
});
test('camera spring is stable and frame-rate independent for a fixed target',()=>{
  const ends=[];for(const hz of [30,60,120]){let p=0,v=0;for(let i=0;i<hz;i++)[p,v]=g.cameraSpring(p,v,10,12,1/hz);assert.ok(p>9.9&&p<=10);ends.push(p);}
  assert.ok(Math.max(...ends)-Math.min(...ends)<1e-10);
});
test('solo smoke is denser and prolonged heat flames are brief, bounded and disabled in split-screen',()=>{
  g.setStarted(true);g.setSplit(false);g.soloQuality.tier=1;const c=g.cars[0],point=new Three.Vector3();
  const index=g.smokeState.head;g.emit(c,point,1);const solo=g.smokeState.alpha[index];
  g.setSplit(true);const next=g.smokeState.head;g.emit(c,point,1);assert.ok(solo>g.smokeState.alpha[next]*1.5);g.setSplit(false);
  Object.assign(c,{tireHeat:1,burnTime:0,heatBursts:0,nextHeatBurst:0,heatFireUntil:0,wR:70,vx:0,contact:1});
  g.updateTyreHeatFX(c,1);assert.equal(c.heatBursts,0);c.burnTime=8.1;g.updateTyreHeatFX(c,1/60);assert.equal(c.heatBursts,1);assert.equal(c.heatFlames.visible,true);
  for(let i=0;i<100;i++)g.updateTyreHeatFX(c,1/60);assert.ok(c.heatBursts<=3);
  g.setSplit(true);g.updateTyreHeatFX(c,0);assert.equal(c.heatFlames.visible,false);g.setSplit(false);c.tireHeat=0;g.updateTyreHeatFX(c,10);assert.equal(c.heatBursts,0);g.setStarted(false);
});
test('solo JDM detail is pooled and removed from split-screen rendering',()=>{
  g.soloQuality.tier=1;g.setSplit(false);const c=g.cars[0];g.applyRenderQuality();assert.equal(c.jdm.visible,true);assert.ok(c.detailWheels.every(m=>m.visible));
  g.setSplit(true);assert.equal(c.jdm.visible,false);assert.ok(c.detailWheels.every(m=>!m.visible));g.setSplit(false);
});
test('west-coast expansion connects new road types and a driveable covered tunnel',()=>{
  for(const type of ['coast','industrial','tunnel'])assert.ok(g.EDGES.some(e=>e.type===type));assert.equal(g.TUNNELS.length,1);
  const t=g.TUNNELS[0],e=g.EDGES[t.edge],i=e.s+Math.floor(e.n/2),a=g.arrays,c=g.cars[0];
  assert.ok(t.length>800&&t.clearance>6);assert.ok(t.mesh.geometry.boundingSphere);assert.ok(t.fixtures.count<100);
  g.placeCar(c,a.RX[i],a.RZ[i],Math.atan2(-a.TZa[i],a.TXa[i]));g.prePhys(c);assert.equal(c.tunnelRoad,true);
  c.x-=a.TZa[i]*a.RW[i];c.z+=a.TXa[i]*a.RW[i];const y=c.y;g.collideTunnel(c);const q=g.nearestRoad(c.x,c.z);assert.ok(q.d<a.RW[i]);assert.equal(c.y,y);
});
test('real-car sound banks are embedded Ogg assets with reproducible source manifests',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../Drift Drive/audio/recorded/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.length,6);
  for(const key of ['VQ35Recorded','MustangRecorded']){const bank=context.window.ENGINE_SOUNDS[key];assert.equal(bank.recorded,true);assert.ok(g.ENGINE_PROFILES[key]);
    for(const layer of ['idle','low','mid'])assert.equal(Buffer.from(bank[layer],'base64').toString('ascii',0,4),'OggS');}
  for(const item of manifest){const bytes=fs.readFileSync(new URL('../Drift Drive/'+item.file,import.meta.url));assert.ok(bytes.length>1000);assert.ok(item.length_seconds>0);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
});

test('V4 weather changes lighting and rain budgets without taking tyre grip away',()=>{
  g.setSplit(false);g.soloQuality.tier=1;g.applyRenderQuality();const grip=[g.P.gripF,g.P.gripR],c=g.cars[0];
  assert.equal(g.setCruiseEnvironment('night',false),true);assert.equal(g.stars.visible,true);assert.ok(c.headlights.some(l=>l.visible&&l.intensity>0));
  g.setSplit(true);assert.ok(g.cars.every(c=>c.headlights.every(l=>!l.visible)));g.setCruiseEnvironment('night',true);g.updateWeatherFX(1/60);
  assert.equal(g.stars.visible,false);assert.ok(g.rainEffect.geometry.drawRange.count<=1200);assert.ok(g.roadRenderMats.every(m=>m.roughness<.6));
  assert.deepEqual([g.P.gripF,g.P.gripR],grip);assert.equal(g.setCruiseEnvironment('invalid'),false);g.setSplit(false);g.setCruiseEnvironment('day',false);
});
test('all five cruise stops have connected paved driveways and persist one postcard per stop',()=>{
  g.race.active=false;g.cruiseProgress.visited={};assert.equal(g.CRUISE_SITES.length,5);
  for(const site of g.CRUISE_SITES){assert.ok(site.lot);const lot=site.lot;
    for(let t=0;t<=1;t+=.05){const x=lot.anchor.x+(lot.x-lot.anchor.x)*t,z=lot.anchor.z+(lot.z-lot.anchor.z)*t;assert.ok(g.pavedSurface(x,z),`unpaved driveway at ${site.id} ${t}`);}
    assert.equal(g.travelToCruiseSite(site.id),true);assert.ok(g.pavedSurface(g.cars[0].x,g.cars[0].z));assert.equal(g.cruiseProgress.visited[site.id],true);assert.equal(g.visitCruiseSite(site.id),false);
  }
  const saved=JSON.parse(context.localStorage.getItem('dd-progress-v4'));assert.equal(Object.keys(saved.visited).length,5);const c=g.cars[0],x=c.x,z=c.z;g.race.active=true;assert.equal(g.travelToCruiseSite('store'),false);assert.equal(c.x,x);assert.equal(c.z,z);g.race.active=false;
});
test('personal builds are independent per player, save locally and preserve handling physics',()=>{
  g.setSplit(true);const [a,b]=g.cars,oldB=b.build.paint,engine=g.P.engine,grip=g.P.gripR,radius=a.wheels[0].pivot.position.y;
  g.applyPlayerBuild(a,{paint:'#284455',wheels:'five',ride:'low',kit:'drift',exhaust:'mellow',interior:'red',decal:'postcard'});
  assert.equal(a.build.paint,'#284455');assert.equal(b.build.paint,oldB);assert.equal(a.build.decal,'postcard');assert.ok(a.body.position.y<0);assert.equal(a.wheels[0].pivot.position.y,radius);
  g.applyPlayerBuild(b,{paint:'#803d3d',wheels:'dish'});assert.equal(a.build.wheels,'five');assert.equal(g.P.engine,engine);assert.equal(g.P.gripR,grip);
  const saved=JSON.parse(context.localStorage.getItem('dd-builds-v4'));assert.equal(saved[0].wheels,'five');assert.equal(saved[1].wheels,'dish');assert.equal(g.normalizedBuild({ride:'toString'}).ride,'stock');
  g.applyPlayerBuild(a,{paint:'#dfe3e8',wheels:'six',ride:'stock',kit:'street',exhaust:'sport',interior:'classic',decal:'works'});g.setSplit(false);
});
test('car meets share a capped fleet, receive occasional arrivals and have solid parked cars',()=>{
  g.race.active=false;g.setSplit(false);g.travelToCruiseSite('seaside');assert.equal(g.meetFleet.meshes.length,6);assert.ok(g.meetFleet.vehicles.length<=9);g.renderMeetFleet();assert.ok(g.meetFleet.body.count<=9);
  g.setSplit(true);
  const garage=g.CRUISE_SITES.find(s=>s.id==='garage').lot;g.placeCar(g.cars[1],garage.x,garage.z,0);g.renderMeetFleet();assert.ok(g.meetFleet.body.count<=6);
  assert.ok(g.meetFleet.vehicles.some(v=>v.siteId==='garage'&&v.rendered));assert.ok(g.meetFleet.vehicles.some(v=>v.siteId==='seaside'&&v.rendered));
  const hidden=g.meetFleet.vehicles.find(v=>v.active&&!v.rendered),c2=g.cars[1];if(hidden){g.placeCar(c2,hidden.x,hidden.z,0);c2.y=hidden.y;const x=c2.x,z=c2.z;g.collideMeetFleet(c2,1/240);assert.equal(c2.x,x);assert.equal(c2.z,z);}
  g.setSplit(false);g.renderMeetFleet();g.meetFleet.clock=75;g.meetFleet.nextArrival=75;g.updateMeetFleet(.2);assert.ok(g.meetFleet.vehicles.some(v=>v.arriving));
  const v=g.meetFleet.vehicles.find(v=>v.active&&!v.arriving),c=g.cars[0];g.placeCar(c,v.x-v.fx*4.0,v.z-v.fz*4.0,Math.atan2(-v.fz,v.fx));c.y=v.y;c.vwx=v.fx*15;c.vwz=v.fz*15;
  const y=c.y;assert.ok(g.trafficContact(c,v));g.collideMeetFleet(c,1/240);assert.equal(g.trafficContact(c,v),null);assert.equal(c.y,y);
});
test('optional coastal and drift runs award postcards and cancel without resetting progress',()=>{
  g.race.active=false;g.cruiseProgress.badges={};assert.equal(g.startCruiseChallenge('coast'),true);assert.ok(g.cruiseChallenge.route.length>10);
  while(g.cruiseChallenge.active){const gate=g.cruiseChallenge.gates[g.cruiseChallenge.next],c=g.cars[0];g.cruiseChallenge.previous={x:gate.x-gate.tx*3,y:gate.y,z:gate.z-gate.tz*3};c.x=gate.x+gate.tx*3;c.z=gate.z+gate.tz*3;c.y=gate.y;g.updateCruiseChallenge(1/60);}
  assert.equal(g.cruiseProgress.badges.coast,true);assert.equal(g.startCruiseChallenge('drift'),true);const c=g.cars[0];Object.assign(c,{vx:15,vy:6,contact:1,surfR:1,fxImpact:0});for(let i=0;i<6;i++)g.updateCruiseChallenge(1);assert.equal(g.cruiseProgress.badges.drift,true);
  g.startCruiseChallenge('clean');const last=g.cruiseChallenge.gates.at(-1);g.cruiseChallenge.next=g.cruiseChallenge.gates.length-1;g.cruiseChallenge.previous={x:last.x-last.tx*3,y:last.y,z:last.z-last.tz*3};Object.assign(c,{x:last.x+last.tx*3,z:last.z+last.tz*3,y:last.y,fxImpact:1});g.updateCruiseChallenge(1/60);assert.equal(g.cruiseProgress.badges.clean,undefined);assert.equal(g.cruiseChallenge.result.clean,false);c.fxImpact=0;
  g.startCruiseChallenge('clean');g.cancelCruiseChallenge();assert.equal(g.cruiseChallenge.active,false);assert.equal(g.cruiseProgress.badges.coast,true);assert.equal(g.startCruiseChallenge('missing'),false);
});
test('exploration saves distance and unlocks a banner without changing car performance',()=>{
  g.setStarted(true);g.closeCruisePanel();g.cruiseProgress.visited={};g.cruiseProgress.distance=0;assert.equal(g.normalizedBuild({decal:'postcard'}).decal,'works');
  for(const id of ['store','fuel','seaside'])g.visitCruiseSite(id);assert.equal(g.normalizedBuild({decal:'postcard'}).decal,'postcard');const c=g.cars[0];c.vwx=10;c.vwz=0;g.updateCruiseLife(1);assert.equal(g.cruiseProgress.distance,10);g.saveCruiseProgress();assert.equal(JSON.parse(context.localStorage.getItem('dd-progress-v4')).distance,10);g.setStarted(false);
});
test('radio stations use original embedded audio, release old sources and keep independent volumes',async()=>{
  g.setStarted(true);g.closeCruisePanel();const originalFetch=context.fetch;context.fetch=async()=>{throw new Error('Radio must not fetch external media');};
  assert.equal(await g.setRadioStation('lofi'),true);const first=g.radio.source;assert.equal(await g.setRadioStation('ambient'),true);assert.equal(first.stopped,true);assert.equal(first.connections.length,0);
  await Promise.all([g.setRadioStation('jazz'),g.setRadioStation('lofi')]);assert.equal(g.radio.station,'lofi');assert.ok(g.radio.source);assert.ok(g.radio.buffers.size<=3);
  g.P.engineVolume=.3;g.P.musicVolume=.5;g.updateCruiseAudio();assert.equal(g.radio.gain.gain.value,.5);assert.equal(await g.setRadioStation('missing'),false);assert.equal(g.radio.source,null);
  const manifest=JSON.parse(fs.readFileSync(new URL('../Drift Drive/audio/radio/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.length,3);
  for(const item of manifest){const bytes=fs.readFileSync(new URL('../Drift Drive/audio/radio/'+item.file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'OggS');assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.ok(item.seconds>50);}
  await g.setRadioStation('off');context.fetch=originalFetch;g.P.engineVolume=.8;g.P.musicVolume=.2;g.setStarted(false);
});
test('personal music is local, revokes replaced object URLs and pauses with the menu',async()=>{
  const urls=[],revoked=[];context.URL={createObjectURL:file=>{const url='blob:local-'+urls.length;urls.push(url);return url;},revokeObjectURL:url=>revoked.push(url)};
  context.Audio=class{constructor(url){this.src=url;this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
  g.setStarted(true);assert.equal(g.importPersonalMusic({name:'not-a-song.txt',type:'text/plain'}),false);assert.equal(g.importPersonalMusic({name:'My cruise.mp3',type:'audio/mpeg'}),true);await Promise.resolve();assert.equal(g.radio.station,'personal');assert.equal(g.radio.personal.paused,false);
  g.openMainMenu();assert.equal(g.radio.personal.paused,true);g.startMode(false);assert.equal(g.radio.personal.paused,false);assert.equal(g.importPersonalMusic({name:'Another song.ogg',type:'audio/ogg'}),true);assert.deepEqual(revoked,['blob:local-0']);await g.setRadioStation('off');g.radio.personal=null;g.radio.personalURL=null;g.setStarted(false);
});
test('photo mode freezes physics, traffic, challenge progress and mileage while orbiting and exporting',()=>{
  g.setStarted(true);g.closeCruisePanel();g.startCruiseChallenge('coast');const c=g.cars[0];c.vwx=20;const state={x:c.x,z:c.z,distance:g.cruiseProgress.distance,next:g.cruiseChallenge.next,traffic:g.traffic.aiSteps};
  assert.equal(g.enterPhoto(),true);g.photo.keys.add('KeyW');g.updatePhoto(.1);g.frame();g.frame();assert.equal(c.x,state.x);assert.equal(c.z,state.z);assert.equal(g.cruiseProgress.distance,state.distance);assert.equal(g.cruiseChallenge.next,state.next);assert.equal(g.traffic.aiSteps,state.traffic);assert.equal(g.capturePhoto(),true);assert.equal(g.renderer.lastCamera,g.photo.camera);
  g.leavePhoto();assert.equal(g.photo.active,false);assert.equal(g.renderer.domElement.style.filter,'');g.cancelCruiseChallenge();g.race.active=true;assert.equal(g.enterPhoto(),false);assert.equal(g.openCruisePanel(),false);g.race.active=false;g.setStarted(false);
});

test('solo grass throws bounded natural dust and clippings only from grounded unpaved tyres',()=>{
  g.setStarted(true);g.setSplit(false);const c=g.cars[0];let emitted=0;
  for(let z=80;z<=240&&!emitted;z+=20)for(let x=80;x<=240&&!emitted;x+=20){
    if(g.pavedSurface(x,z))continue;g.placeCar(c,x,z,0);g.prePhys(c);g.updVisual(c,0);
    c.vwx=20;c.vwz=0;c.wR=70;c.grassClock=0;emitted=g.updateGrassFX(c,.05);
  }
  assert.ok(emitted>0&&emitted<=8);const particles=g.smokeState;
  const ids=Array.from({length:emitted},(_,n)=>(particles.head-emitted+n+900)%900);
  assert.ok(ids.some(i=>particles.kind[i]===1));assert.ok(ids.some(i=>particles.kind[i]===2));
  assert.ok(ids.every(i=>particles.life[i]<2&&particles.alpha[i]>0));assert.equal(particles.life.length,900);
  const original=particles.head;c.contact=0;assert.equal(g.updateGrassFX(c,.05),0);assert.equal(g.smokeState.head,original);c.contact=1;
  c.inWater=true;assert.equal(g.updateGrassFX(c,.05),0);c.inWater=false;c.vwx=0;c.wR=0;assert.equal(g.updateGrassFX(c,.05),0);
  g.placeCar(c,0,0,0);g.updVisual(c,0);c.vwx=20;c.wR=70;assert.equal(g.updateGrassFX(c,.05),0);
  g.setSplit(true);assert.equal(g.updateGrassFX(c,.05),0);assert.equal(g.smokeMat.uniforms.uSolo.value,0);g.setSplit(false);g.setStarted(false);
});
test('solo limiter pops repeat at a bounded rate and retain physics hits between render frames',()=>{
  g.setStarted(true);g.setSplit(false);g.initAudio();const c=g.cars[0],ac=g.state.AC;
  g.placeCar(c,0,0,0);Object.assign(c.inp,{thr:1,clutch:true,hb:false});c.rpm=g.P.redline+200;g.prePhys(c);g.step(c,1/240);
  assert.equal(c.limiterPulse,true);c.cutT=0;c.rpm=g.P.redline-200;c.nextBackfire=0;ac.currentTime=30;const initial=c.backfireCount||0;
  g.updateBackfire(c);assert.equal(c.backfireCount,initial+1);assert.equal(c.limiterPulse,false);
  const event=c.backfireEvent;assert.equal(event.source.startedAt,event.at);ac.currentTime=event.at+.02;g.updateSoloFX(0);assert.equal(c.fxFlame.visible,true);
  for(let n=1;n<=120;n++){ac.currentTime=30+n/60;c.rpm=g.P.redline-40;g.updateBackfire(c);}
  const pops=c.backfireCount-initial;assert.ok(pops>=7&&pops<=9,'bounded limiter pops: '+pops);
  const before=c.backfireCount;c.rpm=g.P.redline-500;c.backfireArmed=false;ac.currentTime+=1;g.updateBackfire(c);assert.equal(c.backfireCount,before);
  c.rpm=g.P.redline;c.shiftT=.1;g.updateBackfire(c);assert.equal(c.backfireCount,before);
  g.setSplit(true);c.shiftT=0;c.limiterPulse=true;g.updateBackfire(c);assert.equal(c.backfireCount,before);assert.equal(c.limiterPulse,false);
  g.setSplit(false);g.setStarted(false);c.inp.clutch=false;c.inp.thr=0;
});
test('spoilers and separate bumpers switch without duplicate wings, persist and restore after split-screen',()=>{
  g.setSplit(false);const c=g.cars[0],engine=g.P.engine,grip=g.P.gripR;
  for(const spoiler of ['none','factory','ducktail','gt']){
    g.applyPlayerBuild(c,{spoiler,frontBumper:'drift',rearBumper:'street',smokeColor:'#ed5398'});
    for(const [name,group] of Object.entries(c.bodyOptions.spoiler))assert.equal(group.visible,name===spoiler);
    assert.equal(c.bodyOptions.frontBumper.drift.visible,true);assert.equal(c.bodyOptions.frontBumper.street.visible,false);assert.equal(c.bodyOptions.rearBumper.street.visible,true);
  }
  assert.equal(g.P.engine,engine);assert.equal(g.P.gripR,grip);const saved=JSON.parse(context.localStorage.getItem('dd-builds-v4'))[0];
  assert.equal(saved.spoiler,'gt');assert.equal(saved.frontBumper,'drift');assert.equal(saved.rearBumper,'street');assert.equal(saved.smokeColor,'#ed5398');
  const old=g.normalizedBuild({paint:'#284455',kit:'drift'});assert.equal(old.paint,'#284455');assert.equal(old.spoiler,'ducktail');assert.equal(old.smokeColor,'#dce0e5');
  const invalid=g.normalizedBuild({spoiler:'toString',frontBumper:'bad',smokeColor:'red'});assert.equal(invalid.spoiler,'factory');assert.equal(invalid.frontBumper,'factory');assert.equal(invalid.smokeColor,'#dce0e5');
  g.setSplit(true);assert.equal(c.factorySpoiler.visible,true);assert.equal(c.bodyOptions.spoiler.gt.visible,false);assert.equal(c.bodyOptions.frontBumper.drift.visible,false);
  g.setSplit(false);assert.equal(c.factorySpoiler.visible,false);assert.equal(c.bodyOptions.spoiler.gt.visible,true);assert.equal(c.bodyOptions.frontBumper.drift.visible,true);
});
test('custom tyre smoke uses the chosen colour while grass remains natural and split-screen stays neutral',()=>{
  g.setSplit(false);const c=g.cars[0],p=new Three.Vector3(0,1,0);g.applyPlayerBuild(c,{smokeColor:'#ed5398'});
  const index=g.smokeState.head;g.emit(c,p,1);const expected=new Three.Color('#ed5398');
  for(const [k,v] of [expected.r,expected.g,expected.b].entries())assert.ok(Math.abs(g.smokeState.color[index*3+k]-v)<1e-6);
  const dust=g.smokeState.head;g.emit(c,p,1,1);assert.ok(Math.abs(g.smokeState.color[dust*3]-.43)<1e-6);
  g.setSplit(true);const split=g.smokeState.head;g.emit(c,p,1);assert.ok(Math.abs(g.smokeState.color[split*3]-.86)<1e-6);assert.equal(g.smokeMat.uniforms.uSolo.value,0);
  g.setSplit(false);g.updSmoke(10);g.updSmoke(0);assert.ok(g.smokeState.alpha.every(a=>a===0));
});

test('V5 garage contains only four JDM legends with distinct finite body geometry',()=>{
  assert.deepEqual(Object.keys(g.JDM_CARS),['s14','r34','supra','fd']);const counts=[];
  for(const id of Object.keys(g.JDM_CARS)){
    const c=g.makeCar(g.JDM_CARS[id].color,{},id,0);let triangles=0;
    c.root.traverse(o=>{if(o.isMesh){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
    c.root.traverse(o=>{if(o.isMesh&&o.material===c.paint){assert.ok(o.geometry.attributes.color);assert.equal(o.geometry.attributes.color.count,o.geometry.attributes.position.count);}});
    assert.equal(c.carId,id);assert.ok(c.factorySpoiler);assert.ok(c.frontPlate);assert.ok(triangles<18000);counts.push(triangles);g.scene.remove(c.root);
  }
  assert.equal(new Set(counts).size,4);assert.ok(g.ENGINE_PROFILES[g.JDM_CARS.fd.engine]);assert.equal(g.selectVehicle(0,'toString'),false);
});
test('V5 pre-start garage selects bodies, saves per-car appearance and keeps the simulation paused',()=>{
  g.setStarted(false);g.race.active=false;g.setSplit(false);const hud=g.cars[0].hud,distance=g.cruiseProgress.distance;
  assert.equal(g.chooseLobbyMode('split'),true);assert.equal(g.state.started,false);
  assert.equal(g.selectVehicle(0,'r34'),true);assert.equal(g.cars[0].carId,'r34');assert.equal(g.P.engine,'RB26Tour');assert.equal(g.cars[0].hud,hud);
  const old=g.cars[0],flame=old.fxFlame.children[0].geometry;let disposed=0;flame.addEventListener('dispose',()=>disposed++);
  g.applyPlayerBuild(old,{paint:'#447799',spoiler:'gt'});g.selectVehicle(0,'supra');assert.equal(old.root.parent,null);assert.equal(disposed,0);
  g.selectVehicle(0,'r34');assert.equal(g.cars[0].build.paint,'#447799');assert.equal(g.cars[0].build.spoiler,'gt');
  assert.equal(JSON.parse(context.localStorage.getItem('dd-garage-v5')).ids[0],'r34');assert.equal(g.cruiseProgress.distance,distance);assert.equal(g.state.started,false);
});
test('V5 pre-built routes keep all start, intermediate and finish gates along the entire course',()=>{
  g.race.active=false;
  for(const kind of ['highway','mountain','coast','tunnel']){
    g.presetCourse(kind);assert.ok(g.race.length>500);const circuit=g.race.loop&&g.race.cps.length>2;assert.equal(g.gates.children.length,g.race.course.length+(circuit?0:1));
    assert.ok(g.gates.children.some(root=>root.userData.startGate));assert.equal(g.gates.children.at(-1).userData.index,g.race.course.length-1);
    assert.ok(Math.abs(g.race.course.at(-1).distance-g.race.length)<.01);
    let previous=0;for(const gate of g.race.course){assert.ok(gate.distance-previous<175);previous=gate.distance;}
    assert.ok(g.gates.children.every(root=>root.visible));
  }
});
test('V5 checkpoint arrow is independent per split view and persists alongside every gate',()=>{
  g.setStarted(true);g.setSplit(true);g.presetCourse('coast');g.startRace();const [a,b]=g.cars,gate=g.race.course[0];
  for(const c of [a,b]){c.x=gate.x-gate.tx*50;c.z=gate.z-gate.tz*50;c.yaw=Math.atan2(-gate.tz,gate.tx);}
  b.yaw+=Math.PI/2;g.updateRaceNav(a);g.updateRaceNav(b);
  assert.equal(a.hud.nav.style.left,'25%');assert.equal(b.hud.nav.style.left,'75%');assert.notEqual(a.hud.navArrow.style.transform,b.hud.navArrow.style.transform);
  assert.ok(a.hud.navTarget.textContent.includes('CP 1'));g.gates.visible=false;g.renderView(a,0,0,640,720);assert.equal(g.gates.visible,true);
  g.race.players[0].next=1;g.updateRaceNav(a);assert.ok(a.hud.navTarget.textContent.includes('CP 2'));assert.equal(g.gates.children.length,g.race.course.length+1);
  g.race.players[1].done=true;g.updateRaceNav(b);assert.equal(b.hud.nav.style.display,'none');assert.equal(a.hud.nav.style.display,'flex');g.endRace();assert.equal(a.hud.nav.style.display,'none');g.setSplit(false);g.setStarted(false);
});
test('V5 camera removes impact/shift shake and filters vertical aim changes',()=>{
  g.setSplit(false);g.setStarted(true);const c=g.cars[0];g.placeCar(c,0,0,0);g.updVisual(c,0);c.vwx=20;c.vwz=0;c.ayF=0;c.camMode=0;
  c.fxImpact=0;c.fxKick=0;c.camSnap=true;c.cam.fov=62;g.updCam(c,1/60,16/9);const p=c.cam.position.clone(),q=c.cam.quaternion.clone(),fov=c.cam.fov;
  c.fxImpact=1;c.fxKick=1;c.camSnap=true;c.cam.fov=62;g.updCam(c,1/60,16/9);assert.ok(c.cam.position.distanceTo(p)<1e-8);assert.ok(c.cam.quaternion.angleTo(q)<1e-7);assert.equal(c.cam.fov,fov);
  const height=c.camHeight;c.y+=.30;g.updCam(c,1/60,16/9);assert.ok(c.camHeight>height&&c.camHeight<height+.05);g.setStarted(false);
});
test('V5 quick race launches from the menu and its builder returns to the paused setup',()=>{
  g.openMainMenu();g.chooseLobbyMode('quick');g.garage.quickPlayers=1;g.garage.route='coast';assert.equal(g.launchLobby(),true);assert.equal(g.race.active,true);assert.equal(g.cars.length,1);
  g.openMainMenu();g.openLobbyBuilder();assert.equal(g.state.started,false);assert.equal(g.garage.menuBuilding,true);g.closeMap();assert.equal(g.garage.menuBuilding,false);assert.equal(context.document.getElementById('overlay').style.display,'flex');
  g.openLobbyBuilder();g.race.cps=[];g.prepareCourse();assert.equal(g.launchLobby(true),false);assert.equal(g.state.started,false);
  g.presetCourse('tunnel');assert.equal(g.launchLobby(true),true);assert.equal(g.race.active,true);assert.ok(g.race.name.includes('Tunnel'));g.openMainMenu();
});
test('V5.1 engine banks retain licensed provenance and use a single stable load signal path',async()=>{
  for(const old of ['VQ35Recorded','MustangRecorded','RB25','2JZ','Rotary','LS9','ZB'])assert.equal(g.chooseInitialEngine(old),g.JDM_CARS[g.garage.ids[0]].engine);
  assert.equal(g.chooseInitialEngine('JZ2Tour'),'JZ2Tour');
  g.setStarted(true);g.initAudio();const manifest=JSON.parse(fs.readFileSync(new URL('../Drift Drive/audio/jdm/manifest.json',import.meta.url)));assert.equal(manifest.length,16);
  for(const item of manifest){const bytes=fs.readFileSync(new URL('../Drift Drive/audio/jdm/'+item.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(item.license,'MIT');assert.ok(item.reference_rpm>700);assert.equal(item.cycles,8);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(Buffer.from(context.window.ENGINE_SOUNDS[item.engine][item.layer],'base64')).digest('hex'),item.sha256);}
  for(const key of ['JZ1Street','RB26Tour','JZ2Tour','RotaryTour']){
    g.selectEngine(key);await g.loadEngine(key);const c=g.cars[0],bank=context.window.ENGINE_SOUNDS[key];assert.equal(c.au.layers.length,4);assert.equal(bank.preferred,true);
    c.rpm=6500;c.inp.thr=1;c.inp.clutch=false;c.shiftT=0;g.updAudio(c,1/60,30,0);const loaded=c.au.loadGain.gain.value;
    c.inp.thr=0;g.updAudio(c,1/60,30,0);assert.ok(c.au.loadGain.gain.value<loaded);assert.equal(c.au.coastGain.gain.value,0);
    assert.equal(bank.phaseLocked,true);assert.equal(bank.seamless,true);assert.equal(new Set(c.au.layers.map(l=>l.src.startedAt)).size,1);for(const layer of c.au.layers)assert.ok(Math.abs(layer.src.playbackRate.value*layer.ref-c.au.audioRPM)<1e-6);
  }g.setStarted(false);
});
test('V5 radio starts on first mode entry and respects an explicit Off choice on resume',async()=>{
  g.openMainMenu();await g.setRadioStation('off');g.radio.autoStarted=false;g.radio.userSelected=false;g.startMode(false);
  await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(g.radio.station,'lofi');assert.equal(g.radio.autoStarted,true);
  await g.setRadioStation('off');g.openMainMenu();g.startMode(false);assert.equal(g.radio.station,'off');
  g.radio.autoStarted=false;g.startMode(false);assert.equal(g.radio.station,'off');g.openMainMenu();
});

test('V5.1 chase cameras retain a bounded distance at highway speed and reset every view',()=>{
  g.setSplit(false);const c=g.cars[0];g.placeCar(c,0,0,0);c.y=10;c.gfx=0;c.gfz=0;c.vwx=70;c.vwz=0;
  for(const mode of [0,1])for(const fps of [30,60,120]){
    c.camMode=mode;c.camSnap=true;
    for(let n=0;n<fps*2;n++){c.x+=70/fps;g.updCam(c,1/fps,16/9);const d=Math.hypot(c.cam.position.x-c.x,c.cam.position.z-c.z);assert.ok(d<=6.51);assert.ok(c.cam.position.y>=c.y+1.9);assert.ok(c.cam.fov<=61);}
  }
  for(const mode of [3,2,0,1,2,3]){c.camMode=mode;c.camSnap=false;g.updCam(c,1/60,16/9);assert.equal(c.cameraMode,mode);assert.ok(Math.hypot(c.cam.position.x-c.x,c.cam.position.z-c.z)<6.51);}
  for(const mode of [2,3]){c.camMode=mode;c.camSnap=true;g.updCam(c,1/60,16/9);const p=c.cam.position.clone(),q=c.cam.quaternion.clone();c.root.rotation.set(.4,.8,-.3);c.susp=.2;c.fxImpact=1;g.updCam(c,1/60,16/9);assert.ok(c.cam.position.distanceTo(p)<1e-8);assert.ok(c.cam.quaternion.angleTo(q)<1e-7);c.roadGradeX=.12;c.camSnap=true;g.updCam(c,1/60,16/9);assert.ok(Math.abs(c.cameraAim.y-c.cam.position.y-2.4)<1e-8);c.roadGradeX=0;}
});
