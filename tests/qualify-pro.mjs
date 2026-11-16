// Offline driving qualification. Uses the actual car/road/checkpoint physics;
// does not run while playing and does not add a game dependency.
import {loadGame} from './game-harness.mjs';
const {game:g,context}=loadGame();g.boot();g.setStarted(true);g.setSplit(false);g.selectEngine('JZ2Tour','factory');g.applyHandlingPreset('street');g.P.mass=1250;
let now=0;context.performance={now:()=>now};const results=[];const ar=g.arrays;
function point(edge,d){const e=g.EDGES[edge];let k=0;while(k<e.n-1&&e.arc[k]<d)k++;return {x:ar.RX[e.s+k],z:ar.RZ[e.s+k],edge};}
function run(id,cps){g.race.cps=cps;g.race.loop=false;g.race.laps=1;g.prepareCourse();g.startRace({rival:true});now+=3001;g.updRace();g.placeCar(g.cars[0],-6800,6000,0);g.cars[0].frozen=true;const bot=g.soloCareer.rival,length=g.race.length,budget=Math.max(180,length/6+50);let k=0;
 for(;k<budget*240&&!g.race.players[1].done;k++){now+=1000/240;g.stepPlayers(1/240,now);if(k%4===0)g.updRace();if(bot.ai.recoveries>1)break;}
 const r={id,length:Math.round(length),seconds:+(k/240).toFixed(2),done:g.race.players[1].done,recoveries:bot.ai.recoveries,rejoins:bot.ai.rejoins||0};results.push(r);console.log(JSON.stringify(r));g.endRace();}
for(let edge=0;edge<g.EDGES.length;edge++){const e=g.EDGES[edge],start=Math.min(45,e.length*.2),end=e.length-start,n=Math.max(2,Math.ceil((end-start)/500)),cps=Array.from({length:n+1},(_,k)=>point(edge,start+(end-start)*k/n));run('edge-'+edge+'-forward',cps);run('edge-'+edge+'-reverse',cps.slice().reverse());}
for(let node=0;node<g.world.NODES.length;node++){const arms=g.EDGES.map((e,index)=>({e,index})).filter(({e})=>e.a===node||e.b===node);for(const a of arms)for(const b of arms)if(a!==b){const at=({e,index})=>point(index,e.a===node?Math.min(180,e.length*.35):e.length-Math.min(180,e.length*.35));run('junction-'+node+'-'+a.index+'-'+b.index,[at(a),{x:g.world.NODES[node][0],z:g.world.NODES[node][1],node},at(b)]);}}
const failed=results.filter(r=>!r.done||r.recoveries>0);console.log('SUMMARY',JSON.stringify({cases:results.length,completed:results.filter(r=>r.done).length,clean:results.filter(r=>r.done&&!r.recoveries).length,failed,km:results.reduce((s,r)=>s+r.length,0)/1000}));if(failed.length)process.exitCode=1;
