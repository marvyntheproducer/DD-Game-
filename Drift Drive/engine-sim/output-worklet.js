// Only bounded PCM playback runs on the audio thread. All physics is in worker.js.
class EngineOutput extends AudioWorkletProcessor {
  constructor(){
    super();this.queue=[];this.pending=0;this.offset=0;this.frames=0;this.underruns=0;this.started=false;this.playing=false;this.last=[0,0];this.renderMs=0;this.gain=0;this.target=3;
    this.port.onmessage=({data})=>{
      if(data.type==='bind'){
        this.worker=data.port;
        this.worker.onmessage=({data})=>{
          if(data.type!=='pcm')return;
          this.pending=Math.max(0,this.pending-1);this.renderMs=Math.max(this.renderMs,data.renderMs||0);
          if(this.queue.length<6)this.queue.push(data.channels);
          if(!this.started&&this.queue.length>=2){this.started=true;this.playing=true;this.port.postMessage({type:'audible'});}
          if(this.started&&!this.playing&&this.queue.length>=2)this.playing=true;
        };
        this.worker.start();this.request();
      }else if(data.type==='buffer')this.target=Math.max(3,Math.min(6,data.target||3));
      else if(data.type==='stop'){this.stopped=true;this.queue.length=0;}
    };
  }
  request(){if(this.worker&&!this.stopped){const count=this.target-this.queue.length-this.pending;if(count>0){this.pending+=count;this.worker.postMessage({type:'need',count});}}}
  process(_inputs,outputs){
    if(this.stopped)return false;
    const length=outputs[0][0].length;
    for(let i=0;i<length;i++){
      const block=this.playing?this.queue[0]:null;
      if(!block&&this.playing){this.playing=false;this.underruns++;this.offset=0;}
      this.gain+=((block?1:0)-this.gain)*.012;
      for(let slot=0;slot<2;slot++){
        const sample=block?block[slot][this.offset]:this.last[slot]*.985;
        this.last[slot]=Number.isFinite(sample)?sample:0;
        outputs[slot][0][i]=this.last[slot]*this.gain;
      }
      if(block&&++this.offset>=block[0].length){this.queue.shift();this.offset=0;}
    }
    this.request();this.frames+=length;
    if(this.frames>=sampleRate){this.frames=0;this.port.postMessage({type:'stats',underruns:this.underruns,renderMs:this.renderMs});this.underruns=0;this.renderMs=0;}
    return true;
  }
}
registerProcessor('dd-engine-output',EngineOutput);
