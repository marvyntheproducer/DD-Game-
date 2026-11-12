"""Generate three original, seamless cruise-radio loops. Requires numpy + ffmpeg.
No external music samples, melodies, or recordings are used.
"""
from pathlib import Path
import numpy as np, subprocess, wave, base64, json, hashlib
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'Drift Drive/audio/radio';OUT.mkdir(parents=True,exist_ok=True)
SR=22050;BPM=72;BEAT=60/BPM;BARS=16;DURATION=BARS*4*BEAT;N=round(DURATION*SR)
def freq(m):return 440*2**((m-69)/12)
def add(bus,signal,start):
 start=round(start*SR);idx=(np.arange(len(signal))+start)%N;np.add.at(bus,idx,signal)
def note(m,dur,amp=.05,kind='keys'):
 t=np.arange(round(dur*SR))/SR;f=freq(m)
 if kind=='pad':
  y=(np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*f*1.002*t)+.15*np.sin(2*np.pi*f*2*t));env=np.sin(np.pi*np.minimum(t/dur,1))**1.5
 else:
  y=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2*t)*np.exp(-t*3)+.05*np.sin(2*np.pi*f*3*t)*np.exp(-t*6);env=np.minimum(1,t/.014)*np.exp(-t*(1.8 if kind=='keys' else 3.8))*np.minimum(1,(dur-t)/.04)
 return y*env*amp
chords=[[48,55,58,62,65],[53,60,64,67,69],[46,53,57,60,64],[51,58,62,65,69]]
for station in ['lofi','ambient','jazz']:
 rng=np.random.default_rng({'lofi':1701,'ambient':1702,'jazz':1703}[station]);mix=np.zeros(N)
 for bar in range(BARS):
  chord=chords[(bar//2)%4];at=bar*4*BEAT
  if station=='ambient':
   for m in chord[1:]:add(mix,note(m+12,8*BEAT,.026,'pad'),at)
   if bar%2==0:add(mix,note(chord[-1]+12,5*BEAT,.022,'keys'),at+1.5*BEAT)
  else:
   for beat in ([0,2.5] if station=='lofi' else [0,.75,2,3.5]):
    for j,m in enumerate(chord[1:]):add(mix,note(m+12,2.5*BEAT,.026,'keys'),at+beat*BEAT+j*.012)
   for beat in range(4):add(mix,note(chord[0]-(12 if beat%2 else 0),.8*BEAT,.065,'bass'),at+beat*BEAT)
   for beat in ([0,2] if station=='lofi' else [0,2.5]):
    t=np.arange(round(.23*SR))/SR;phase=2*np.pi*(45*t+42*.025*(1-np.exp(-t/.025)));kick=np.sin(phase)*np.exp(-t*23)*.08;add(mix,kick,at+beat*BEAT)
   for beat in [1,3]:
    t=np.arange(round(.17*SR))/SR;noise=rng.normal(0,1,len(t));snare=np.convolve(noise,[.25,.5,.25],mode='same')*np.exp(-t*33)*.025;add(mix,snare,at+beat*BEAT)
   for eighth in range(8):
    t=np.arange(round(.04*SR))/SR;noise=rng.normal(0,1,len(t));hat=(noise-np.roll(noise,1))*np.exp(-t*110)*(.004 if station=='lofi' else .006);swing=.09 if eighth%2 else 0;add(mix,hat,at+(eighth/2+swing)*BEAT)
   # A sparse, original improvised phrase drawn from each chord.
   if bar%4 in [1,3]:
    for step,m in enumerate([chord[-1]+12,chord[2]+12,chord[3]+12]):add(mix,note(m,.9*BEAT,.018,'keys'),at+(1+step*.75)*BEAT)
 mix=np.tanh(mix*1.5);peak=np.max(np.abs(mix));mix=mix/max(peak,.001)*.55
 # Circular note placement preserves long pad tails across the loop boundary.
 wav=OUT/(station+'.wav');ogg=OUT/(station+'.ogg')
 with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-v','error','-i',str(wav),'-c:a','libvorbis','-q:a','3',str(ogg),'-y'],check=True);wav.unlink()
tracks={name:{'title':title,'seconds':DURATION,'data':base64.b64encode((OUT/(name+'.ogg')).read_bytes()).decode()} for name,title in [('lofi','Sakura FM · After Hours'),('ambient','Shiosai Air · Slow Tide'),('jazz','Night Lane · Quiet Corners')]}
(ROOT/'Drift Drive/cruise-radio.js').write_text('// Original algorithmic cruise-radio music. See audio/radio/CREDITS.md.\nwindow.CRUISE_RADIO='+json.dumps(tracks,separators=(',',':'))+';\n')
(OUT/'manifest.json').write_text(json.dumps([{'file':name+'.ogg','sha256':hashlib.sha256((OUT/(name+'.ogg')).read_bytes()).hexdigest(),'seconds':DURATION} for name in tracks],indent=2)+'\n')
print('Generated original stations:',', '.join(tracks));print('Total Ogg bytes:',sum(p.stat().st_size for p in OUT.glob('*.ogg')))
