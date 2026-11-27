// The only engine-sound source: live physical simulation with adaptive recovery.
export function createLiveEngineAudio(context,{onReady=()=>{},onError=()=>{},onState=()=>{},lowPower=false}={}){
  const voices=new Map(),states=new Map();
  let worker,node,ready=false,failed=false,disposed=false,generation=0,timer,retryTimer;
  let phase='starting',quality=lowPower?1:0,target=3,badSeconds=0,attempts=0,lastRelax=-10,lastError=null;
  const stateChanged=()=>onState({phase,quality,error:lastError?.message||''});
  const mix=(live)=>{for(const voice of voices.values()){
    voice.live.gain.setTargetAtTime(live?1:0,context.currentTime,.06);
  }};
  const close=()=>{
    clearTimeout(timer);
    if(worker){worker.onmessage=worker.onerror=null;worker.terminate();worker=null;}
    if(node){node.onprocessorerror=null;node.port.onmessage=null;node.port.postMessage({type:'stop'});node.disconnect();node=null;}
  };
  const sync=()=>{if(!worker||!node||failed)return;worker.postMessage({type:'active',slots:[...voices.keys()]});for(const [slot,value]of states)worker.postMessage({type:'state',slot,value});};
  const fail=(error,recover=true)=>{
    if(failed||disposed)return;ready=false;failed=true;phase='error';lastError=error;generation++;close();mix(false);onError(error);stateChanged();
    if(recover&&attempts<2){attempts++;retryTimer=setTimeout(()=>{retryTimer=null;if(!disposed)start();},500*Math.pow(2,attempts-1));}
  };
  const manager={
    get ready(){return ready;},get failed(){return failed;},get phase(){return phase;},get quality(){return quality;},get error(){return lastError?.message||'';},
    attach(slot,bus){
      if(disposed||slot<0||slot>1)return;
      manager.detach(slot);const live=context.createGain();live.gain.value=0;live.connect(bus);voices.set(slot,{live});
      if(node)node.connect(live,slot);if(ready){live.gain.setTargetAtTime(1,context.currentTime,.06);}sync();
    },
    detach(slot){const voice=voices.get(slot);if(!voice)return;if(node)try{node.disconnect(voice.live);}catch{}voice.live.disconnect();voices.delete(slot);states.delete(slot);sync();},
    update(slot,value){if(disposed)return;states.set(slot,value);if(worker&&node&&!failed)worker.postMessage({type:'state',slot,value});},
    retry(){if(disposed)return false;clearTimeout(retryTimer);retryTimer=null;attempts=0;start();return true;},
    dispose(){disposed=true;generation++;clearTimeout(retryTimer);close();for(const voice of voices.values())voice.live.disconnect();voices.clear();states.clear();context.removeEventListener?.('statechange',resume);}
  };
  const resume=()=>{if(context.state==='running'&&failed&&!retryTimer)manager.retry();};
  context.addEventListener?.('statechange',resume);
  async function start(){
    if(disposed)return;
    close();const id=++generation;ready=false;failed=false;phase='starting';lastError=null;badSeconds=0;target=3;mix(false);stateChanged();
    try{
      if(!context.audioWorklet||typeof Worker==='undefined'||typeof AudioWorkletNode==='undefined'){
        fail(new Error('Live engine audio needs the desktop app or a supported secure browser.'),false);return;
      }
      await context.audioWorklet.addModule(new URL('./engine-sim/output-worklet.js',import.meta.url));
      if(id!==generation||disposed)return;
      node=new AudioWorkletNode(context,'dd-engine-output',{numberOfInputs:0,numberOfOutputs:2,outputChannelCount:[1,1]});
      node.onprocessorerror=()=>{if(id===generation)fail(new Error('The audio processor stopped. Retrying the live engine.'));};
      for(const [slot,voice]of voices)node.connect(voice.live,slot);
      worker=new Worker(new URL('./engine-sim/worker.js',import.meta.url),{type:'module'});
      worker.onerror=event=>{if(id===generation)fail(new Error(event.message||'The live engine worker could not start.'));};
      const channel=new MessageChannel();
      worker.onmessage=({data})=>{
        if(id!==generation)return;
        if(data.type==='error')fail(new Error(data.message));
        else if(data.type==='quality'){quality=data.quality;stateChanged();}
        else if(data.type==='ready'){sync();node.port.postMessage({type:'bind',port:channel.port2},[channel.port2]);}
      };
      node.port.onmessage=({data})=>{
        if(id!==generation)return;
        if(data.type==='audible'){
          ready=true;failed=false;phase='live';clearTimeout(timer);mix(true);stateChanged();
          onReady();
        }else if(data.type==='stats'&&context.state==='running'){
          manager.stats={...data,quality,target};
          if(data.underruns>0){
            target=Math.min(6,target+1);node.port.postMessage({type:'buffer',target});
            if(quality<2&&context.currentTime-lastRelax>2){lastRelax=context.currentTime;worker.postMessage({type:'relax'});}
          }
          badSeconds=data.underruns>3?badSeconds+1:Math.max(0,badSeconds-1);
          if(quality===2&&badSeconds>=8)fail(new Error('Audio is overloaded. The live engine will retry at a lighter setting.'));
        }
      };
      worker.postMessage({type:'init',rate:context.sampleRate,quality,port:channel.port1},[channel.port1]);
      const startedAt=context.currentTime;
      const checkStart=()=>{
        if(id!==generation||ready||disposed)return;
        if(context.state==='running'&&context.currentTime-startedAt>30)fail(new Error('Live engine startup timed out. Retrying.'));
        else timer=setTimeout(checkStart,1000);
      };timer=setTimeout(checkStart,1000);
    }catch(error){if(id===generation)fail(error);}
  }
  start();return manager;
}
