"""Rebuild licensed V5 engine excerpts. Requires numpy, scipy and FFmpeg.
Pass a directory containing the four source recordings (or --download).
RPM references are spectral gameplay estimates, not verified dyno telemetry.
"""
import argparse,base64,hashlib,json,pathlib,subprocess,urllib.request
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES={
 'JZ1Street':dict(source='silvia.opus',url='https://upload.wikimedia.org/wikipedia/commons/6/65/Nissan_Silvia_-_engine_and_exhaust_sound_%28YouTube_ugy3NWCI7H8%29.opus',page='https://commons.wikimedia.org/wiki/File:Nissan_Silvia_-_engine_and_exhaust_sound_(YouTube_ugy3NWCI7H8).opus',author='NISSAN CARS',license='CC BY 3.0',label='1JZ street swap · Silvia recording',clips=[(31.4,941),(30.2,2119),(23.6,4848),(53.4,6667)]),
 'RB26Tour':dict(source='skyline.opus',url='https://upload.wikimedia.org/wikipedia/commons/d/d6/Nissan_Skyline_GT-R_-_engine_and_exhaust_sound_%28YouTube_NpqxDM7pejs%29.opus',page='https://commons.wikimedia.org/wiki/File:Nissan_Skyline_GT-R_-_engine_and_exhaust_sound_(YouTube_NpqxDM7pejs).opus',author='LowFps',license='CC BY 3.0',label='RB26 touring · Skyline GT-R recording',clips=[(413,952),(15,2424),(47.8,4267),(245.2,5079)]),
 'JZ2Tour':dict(source='supra-dyno.mp3',url='https://cdn.freesound.org/previews/496/496171_1784475-hq.mp3',page='https://freesound.org/people/editboy23/sounds/496171/',author='editboy23',license='CC0 1.0',label='2JZ touring · Supra dyno recording',clips=[(13.2,1111),(.4,2222),(10,4051),(22.4,5614)]),
 'RotaryTour':dict(source='rotary.opus',url='https://upload.wikimedia.org/wikipedia/commons/3/35/Mazda_RX-7_-_engine_and_exhaust_sound_%28YouTube_4z0y1H2REvE%29.opus',page='https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus',author='Taz Ringer',license='CC BY 3.0',label='13B touring · RX-7 recording',clips=[(207.4,1315),(186,2182),(140,3934),(242.2,6761)])
}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('source_dir');parser.add_argument('--download',action='store_true');args=parser.parse_args()
 src=pathlib.Path(args.source_dir);src.mkdir(parents=True,exist_ok=True)
 out=ROOT/'Drift Drive/audio/jdm';out.mkdir(parents=True,exist_ok=True);banks={};manifest=[]
 for key,cfg in SOURCES.items():
  source=src/cfg['source']
  if args.download and not source.exists():
   with urllib.request.urlopen(urllib.request.Request(cfg['url'],headers={'User-Agent':'DriftDriveDevelopment/5.0'}),timeout=60) as r:source.write_bytes(r.read())
  original=source.read_bytes();pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-ac','1','-ar','32000','-f','f32le','-']),np.float32)
  bank=dict(label=cfg['label'],recorded=True,preferred=True,refs={},pitchMin=.65,pitchMax=1.65)
  for layer,(start,rpm) in zip(['idle','low','mid','high'],cfg['clips']):
   y=pcm[round(start*32000):round((start+.512)*32000)].astype(float)
   y=sosfilt(butter(3,[65,7000],btype='bandpass',fs=32000,output='sos'),y);y-=y.mean()
   # Remove wind/DC and match perceived level without hard clipping.
   y*=min(.13/max(np.sqrt(np.mean(y*y)),1e-8),.72/max(abs(y).max(),1e-8))
   # Circular overlap removes the abrupt field-recording wrap.
   n=384;t=np.linspace(0,1,n);y=np.concatenate([y[-n:]*(1-t)+y[:n]*t,y[n:-n]])
   # Match endpoints as well as their neighbourhood before runtime seam smoothing.
   correction=(y[-1]-y[0])*.5;y[:64]+=correction*np.linspace(1,0,64);y[-64:]-=correction*np.linspace(0,1,64)
   file=out/(key.lower()+'-'+layer+'.ogg')
   subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','32000','-ac','1','-i','pipe:0','-c:a','libvorbis','-q:a','5',str(file)],input=y.astype(np.float32).tobytes(),check=True)
   data=file.read_bytes();bank[layer]=base64.b64encode(data).decode();bank['refs'][layer]=rpm
   manifest.append(dict(engine=key,layer=layer,file=file.name,start_seconds=start,source_excerpt_seconds=.512,loop_seconds=len(y)/32000,reference_rpm_estimate=rpm,author=cfg['author'],source_page=cfg['page'],source_url=cfg['url'],source_sha256=hashlib.sha256(original).hexdigest(),license=cfg['license'],sha256=hashlib.sha256(data).hexdigest()))
  banks[key]=bank
 code="// Licensed real JDM engine excerpts; sources and changes: audio/jdm/CREDITS.md\n"
 code+="for(const bank of Object.values(window.ENGINE_SOUNDS))bank.deprecated=true;\nObject.assign(window.ENGINE_SOUNDS,"+json.dumps(banks,separators=(',',':'))+");\n"
 code+="for(const [old,current] of Object.entries({RB25:'RB26Tour','2JZ':'JZ2Tour',Rotary:'RotaryTour'}))window.ENGINE_SOUNDS[old]={...window.ENGINE_SOUNDS[current],deprecated:true};\n"
 (ROOT/'Drift Drive/jdm-audio.js').write_text(code)
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 lines=['# V5 JDM engine recordings','', 'No CarX sound banks or game assets are included.','']
 for key,c in SOURCES.items():lines += ['## '+c['label'],'','- Creator: '+c['author'],'- Source: '+c['page'],'- Media: '+c['url'],'- License: '+c['license']+' — '+('https://creativecommons.org/licenses/by/3.0/' if c['license'].startswith('CC BY') else 'https://creativecommons.org/publicdomain/zero/1.0/'),'- Excerpts (seconds): '+', '.join(str(t) for t,_ in c['clips']),'']
 lines += ['Changes: short excerpts, mono 32 kHz resampling, 65 Hz–7 kHz filtering, DC removal, RMS/peak level matching, circular seam overlap, Vorbis encoding and RPM/load/camera mixing in the player. The Silvia source is a 1JZ-swapped S15 used for a clearly labelled S14 gameplay swap. Reference RPMs are spectral estimates; field recordings are not validated steady-state dyno banks. Some source distortion/ambience remains; no exact factory or CarX sound match is claimed.','', 'The public source pages state these licenses; recordings are credited without implying creator endorsement. manifest.json records file/source hashes and excerpt windows. tools/prepare-jdm-audio.py reproduces the edits.']
 (out/'CREDITS.md').write_text('\n'.join(lines)+'\n')
 print('Built',len(manifest),'licensed engine loops;',sum((out/m['file']).stat().st_size for m in manifest),'bytes.')
if __name__=='__main__':main()
