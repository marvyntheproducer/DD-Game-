import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Test the physics embedded in the shipped HTML, without a local module import.
const html=fs.readFileSync(new URL('../Drift Drive/index.html',import.meta.url),'utf8');
const source=html.split('// BEGIN SIMULATION\n')[1].split('// END SIMULATION')[0];
const {advancePhysics,updateGroundContact,PHYSICS_STEP,MAX_STEPS}=vm.runInNewContext(source+'\n({advancePhysics,updateGroundContact,PHYSICS_STEP,MAX_STEPS})');
test('startup has no local ES module dependencies',()=>{
  const imports=[...html.matchAll(/^import .*?from ['"]([^'"]+)['"]/gm)].map(m=>m[1]);
  assert.ok(imports.length>0);assert.ok(imports.every(path=>!path.startsWith('.')));
});
const car=()=>({y:5,vyv:0,contact:1,gPrev:5,land:0});
test('road seams never generate an upward launch',()=>{
  const c=car();
  for(let i=0;i<2000;i++){
    const height=5+(i%2?0.08:0);updateGroundContact(c,height,PHYSICS_STEP);
    assert.equal(c.y,height);assert.equal(c.vyv,0);assert.equal(c.contact,1);
  }
});
test('slopes, rest, and large upward position corrections stay grounded',()=>{
  const c=car();for(let i=0;i<1000;i++)updateGroundContact(c,5+Math.sin(i/30),PHYSICS_STEP);
  updateGroundContact(c,20,PHYSICS_STEP);assert.equal(c.vyv,0);assert.equal(c.y,20);
  for(let i=0;i<1000;i++)updateGroundContact(c,20,PHYSICS_STEP);
  assert.equal(c.y,20);assert.equal(c.land,0);
});
test('a real ledge still produces gravity, a landing, and no rebound',()=>{
  const c=car();updateGroundContact(c,0,PHYSICS_STEP);assert.equal(c.contact,0);assert.ok(c.vyv<0);
  for(let i=0;i<300;i++)updateGroundContact(c,0,PHYSICS_STEP);
  assert.equal(c.contact,1);assert.equal(c.y,0);assert.equal(c.vyv,0);assert.ok(c.land>8);
});
test('30/60/120/144 Hz all integrate the same 240 steps per second',()=>{
  for(const fps of [30,60,120,144]){const clock={accumulator:0};let ticks=0,time=0;
    for(let i=0;i<fps;i++)advancePhysics(clock,1/fps,h=>{ticks++;time+=h;});
    assert.equal(ticks,240);assert.ok(Math.abs(time-1)<1e-12);}
});
test('a stalled frame has bounded work and no catch-up spiral',()=>{
  const clock={accumulator:0};assert.equal(advancePhysics(clock,5,()=>{}),MAX_STEPS);
  assert.ok(clock.accumulator<PHYSICS_STEP);
});
