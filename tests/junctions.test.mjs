import {test} from 'node:test';import assert from 'node:assert/strict';import {loadGame} from './game-harness.mjs';
const {game:g}=loadGame();g.buildRoads();g.buildNavigation();const ar=g.arrays;
function point(edge,node,d){const e=g.EDGES[edge],at=e.a===node?d:e.length-d;let k=0;while(k<e.n-1&&e.arc[k]<at)k++;return {x:ar.RX[e.s+k],z:ar.RZ[e.s+k],edge};}
test('short side-arm detours resolve to the intended junction for every ordered approach and exit',()=>{let checked=0;
 for(let node=0;node<g.world.NODES.length;node++){const arms=g.EDGES.map((e,index)=>({e,index})).filter(({e})=>e.a===node||e.b===node);if(arms.length<3)continue;
 for(let a=0;a<arms.length;a++)for(let b=0;b<arms.length;b++)if(a!==b)for(let c=0;c<arms.length;c++)if(c!==a&&c!==b)for(const d of [25,35,50]){
  const raw=[point(arms[a].index,node,140),point(arms[c].index,node,d),point(arms[b].index,node,140)],anchors=raw.map(g.raceAnchor),fixed=g.normalizeJunctionWaypoints(anchors);
  if(fixed[1].node!==undefined){assert.equal(fixed[1].node,node);checked++;g.race.cps=raw;g.race.loop=false;g.prepareCourse();for(const gate of g.race.course)assert.notEqual(gate.edge,arms[c].index,'junction '+node+' side-arm checkpoint');}
 }}assert.ok(checked>=1500,'all junction combinations covered: '+checked);console.log('Junction combinations repaired:',checked);
});
test('deliberate same-road, repeated-destination and distant turnarounds remain available',()=>{
 const edge=0,e=g.EDGES[edge],node=e.a,a=point(edge,node,140),b=point(edge,node,40),other=g.EDGES.findIndex(q=>q.a===node&&q!==e||q.b===node&&q!==e),c=point(other,node,140);
 for(const raw of [[a,b,c],[a,b,a],[a,point(other,node,90),point(2,node,140)]]){const anchors=raw.map(g.raceAnchor),fixed=g.normalizeJunctionWaypoints(anchors);assert.equal(fixed[1],anchors[1]);}
 const raw=[point(0,node,140),{...point(2,node,15),turnaround:true},point(1,node,140)];g.race.cps=raw;g.race.loop=false;g.prepareCourse();assert.equal(g.race.cps[1].turnaround,true);assert.equal(g.race.cps[1].edge,2);
});
