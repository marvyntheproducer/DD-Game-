import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLiveEngineAudio} from '../Drift Drive/live-engine-audio.js';

const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixtures(failFirst=false){
  const saved=Object.fromEntries(['Worker','AudioWorkletNode','MessageChannel'].map(k=>[k,globalThis[k]]));
  const workers=[],nodes=[],events=new Map();let attempts=0;
  globalThis.MessageChannel=class{constructor(){this.port1={};this.port2={};}};
  globalThis.Worker=class{
    constructor(){attempts++;if(failFirst&&attempts===1)throw new Error('Simulated startup interruption');workers.push(this);this.quality=0;this.messages=[];}
    postMessage(m){this.messages.push(m);if(m.type==='init'){this.quality=m.quality;queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));}if(m.type==='relax'){this.quality++;queueMicrotask(()=>this.onmessage?.({data:{type:'quality',quality:this.quality}}));}}
    terminate(){this.stopped=true;}
  };
  globalThis.AudioWorkletNode=class{
    constructor(){nodes.push(this);this.port={postMessage:m=>{if(m.type==='bind')queueMicrotask(()=>this.port.onmessage?.({data:{type:'audible'}}));}};}
    connect(){}disconnect(){}
  };
  const gain=()=>({gain:{value:1,targets:[],setTargetAtTime(v){this.targets.push(v);}},connect(){},disconnect(){}});
  const context={audioWorklet:{async addModule(){}},currentTime:0,state:'running',sampleRate:44100,createGain:gain,
    addEventListener:(n,fn)=>events.set(n,fn),removeEventListener:n=>events.delete(n)};
  return {workers,nodes,context,gain,restore:()=>{for(const[k,v]of Object.entries(saved))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}};
}

test('a transient startup failure can retry while retaining car channels and latest inputs',async()=>{
  const f=fixtures(true),errors=[];let manager;
  try{
    manager=createLiveEngineAudio(f.context,{onError:e=>errors.push(e.message)});
    manager.attach(0,f.gain());manager.update(0,{rpm:4200,throttle:.8,load:.9,boost:8});
    await settle();assert.equal(manager.failed,true);assert.equal(errors.length,1);
    assert.equal(manager.retry(),true);await settle();assert.equal(manager.ready,true);assert.equal(manager.failed,false);
    const worker=f.workers.at(-1);assert.deepEqual(worker.messages.find(m=>m.type==='active').slots,[0]);
    assert.equal(worker.messages.find(m=>m.type==='state').value.rpm,4200);
  }finally{manager?.dispose();f.restore();}
});

test('brief underruns enlarge the queue and reduce live physics cost without permanently disabling live audio',async()=>{
  const f=fixtures(),errors=[];let manager;
  try{
    manager=createLiveEngineAudio(f.context,{onError:e=>errors.push(e.message)});manager.attach(0,f.gain());await settle();
    const node=f.nodes.at(-1);node.port.onmessage({data:{type:'stats',underruns:5,renderMs:30}});await settle();
    assert.equal(manager.ready,true);assert.equal(manager.failed,false);assert.equal(manager.quality,1);assert.deepEqual(errors,[]);
    assert.equal(manager.stats.underruns,5);assert.ok(f.workers[0].messages.some(m=>m.type==='relax'));
    f.context.currentTime=3;node.port.onmessage({data:{type:'stats',underruns:1,renderMs:20}});await settle();assert.equal(manager.quality,2);assert.equal(manager.ready,true);
  }finally{manager?.dispose();f.restore();}
});

test('disposing during asynchronous initialization prevents stale audio nodes from attaching',async()=>{
  const f=fixtures();try{const manager=createLiveEngineAudio(f.context);manager.dispose();await settle();assert.equal(f.nodes.length,0);assert.equal(f.workers.length,0);}finally{f.restore();}
});
