"""Prepare actual headless Engine Simulator captures and a credited RX-7 recording.
Usage: python tools/prepare-captured-audio.py --captures-root DIR --rotary-source FILE
Requires NumPy, SciPy and FFmpeg. Capture commands/configuration: tools/engine-sim-exporter/.
"""
import argparse,base64,csv,hashlib,json,pathlib,re,subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt,resample_poly,find_peaks
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'Drift Drive/audio/jdm'
KINDS={'JZ1Street':'1JZ','RB26Tour':'RB26','JZ2Tour':'2JZ'}
ROTARY_URL='https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--captures-root',type=pathlib.Path,required=True);ap.add_argument('--rotary-source',type=pathlib.Path,required=True);args=ap.parse_args()
 for f in OUT.glob('*.wav'):
  if f.name!='engine-sim-smooth39.wav':f.unlink()
 banks={};manifest=[]
 def store(bank,key,layer,rpm,load,y,sr,provenance):
  y=np.asarray(y,dtype=float);y-=y.mean();y=sosfilt(butter(2,30,btype='highpass',fs=sr,output='sos'),y)
  if sr!=32000:y=resample_poly(y,32000,sr)
  # Shared conservative headroom; runtime matching is cached once per decoded clip.
  peak=max(abs(y));y*=min(1,.78/max(peak,1e-9));tmp=OUT/'capture-temp.wav';wavfile.write(tmp,32000,(y*32767).astype(np.int16))
  path=OUT/(key.lower()+'-'+layer+'.ogg');subprocess.run(['ffmpeg','-v','error','-y','-i',str(tmp),'-c:a','libvorbis','-q:a','5',str(path)],check=True);tmp.unlink()
  data=path.read_bytes();bank[layer]=base64.b64encode(data).decode();bank['refs'][layer]=rpm;bank['layers'].append(dict(key=layer,rpm=rpm,load=load));manifest.append(dict(engine=key,layer=layer,file=path.name,reference_rpm=rpm,load=load,seconds=len(y)/32000,sha256=sha(data),**provenance))
 for key,label in KINDS.items():
  bank=dict(label=label+' · Engine Simulator captures',captured=True,recorded=False,preferred=True,sourceKind='engine-simulator-capture',seamless=False,phaseLocked=False,pitchMin=.25,pitchMax=12,refs={},layers=[])
  rawdir=args.captures_root/('dyno-'+key);stats={}
  for line in (args.captures_root/('dyno-'+key+'.log')).read_text().splitlines():
   if line.startswith('CAPTURE '):
    _,rpm,thr,mean,lo,hi=line.split();stats[int(rpm),int(thr)]=dict(mean=float(mean),minimum=float(lo),maximum=float(hi))
  for f in sorted(rawdir.glob('*.wav')):
   m=re.search(r'_rpm_(\d+)_throttle_(\d+)_',f.name);rpm,thr=map(int,m.groups());r,x=wavfile.read(f);y=x.astype(float)/32768
   assert np.max(abs(x.astype(float)))<32767,'Clipped source '+str(f)
   telemetry=stats[rpm,thr];assert max(abs(telemetry['minimum']-rpm),abs(telemetry['maximum']-rpm))<rpm*.01
   store(bank,key,'r'+str(rpm)+('_on' if thr else '_off'),rpm,'on' if thr else 'off',y,r,dict(sourceKind='engine-simulator-capture',license='MIT',author='Ange Yaghi; Talhasarac exporter; Drift Drive capture configuration',source_page='https://github.com/Talhasarac/engine-sim-sound-exporter',source_commit='a548360a33c6ddcc28265ac08b71b8a5f514ed3c',source_file=f.name,source_sha256=sha(f.read_bytes()),throttle_percent=thr,measured_rpm=telemetry))
  bank['layers'].sort(key=lambda v:(v['rpm'],v['load']));banks[key]=bank
 # A real rotary recording is used because these piston-engine scripts are not a Wankel model.
 raw=args.rotary_source.read_bytes();x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(args.rotary_source),'-ar','16000','-ac','1','-f','f32le','-']),dtype='<f4').astype(float);sr=16000
 filtered=sosfilt(butter(3,[35,4000],btype='bandpass',fs=sr,output='sos'),x)
 bank=dict(label='13B · actual RX-7 recording',captured=False,recorded=True,preferred=True,sourceKind='real-car-recording',seamless=False,phaseLocked=False,pitchMin=.25,pitchMax=12,refs={},layers=[])
 for target in [1300,2300,3800,6500]:
  hop=640;n=4096;track=[]
  for i in range(0,len(x)-n,hop):
   y=filtered[i:i+n];spec=np.fft.rfft((y-y.mean())*np.hanning(n),n*2);ac=np.fft.irfft(spec*spec.conj());ac/=max(ac[0],1e-9);lo=int(sr*30/(target*1.25));hi=min(len(ac)-1,int(sr*30/(target*.8)));pk,_=find_peaks(ac[lo:hi]);pk+=lo
   if len(pk):best=pk[np.argmax(ac[pk])];track.append((sr/best*30,ac[best],np.sqrt(np.mean(y*y))))
   else:track.append((target,0,0))
  track=np.array(track);count=45;best=None
  for j in range(len(track)-count):
   w=track[j:j+count];median=np.median(w[:,0]);var=np.std(w[:,0])/median;q=np.median(w[:,1]);amp=np.median(w[:,2]);score=q-var*3-abs(np.log(median/target))*.2
   if amp>.035 and (best is None or score>best[0]):best=(score,j,median,var,q)
  _,j,rpm,var,quality=best;start=j*hop;end=start+count*hop;seg=x[start:end]
  # Time-warp the recorded waveform, correcting the measured rev sweep instead of resynthesizing it.
  f=np.interp(np.arange(len(seg))/sr,np.arange(count)*hop/sr,track[j:j+count,0]);phase=np.cumsum(f/rpm)/sr
  output_time=np.arange(0,phase[-1],1/sr);positions=np.interp(output_time,phase,np.arange(len(seg)));y=np.interp(positions,np.arange(len(seg)),seg)
  store(bank,'RotaryTour','r'+str(target),float(rpm),'any',y,sr,dict(sourceKind='real-car-recording',license='CC BY 3.0',author='Taz Ringer',source_page=ROTARY_URL,source_sha256=sha(raw),source_start_seconds=start/sr,source_excerpt_seconds=len(seg)/sr,rpm_is_estimated=True,pitch_stabilized=True,tracking_variation=float(var),tracking_quality=float(quality)))
 banks['RotaryTour']=bank
 for key,bank in banks.items():
  (ROOT/'Drift Drive'/('jdm-bank-'+key+'.js')).write_text('// Captured engine audio; provenance: audio/jdm/CREDITS.md\nObject.assign(window.ENGINE_SOUNDS,'+json.dumps({key:bank},separators=(',',':'))+');\n')
 (ROOT/'Drift Drive/jdm-audio.js').write_text("// Capture bank registry. Each bank is loaded by a classic script for local-file compatibility.\nfor(const [key,bank] of Object.entries(window.ENGINE_SOUNDS))bank.deprecated=!['JZ1Street','RB26Tour','JZ2Tour','RotaryTour'].includes(key);\nfor(const [old,current] of Object.entries({RB25:'RB26Tour','2JZ':'JZ2Tour',Rotary:'RotaryTour'}))window.ENGINE_SOUNDS[old]={...window.ENGINE_SOUNDS[current],deprecated:true};\n")
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Prepared',len(manifest),'clips from full simulator runs / actual RX-7 audio.')
if __name__=='__main__':main()
