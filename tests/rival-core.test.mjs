import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../Drift Drive/rival-core.js',import.meta.url),'utf8'),c);const R=c.window.RIVAL_CORE;
const route=Array.from({length:161},(_,i)=>{const angle=i/160*Math.PI/2,r=100;return {x:Math.sin(angle)*r,z:(1-Math.cos(angle))*r,distance:angle*r,width:7,tx:Math.cos(angle),tz:Math.sin(angle)};});
test('pro planner constructs its own bounded line, adapts braking to grip and samples continuously',()=>{
 const a=R.buildLine(route,{gripF:1.2,gripR:1.2}),b=R.buildLine(route,{gripF:.7,gripR:.7});assert.ok(a.some(p=>Math.abs(p.offset)>.2));assert.ok(a.every(p=>Math.abs(p.offset)<=2.4&&Number.isFinite(p.speed)&&p.speed>0));assert.ok(b[80].speed<a[80].speed);
 for(let i=0;i<a.length-1;i++)assert.ok(a[i].speed**2<=a[i+1].speed**2+10*(a[i+1].distance-a[i].distance)+1e-5);
 for(const d of [0,20,75,150]){const p=R.sample(a,d);assert.ok([p.x,p.z,p.speed,p.curvature,p.offset].every(Number.isFinite));}
 const center=R.buildLine(route,{gripF:1.2,gripR:1.2},(x,z,p)=>x===p.x&&z===p.z);assert.ok(center.every((p,i)=>p.x===route[i].x&&p.z===route[i].z));
});
test('pro decisions acquire a tow, commit to passing, apply pressure with a cooldown and chase without holding back',()=>{
 const ai={},s={ahead:45,across:.5,speed:40,leadSpeed:40,gap:50,room:3,aligned:true};assert.equal(R.tactics(s,ai,.05).mode,'tow');
 let p=R.tactics({...s,ahead:18,speed:44},ai,.05);assert.equal(p.mode,'pass');const side=ai.passSide;p=R.tactics({...s,ahead:16,across:-.2},ai,.05);assert.equal(ai.passSide,side);assert.equal(p.mode,'pass');
 p=R.tactics({...s,ahead:5,speed:43},ai,.05);assert.equal(p.nudge,true);assert.ok(ai.nudgeCooldown>2);for(let i=0;i<8;i++)R.tactics({...s,ahead:5,speed:43},ai,.05);assert.equal(R.tactics({...s,ahead:5,speed:43},ai,.05).nudge,false);
 assert.equal(R.tactics({...s,ahead:-100,gap:150}, {},.05).mode,'chase');assert.equal(R.tactics({...s,ahead:-100,gap:-150},{},.05).mode,'attack');
});

test('near-reversing junction arms get an explicit committed hairpin plan',()=>{
 const r=Array.from({length:121},(_,i)=>({x:i<=60?i:120-i,z:i<=60?0:(i-60)*.02,distance:i,width:10,tx:i<60?1:-1,tz:i<60?0:.02})),line=R.buildLine(r,{gripF:1.2,gripR:1.2});assert.ok(line.hairpins.some(p=>p.distance>50&&p.distance<70&&Math.abs(p.yaw)>2.8));
});

test('committed overtakes use available lane width while angled cars and barrier contact keep a safety margin',()=>{
 assert.equal(R.edgeRisk(3.2,5.5,0,1,0,'pass'),false);assert.equal(R.edgeRisk(3.2,5.5,0,1,0,'pressure'),false);assert.equal(R.edgeRisk(3.2,5.5,0,1,0,'attack'),true);
 assert.equal(R.edgeRisk(3.2,5.5,Math.PI/2,1,0,'pass'),true);assert.equal(R.edgeRisk(4.5,5.5,0,1,0,'pass'),true);assert.equal(R.edgeRisk(0,5.5,0,1,0,'pass',.1),true);
});

test('pro driver plans around oncoming and stopped traffic instead of waiting to collide',()=>{
 let p=R.tactics({ahead:55,across:-1.3,speed:40,leadSpeed:20,gap:0,room:1.5,aligned:false,obstacle:true},{},.05);assert.equal(p.mode,'pass');assert.ok(p.offset>0);assert.equal(p.nudge,false);
 p=R.tactics({ahead:35,across:0,speed:30,leadSpeed:0,gap:0,room:3,aligned:true,obstacle:true},{},.05);assert.equal(p.mode,'pass');assert.ok(Math.abs(p.offset)>2);
});

test('V6.3 corner preview starts farther ahead at speed and shortens for tight bends',()=>{
 const line=[{x:0,z:0,distance:0,speed:111,curvature:0,width:6,offset:0,tx:1,tz:0},{x:1000,z:0,distance:1000,speed:111,curvature:0,width:6,offset:0,tx:1,tz:0}];assert.ok(R.preview(line,100,50).look>20);assert.ok(R.preview(line,100,10).look<R.preview(line,100,50).look);
 const bend=line.map(p=>({...p,curvature:.1}));assert.ok(R.preview(bend,100,50).look<R.preview(line,100,50).look);assert.ok(R.preview(bend,100,0).look>=6);
});

test('V6.3 growing-spin countersteer matches front tyre flow and releases once yaw is recovering',()=>{
 const vx=20,vy=12,r=-1.5,front=1.18,p=R.recoverSteer(.1,vx,vy,r,front);assert.ok(p.angle>Math.atan2(vy+front*r,vx));assert.equal(p.recovering,true);assert.ok(p.rate>3);
 const mirrored=R.recoverSteer(-.1,vx,-vy,-r,front);assert.ok(Math.abs(p.angle+mirrored.angle)<1e-9);assert.equal(R.recoverSteer(.1,vx,vy,1.5,front).angle,.1);assert.equal(R.recoverSteer(.1,vx,0,0,front).recovering,false);
});
test('V6.3 pressure contact stops when the rival is already sliding hard',()=>{
 const s={ahead:5,across:0,speed:30,leadSpeed:27,gap:20,room:3,aligned:true,stable:false};const p=R.tactics(s,{nudgeTime:.1},.05);assert.equal(p.nudge,false);assert.notEqual(p.mode,'pressure');assert.equal(R.tactics({...s,stable:true},{},.05).nudge,true);
});

// Extreme yaw requests must saturate tyre force before asking for full lock.
test('V6.4 force steering is progressive, mirrored and bounded by available front grip',()=>{
 const steer=r=>R.forceSteer(r,30,0,0,1.2,1.28,1250);
 assert.equal(steer(0),0);assert.ok(steer(.1)>0&&steer(.1)<steer(.2));assert.ok(Math.abs(steer(.2)+steer(-.2))<1e-10);assert.ok(steer(100)<.1);
 for(const mass of [900,1700])for(const mu of [.4,1.6])for(const vx of [0,5,50])assert.ok(Number.isFinite(R.forceSteer(.5,vx,2,.2,mu,mu,mass,-5,5)));
 assert.ok(Math.abs(R.forceSteer(.3,30,3,.2,1.2,1.28,1250)-R.forceSteer(.301,30,3,.2,1.2,1.28,1250))<.001);
});

test('V6.4 controlled slides keep progress but growing spin and road-edge slides demand recovery',()=>{
 const slide=(b=.28,g=.02,r=.5,d=.52,v=20,k=-.02,l=0,room=4)=>R.controlledSlide(b,g,r,d,v,k,l,room);
 assert.equal(slide(),true);assert.equal(slide(-.28,.02,-.5,-.52),true);assert.equal(slide(.6),false);assert.equal(slide(.28,.3),false);assert.equal(slide(.28,.02,.5,-.5),false);assert.equal(slide(.28,.02,.5,.5,20,-.02,3.5),false);assert.equal(slide(.28,.02,.5,.5,20,0),false);
});
