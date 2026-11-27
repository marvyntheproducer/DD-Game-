// Live physical engine audio with a captured-simulator fallback on unsupported devices.
export function createLiveEngineAudio(context,{onReady=()=>{},onFallback=()=>{}}={}){
  const voices=new Map(),states=new Map();let worker,node,ready=false,failed=false,disposed=false,timer;
  const fallback=error=>{
    if(failed||disposed)return;failed=true;ready=false;clearTimeout(timer);worker?.terminate();node?.disconnect();
    for(const voice of voices.values()){voice.live.gain.setTargetAtTime(0,context.currentTime,.04);voice.recorded.gain.setTargetAtTime(1,context.currentTime,.04);}
    onFallback(error);
  };
  const sync=()=>{if(!worker||!node||failed)return;worker.postMessage({type:'active',slots:[...voices.keys()]});for(const [slot,value]of states)worker.postMessage({type:'state',slot,value});};
  const manager={
    get ready(){return ready;},get failed(){return failed;},
    attach(slot,bus,recorded){
      if(disposed||failed||slot<0||slot>1)return;
      manager.detach(slot);const live=context.createGain();live.gain.value=0;live.connect(bus);voices.set(slot,{live,recorded});
      if(node)node.connect(live,slot);if(ready){live.gain.setTargetAtTime(1,context.currentTime,.06);recorded.gain.setTargetAtTime(0,context.currentTime,.06);}sync();
    },
    detach(slot){const voice=voices.get(slot);if(!voice)return;if(node)try{node.disconnect(voice.live);}catch{}voice.live.disconnect();voices.delete(slot);states.delete(slot);sync();},
    update(slot,value){if(disposed||failed)return;states.set(slot,value);if(worker&&node)worker.postMessage({type:'state',slot,value});},
    dispose(){disposed=true;clearTimeout(timer);for(const slot of [...voices.keys()])manager.detach(slot);node?.port.postMessage({type:'stop'});node?.disconnect();worker?.terminate();}
  };
  (async()=>{
    try{
      if(!context.audioWorklet||typeof Worker==='undefined'||typeof AudioWorkletNode==='undefined')throw new Error('Live engine audio is unavailable on this device.');
      await context.audioWorklet.addModule(new URL('./engine-sim/output-worklet.js',import.meta.url));
      node=new AudioWorkletNode(context,'dd-engine-output',{numberOfInputs:0,numberOfOutputs:2,outputChannelCount:[1,1]});node.onprocessorerror=()=>fallback(new Error('Live engine audio stopped.'));
      for(const [slot,voice]of voices)node.connect(voice.live,slot);
      worker=new Worker(new URL('./engine-sim/worker.js',import.meta.url),{type:'module'});worker.onerror=()=>fallback(new Error('Live engine worker failed.'));
      const channel=new MessageChannel();
      worker.onmessage=({data})=>{if(data.type==='error')fallback(new Error(data.message));else if(data.type==='ready'){sync();node.port.postMessage({type:'bind',port:channel.port2},[channel.port2]);}};
      node.port.onmessage=({data})=>{
        if(data.type==='audible'){
          ready=true;clearTimeout(timer);for(const voice of voices.values()){voice.live.gain.setTargetAtTime(1,context.currentTime,.06);voice.recorded.gain.setTargetAtTime(0,context.currentTime,.06);}onReady();
        }else if(data.type==='stats'&&context.state==='running'){
          manager.stats=data;
          if(data.underruns>3)fallback(new Error('This device cannot keep live engine audio running smoothly.'));
        }
      };
      worker.postMessage({type:'init',rate:context.sampleRate,port:channel.port1},[channel.port1]);
      const checkStart=()=>{if(ready||failed||disposed)return;if(context.state==='suspended')timer=setTimeout(checkStart,15000);else fallback(new Error('Live engine audio took too long to start.'));};
      timer=setTimeout(checkStart,15000);
    }catch(error){fallback(error);}
  })();
  return manager;
}
