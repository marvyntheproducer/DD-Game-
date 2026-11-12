"""Offline crank-angle pulse banks using Engine Simulator's MIT-licensed exhaust IR.
Not the Community Edition executable or its full gas/combustion solver.
Usage: python tools/prepare-sim-audio.py
Requires numpy and scipy. All source assets are checked in.
"""
import base64, hashlib, json, pathlib, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'Drift Drive/audio/jdm'
FS=32000
CONFIG={
 'JZ1Street':('1JZ street swap · pulse synthesis',6,.0029,.58),
 'RB26Tour':('RB26 · pulse synthesis',6,.0022,.48),
 'JZ2Tour':('2JZ · pulse synthesis',6,.0036,.72),
 'RotaryTour':('13B twin rotor · pulse synthesis',4,.0020,.62),
}
def main():
 rate,raw=wavfile.read(OUT/'engine-sim-smooth39.wav');ir=raw.astype(float)/32768
 # Engine Simulator Synthesizer::initializeImpulseResponse uses at most 10000 samples.
 ir=resample_poly(ir[:10000],FS,rate);ir/=max(np.sum(abs(ir)),1e-9)
 manifest=[];banks={}
 for key,(label,events,decay,conv) in CONFIG.items():
  bank=dict(label=label,recorded=False,synthesized=True,preferred=True,seamless=True,phaseLocked=True,refs={},pitchMin=.65,pitchMax=1.65)
  for layer,rpm in zip(['idle','low','mid','high'],[800,2200,4000,6500]):
   # An integer number of 720-degree cycles; exact RPM follows the integer sample count.
   cycles=8;n=round(FS*120/rpm*cycles);actual=120*FS*cycles/n;t=np.arange(n)/FS
   pressure=np.zeros(n)
   for event in range(events):
    # Fractional runner delays produce a small, repeatable cylinder character, no random misfire.
    phase=(t*actual/120-event/events)%1;age=phase*120/actual
    runner=1+.018*np.cos(event*2*np.pi/events)
    pressure+=runner*(1-np.exp(-age/.00065))*np.exp(-age/decay)
   pressure-=pressure.mean()
   # Adapted audio path from Ange Yaghi's Synthesizer::renderAudio:
   # remove DC, blend pressure and derivative, convolve with the supplied exhaust response.
   derivative=(np.roll(pressure,-1)-np.roll(pressure,1))*.5*FS*decay
   excitation=.84*pressure+.16*derivative
   spectrum=np.fft.rfft(excitation);response=np.fft.rfft(ir,n)
   signal=np.fft.irfft(spectrum*((1-conv)+conv*response*2),n)
   freq=np.fft.rfftfreq(n,1/FS)
   signal=np.fft.irfft(np.fft.rfft(signal)*(freq/np.sqrt(freq**2+28**2))/(1+(freq/(4600 if events==6 else 6000))**6),n)
   signal-=signal.mean();signal*=min(.16/max(np.sqrt(np.mean(signal**2)),1e-9),.70/max(abs(signal)))
   wav=OUT/(key.lower()+'-'+layer+'.wav');file=wav
   wavfile.write(wav,FS,(signal*32767).astype(np.int16))
   data=file.read_bytes();bank[layer]=base64.b64encode(data).decode();bank['refs'][layer]=actual
   manifest.append(dict(engine=key,layer=layer,file=file.name,license='MIT',author='Ange Yaghi (exhaust IR and audio-path adaptation); Drift Drive (pulse generator)',source_page='https://github.com/ange-yaghi/engine-sim',source_commit='85f7c3b959a908ed5232ede4f1a4ac7eafe6b630',reference_rpm=actual,cycles=cycles,events_per_720_degrees=events,sha256=hashlib.sha256(data).hexdigest()))
  banks[key]=bank
 code='// Engine Simulator exhaust IR + original crank-angle pulse synthesis. See audio/jdm/CREDITS.md.\n'
 code+='for(const bank of Object.values(window.ENGINE_SOUNDS))bank.deprecated=true;\nObject.assign(window.ENGINE_SOUNDS,'+json.dumps(banks,separators=(',',':'))+');\n'
 code+="for(const [old,current] of Object.entries({RB25:'RB26Tour','2JZ':'JZ2Tour',Rotary:'RotaryTour'}))window.ENGINE_SOUNDS[old]={...window.ENGINE_SOUNDS[current],deprecated:true};\n"
 (ROOT/'Drift Drive/jdm-audio.js').write_text(code);(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Generated',len(manifest),'phase-locked steady engine loops')
if __name__=='__main__':main()
