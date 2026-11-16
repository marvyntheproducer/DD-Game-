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
