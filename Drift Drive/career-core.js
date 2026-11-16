/* Drift Drive solo career: bounded, versioned save and ghost data. No renderer. */
(function(root){'use strict';
 const chapters=[{name:'Local Reputation',contact:'Ren · Valley Works',intro:'A few clean runs. A few familiar faces. Make a name on your own roads.'},{name:'After Hours',contact:'Aya · Shiosai Crew',intro:'The coast is awake. Bring your build to the meet and see what it can do.'},{name:'Highland Invitation',contact:'Sora · Kurohana Works',intro:'Black rock, open sky. The invitation leads to a different side of the valley.'}];
 const events=[
  ['first-light','First Light',0,'time','garage',[0,1,5],false,0,0,'Welcome to the valley. Follow the markers and find your rhythm.'],
  ['sideways','Finding Your Angle',0,'drift','garage',[1,6,3],false,6,0,'A short loop of flowing corners. Carry six seconds of controlled slide.'],
  ['ren-run','Ren’s First Run',0,'duel','garage',[0,3,6,1],false,0,0,'Ren copies your tune. Win with your line, not a bigger engine.'],
  ['local-loop','Valley Calling',0,'circuit','garage',[0,1,6,3],true,0,1,'One lap with Ren. The crew has a place for you.'],
  ['coast-clock','Salt in the Air',1,'time','seaside',[20,28],false,0,0,'An open coastal run. Let the sea set the pace.'],
  ['afterglow','Afterglow Slide',1,'drift','seaside',[28,29,30],false,8,0,'Link the harbour bends. Eight seconds of drifting, then bring it home.'],
  ['aya-run','Aya’s Invitation',1,'duel','seaside',[30,14,20],false,0,0,'Aya knows the shoreline. Your own build sets the terms.'],
  ['coast-final','Midnight Postcard',1,'circuit','seaside',[20,28,29,30,14],true,0,1,'A coastal lap earns an invitation to the highlands.'],
  ['ridge-clock','Into Kurohana',2,'time','kurohana',[31,32,33],false,0,0,'A new road, open views and a caldera lake below.'],
  ['ash-slide','Ash and Gold',2,'drift','kurohana',[35,36,31],false,8,0,'The descent rewards a steady hand. Carry eight seconds of slide.'],
  ['sora-run','Sora’s Ridge',2,'duel','kurohana',[33,34,35,31],false,0,0,'Sora brought the same tune. Follow the ridge and choose your moments.'],
  ['caldera-final','The Long Way Home',2,'circuit','kurohana',[31,32,33,34,35],true,0,1,'One final lap around the caldera. There is always another reason to return.']
 ].map(([id,name,chapter,type,hub,nodes,loop,driftGoal,laps,message],index)=>({id,name,chapter,type,hub,nodes,loop,driftGoal,laps:loop?1:1,message,index,rival:type==='duel'||type==='circuit'}));
 const finite=(n,f=0)=>Number.isFinite(+n)?+n:f;
 function normalize(raw={}){raw=raw&&typeof raw==='object'?raw:{};const progress={version:1,results:{},visited:{},selected:null};
  for(const event of events){const r=raw.results?.[event.id];if(!r||!r.complete||!events.slice(0,event.index).every(e=>progress.results[e.id]?.complete))continue;const time=finite(r.time,-1);if(time<=0||time>7200)continue;progress.results[event.id]={complete:true,time,medal:Math.max(1,Math.min(3,finite(r.medal,1))),wins:Math.max(1,Math.min(999,finite(r.wins,1)))};}
  for(const id of ['garage','seaside','kurohana'])if(raw.visited?.[id])progress.visited[id]=true;
  if(events.some(e=>e.id===raw.selected)&&unlocked(progress,raw.selected))progress.selected=raw.selected;return progress;
 }
 function unlocked(p,id){const e=events.find(e=>e.id===id);return !!e&&events.slice(0,e.index).every(x=>p.results[x.id]?.complete);}
 function next(p){return events.find(e=>unlocked(p,e.id)&&!p.results[e.id]?.complete)||events.at(-1);}
 function reputation(p){return Object.values(p.results).reduce((sum,r)=>sum+(r.complete?100:0)+(r.medal||0)*20,0);}
 function chapterComplete(p,n){if(!Number.isInteger(n)||n<0||n>=3)return false;return events.filter(e=>e.chapter===n).every(e=>p.results[e.id]?.complete);}
 function medal(time,par,drift,goal){if(goal&&drift<goal)return 0;if(time<=par*.83&&(!goal||drift>=goal*1.5))return 3;if(time<=par)return 2;return 1;}
 function award(p,id,result){const e=events.find(e=>e.id===id);if(!e||!unlocked(p,id)||!result.success||!Number.isFinite(result.time)||!(result.time>0)||result.time>7200||!Number.isInteger(result.medal)||result.medal<1||result.medal>3)return false;
  const old=p.results[id];p.results[id]={complete:true,time:old?Math.min(old.time,result.time):result.time,medal:Math.max(old?.medal||0,result.medal),wins:Math.min(999,(old?.wins||0)+1)};p.selected=next(p).id;return true;}
 function ghostValid(raw,key){if(typeof key!=='string'||key.length>20000||!raw||raw.key!==key||!Array.isArray(raw.samples)||raw.samples.length<2||raw.samples.length>6001)return false;let last=-1;
  for(const s of raw.samples){if(!Array.isArray(s)||s.length!==5||!s.every(Number.isFinite)||s[0]<0||s[0]<=last||s[0]>900||Math.abs(s[1])>7100||Math.abs(s[2])>2000||Math.abs(s[3])>7100||Math.abs(s[4])>10000)return false;last=s[0];}return true;}
 function ghostPose(samples,t){if(!samples?.length||t<samples[0][0]||t>samples.at(-1)[0])return null;let lo=0,hi=samples.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(samples[m][0]<t)lo=m;else hi=m;}const a=samples[lo],b=samples[hi],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),yaw=Math.atan2(Math.sin(b[4]-a[4]),Math.cos(b[4]-a[4]));return {x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u,z:a[3]+(b[3]-a[3])*u,yaw:a[4]+yaw*u};}
 function navigationArrow(angle){return Math.abs(angle)<.4?'↑':Math.abs(angle)>2.4?'↶':angle>0?'↱':'↰';}
 root.CAREER_CORE={navigationArrow,chapters,events,normalize,unlocked,next,reputation,chapterComplete,medal,award,ghostValid,ghostPose};
})(typeof window==='object'?window:globalThis);
