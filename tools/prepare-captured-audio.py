"""Prepare actual headless Engine Simulator captures .
Usage: python tools/prepare-captured-audio.py --captures-root DIR
Requires NumPy, SciPy and FFmpeg. Capture commands/configuration: tools/engine-sim-exporter/.
"""
import argparse,base64,csv,hashlib,json,pathlib,re,subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt,resample_poly,find_peaks
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'Drift Drive/audio/jdm'
KINDS={'JZ2Tour':'2JZ'}
ROTARY_URL='https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--captures-root',type=pathlib.Path,required=True);args=ap.parse_args()
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
 for key,bank in banks.items():
  (ROOT/'Drift Drive'/('jdm-bank-'+key+'.js')).write_text('// Captured engine audio; provenance: audio/jdm/CREDITS.md\nObject.assign(window.ENGINE_SOUNDS,'+json.dumps({key:bank},separators=(',',':'))+');\n')
 (ROOT/'Drift Drive/jdm-audio.js').write_text("// Only 2JZ is shipped.\nfor(const key of Object.keys(window.ENGINE_SOUNDS))if(key!=='JZ2Tour')delete window.ENGINE_SOUNDS[key];\n")
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Prepared',len(manifest),'clips from full simulator runs.')
if __name__=='__main__':main()
