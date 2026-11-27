import Core from './core.js';

let core,port,rate=44100,active=new Set(),states=[null,null],stopped=false;
function state(slot,value){
  if(!value||slot<0||slot>1)return;
  states[slot]=value;
  if(core&&active.has(slot))core._dd_state(slot,value.rpm,value.throttle,value.load,value.boost,value.cut?1:0);
}
function setActive(slots){
  const next=new Set(slots.filter(s=>s===0||s===1));
  for(const slot of active)if(!next.has(slot))core._dd_destroy(slot);
  for(const slot of next)if(!active.has(slot)){
    core._dd_init(slot);active.add(slot);state(slot,states[slot]||{rpm:950,throttle:0,load:0,boost:0,cut:false});
    // Prime intake/fuel and exhaust pressure before the first audible block.
    for(let i=0;i<(active.size===1?24:4);i++)core._dd_render(slot,1024,rate);
  }
  active=next;
}
function render(count){
  if(stopped)return;
  for(let n=0;n<Math.min(4,count);n++){
    const channels=[new Float32Array(1024),new Float32Array(1024)],start=performance.now();
    for(const slot of active){
      const p=core._dd_render(slot,1024,rate);if(!p)throw new Error('Engine renderer returned no samples');
      channels[slot].set(core.HEAPF32.subarray(p/4,p/4+1024));
      if(core._dd_metric(slot,5)>0)throw new Error('Engine gas state became non-finite');
    }
    port.postMessage({type:'pcm',channels,renderMs:performance.now()-start},channels.map(c=>c.buffer));
  }
}
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      rate=data.rate;port=data.port;
      core=await Core();
      port.onmessage=({data})=>{try{if(data.type==='need')render(data.count);}catch(error){self.postMessage({type:'error',message:error.message});}};
      port.start();self.postMessage({type:'ready'});
    }else if(data.type==='state')state(data.slot,data.value);
    else if(data.type==='active'){if(core)setActive(data.slots);}
    else if(data.type==='stop'){stopped=true;for(const slot of active)core?._dd_destroy(slot);active.clear();self.close();}
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
