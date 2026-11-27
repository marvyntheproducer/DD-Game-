import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import Core from '../Drift Drive/engine-sim/core.js';
import {createHash} from 'node:crypto';

test('shipped WASM and stripped source match their reproducible build manifest',async()=>{
  const manifest=JSON.parse(await fs.readFile(new URL('../tools/engine-runtime/build-manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.compiler,'Emscripten 4.0.20');
  for(const [file,expected]of Object.entries(manifest.files)){
    const bytes=await fs.readFile(new URL('../'+file,import.meta.url));
    const normalized=file.endsWith('.wasm')?bytes:Buffer.from(bytes.toString('utf8').replace(/\r\n?/g,'\n'));
    assert.equal(createHash('sha256').update(normalized).digest('hex'),expected,file);
  }
});

function render(m,slot,blocks=32,rate=44100){
  const data=new Float32Array(blocks*1024);
  for(let i=0;i<blocks;i++){
    const p=m._dd_render(slot,1024,rate);assert.ok(p);data.set(m.HEAPF32.subarray(p/4,p/4+1024),i*1024);
  }return data;
}
test('live WASM burns fuel, develops cylinder pressure and follows game RPM independently for both players',async()=>{
  const m=await Core();m._dd_init(0);m._dd_init(1);
  m._dd_state(0,2800,.8,.9,7,0);m._dd_state(1,6100,1,1,12,0);
  const start=performance.now(),a=render(m,0,48),b=render(m,1,48,48000);
  for(const [slot,rpm,data]of [[0,2800,a],[1,6100,b]]){
    assert.ok(Math.abs(m._dd_metric(slot,0)-rpm)<1);
    assert.ok(m._dd_metric(slot,1)>15000);assert.ok(m._dd_metric(slot,2)>30);
    assert.ok(m._dd_metric(slot,3)>0);assert.ok(m._dd_metric(slot,4)>500000);
    assert.equal(m._dd_metric(slot,5),0);assert.ok(data.every(Number.isFinite));
    assert.ok(data.some(x=>Math.abs(x)>.025));assert.ok(data.every(x=>Math.abs(x)<=.9));
  }
  assert.notDeepEqual(a.slice(-1024),b.slice(-1024));
  const before=m._dd_metric(0,3);m._dd_state(0,2800,0,0,0,1);render(m,0,32);const settled=m._dd_metric(0,3);render(m,0,32);
  assert.ok(settled>=before);assert.ok(m._dd_metric(0,3)-settled<(settled-before)*.1+1e-8,'ignition cut stops fresh fuel burning');
  m._dd_destroy(1);assert.equal(m._dd_metric(1,0),0);assert.ok(m._dd_metric(0,0)>2700);
  m._dd_init(1);assert.equal(m._dd_metric(1,1),0);m._dd_destroy(0);m._dd_destroy(1);
  console.log('Live WASM two-player physical audio benchmark:',Math.round(performance.now()-start),'ms for 3.7 seconds of combined rendered audio');
});

test('live engine rejects oversized blocks and keeps malformed input finite through boost and redline sweeps',async()=>{
  const m=await Core();assert.equal(m._dd_init(-1),0);assert.equal(m._dd_init(2),0);m._dd_init(0);
  assert.equal(m._dd_render(0,2049,44100),0);assert.equal(m._dd_render(0,100,NaN),0);
  for(const [rpm,throttle,boost]of [[NaN,Infinity,-1],[650,0,0],[9000,1,30],[3200,.5,8],[1000,0,0]]){
    m._dd_state(0,rpm,throttle,1,boost,0);assert.ok(render(m,0,24).every(Number.isFinite));assert.equal(m._dd_metric(0,5),0);
  }m._dd_destroy(0);
});

test('live quality reductions preserve combustion, RPM and finite audio without resetting the engine',async()=>{
  const m=await Core();m._dd_init(0);m._dd_state(0,7200,1,1,20,0);render(m,0,24);
  let ticks=m._dd_metric(0,1),fuel=m._dd_metric(0,3);
  for(const [tier,hz]of [[1,12000],[2,8000],[0,16000]]){
    assert.equal(m._dd_quality(0,tier),tier);assert.equal(m._dd_metric(0,6),hz);
    const audio=render(m,0,32);assert.ok(audio.every(Number.isFinite));assert.ok(audio.some(x=>Math.abs(x)>.01));
    assert.ok(m._dd_metric(0,1)>ticks);assert.ok(m._dd_metric(0,3)>fuel);assert.ok(Math.abs(m._dd_metric(0,0)-7200)<1);assert.equal(m._dd_metric(0,5),0);
    ticks=m._dd_metric(0,1);fuel=m._dd_metric(0,3);
  }m._dd_destroy(0);
});

test('audio worklet has bounded demand, isolated player channels and finite fade on starvation',async()=>{
  let Processor;
  const context={AudioWorkletProcessor:class{constructor(){this.port={postMessage:()=>{}};}},registerProcessor:(_name,p)=>{Processor=p;},sampleRate:44100,Float32Array,Number,Math};
  vm.runInNewContext(await fs.readFile(new URL('../Drift Drive/engine-sim/output-worklet.js',import.meta.url),'utf8'),context);
  const p=new Processor(),requests=[],port={start(){},postMessage:m=>requests.push(m)};
  p.port.onmessage({data:{type:'bind',port}});assert.equal(requests[0].count,3);
  for(let i=0;i<3;i++)port.onmessage({data:{type:'pcm',channels:[new Float32Array(1024).fill(.2),new Float32Array(1024).fill(-.4)]}});
  const outputs=[[new Float32Array(128)],[new Float32Array(128)]];
  p.process([],outputs);assert.ok(outputs[0][0].at(-1)>0);assert.ok(outputs[1][0].at(-1)<0);
  for(let i=0;i<40;i++)p.process([],outputs);
  assert.ok(p.queue.length<=4);assert.ok(p.pending<=3);assert.ok(outputs.every(ch=>ch[0].every(Number.isFinite)));assert.ok(Math.abs(outputs[0][0].at(-1))<.001);
  p.port.onmessage({data:{type:'stop'}});assert.equal(p.process([],outputs),false);
});
