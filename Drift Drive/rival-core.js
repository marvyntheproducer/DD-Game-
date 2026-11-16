/* Original bounded racing planner. Development qualification uses game physics;
   runtime evaluates the cached line and local tactical choices, not a neural net. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function curvature(a,p,b){const ax=p.x-a.x,az=p.z-a.z,bx=b.x-p.x,bz=b.z-p.z;return 2*(ax*bz-az*bx)/Math.max(.01,Math.hypot(ax,az)*Math.hypot(bx,bz)*Math.hypot(b.x-a.x,b.z-a.z));}
function buildLine(route,tune,valid=()=>true,loop=false){
 if(route.length<3)return route.map(p=>({...p,offset:0,speed:20,curvature:0}));
 const raw=route.map((p,i)=>curvature(route[Math.max(0,i-5)],p,route[Math.min(route.length-1,i+5)])),corners=[];
 for(let i=1;i<raw.length-1;i++){if(Math.abs(raw[i])<.0025)continue;const start=i,sign=Math.sign(raw[i]);let weight=0,center=0;
  while(i<raw.length-1&&Math.sign(raw[i])===sign&&Math.abs(raw[i])>.001){const w=Math.abs(raw[i]);weight+=w;center+=w*route[i].distance;i++;}
  corners.push({start:route[start].distance-45,end:route[i].distance+45,apex:center/weight,sign});
 }
 let offsets=route.map((p,i)=>{let value=0,total=0;const limit=Math.min(2.2,Math.max(0,(p.width||5)-2.0));
  for(const c of corners){if(p.distance<c.start||p.distance>c.end)continue;const t=p.distance<c.apex?(p.distance-c.start)/Math.max(1,c.apex-c.start)*.5:.5+(p.distance-c.apex)/Math.max(1,c.end-c.apex)*.5;
   const shape=t<.5?-1+2*smooth(0,.5,t):1-2*smooth(.5,1,t),w=Math.sin(Math.PI*t)**2;value+=c.sign*limit*shape*w;total+=w;}
  return (total?value/Math.max(1,total):0)*(1-smooth(.035,.08,Math.abs(raw[i])));
 });
 for(let pass=0;pass<5;pass++)offsets=offsets.map((v,i,a)=>(a[Math.max(0,i-2)]+a[Math.max(0,i-1)]+v*2+a[Math.min(a.length-1,i+1)]+a[Math.min(a.length-1,i+2)])/6);
 const line=route.map((p,i)=>{let offset=offsets[i]*(smooth(0,20,p.distance)*smooth(0,20,route.at(-1).distance-p.distance)),x,z;
  for(let k=0;k<5;k++){x=p.x-p.tz*offset;z=p.z+p.tx*offset;if(valid(x,z,p))break;offset*=.5;}
  if(!valid(x,z,p)){x=p.x;z=p.z;offset=0;}return {...p,x,z,offset};
 });
 // Round sharp junction kinks inside the actual paved corridor. This creates a
 // driveable arc rather than asking the steering to follow a graph vertex.
 for(let pass=0;pass<6;pass++){const old=line.map(p=>({x:p.x,z:p.z}));for(let i=1;i<line.length-1;i++){if(Math.abs(raw[i])<.015)continue;const a=old[Math.max(0,i-4)],b=old[Math.min(line.length-1,i+4)],x=(a.x+b.x+old[i].x*2)/4,z=(a.z+b.z+old[i].z*2)/4;if(valid(x,z,route[i])){line[i].x=x;line[i].z=z;}}}
 for(let i=0;i<line.length;i++){const p=line[i],a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1;p.tx=(b.x-a.x)/len;p.tz=(b.z-a.z)/len;p.offset=(p.x-route[i].x)*(-route[i].tz)+(p.z-route[i].z)*route[i].tx;}
 // Explicit near-reversing junctions use a committed low-speed turn.
 line.hairpins=[];for(let i=1;i<route.length-1;i++){const p=route[i],a=route[Math.max(0,i-5)],b=route[Math.min(route.length-1,i+5)],ax=p.x-a.x,az=p.z-a.z,bx=b.x-p.x,bz=b.z-p.z,angle=Math.atan2(-(ax*bz-az*bx),ax*bx+az*bz);if(Math.abs(angle)>2.2&&p.distance>25&&p.distance<route.at(-1).distance-25&&!line.hairpins.some(c=>Math.abs(c.distance-p.distance)<25))line.hairpins.push({distance:p.distance,x:p.x,z:p.z,yaw:Math.atan2(-bz,bx)});}
 const grip=clamp(Math.min(tune.gripF,tune.gripR),.5,1.6),lateral=8.8*grip/1.2,brake=5.0*grip/1.2;
 for(let i=0;i<line.length;i++){const p=line[i],a=line[Math.max(0,i-4)],b=line[Math.min(line.length-1,i+4)],k=Math.abs(curvature(a,p,b));p.curvature=curvature(a,p,b);p.speed=Math.min(400/3.6,Math.sqrt(lateral/Math.max(k,.00001)));}
 // One distance-aware braking envelope, including the next lap's first corner.
 for(let pass=0;pass<(loop?2:1);pass++)for(let i=line.length-1;i>=0;i--){const p=line[i],q=line[(i+1)%line.length];if(i===line.length-1&&!loop)continue;const ds=i===line.length-1?2:Math.max(.1,q.distance-p.distance);p.speed=Math.min(p.speed,Math.sqrt(q.speed*q.speed+2*brake*ds));}
 return line;
}
function sample(line,d){let lo=0,hi=line.length-1;d=clamp(d,0,line[hi].distance);while(hi-lo>1){const m=(lo+hi)>>1;if(line[m].distance<d)lo=m;else hi=m;}const a=line[lo],b=line[hi],t=clamp((d-a.distance)/Math.max(.001,b.distance-a.distance),0,1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,speed:a.speed+(b.speed-a.speed)*t,curvature:a.curvature+(b.curvature-a.curvature)*t,width:a.width||5,offset:a.offset+(b.offset-a.offset)*t,tx:a.tx,tz:a.tz};}
function preview(line,distance,speed,slide=0){const plan=sample(line,distance),far=clamp(6+speed*.38,6,22)*(1-smooth(.12,.4,Math.abs(slide))*.25);let curve=Math.abs(plan.curvature);for(const t of [.25,.5,.75,1])curve=Math.max(curve,Math.abs(sample(line,Math.min(line.at(-1).distance,distance+far*t)).curvature));const geometry=Math.sqrt(4/Math.max(.00001,curve));return {plan,look:Math.max(6,Math.min(geometry,far*(1-smooth(.015,.09,curve)*.55)))};}

// Invert the same tyre curve used by the vehicle: request yaw, not steering lock.
function forceSteer(desiredYaw,vx,vy,r,muF,muR,mass,ax=0,slip=0){
 const A=1.18,B=1.345,L=A+B,front=Math.max(600,mass*9.81*B/L-mass*ax*.48/L),rear=Math.max(600,mass*9.81*A/L+mass*ax*.48/L),den=Math.max(3,Math.abs(vx));
 const sy=(vy-r*B)/den,sx=slip/den,s=Math.hypot(sx,sy),fy=s>1e-6?-muR*rear*Math.sin(1.35*Math.atan(16*s))*sy/s:0;
 const demand=(B*fy+mass*1.52*(desiredYaw-r)*6)/A,capacity=Math.max(100,muF*front),use=clamp(demand/capacity,-.92,.92),angle=Math.tan(Math.asin(use)/1.35)/16;
 return Math.atan2(vy+r*A,Math.max(3,vx))+angle;
}
// A slide may carry speed only while its angle is bounded and its exit progress
// remains useful. Growing rotation, an edge or an opposing turn demands recovery.
function controlledSlide(beta,growth,yaw,pathYaw,speed,curvature,lateral,room){
 return speed>8&&Math.abs(curvature)>.004&&Math.abs(beta)>.12&&Math.abs(beta)<.48&&growth<.16&&yaw*pathYaw>0&&Math.abs(yaw-pathYaw)<.4&&Math.abs(lateral)<Math.max(.5,room-1);
}
function recoverSteer(requested,vx,vy,yawRate,front){const beta=vx>3?Math.atan2(vy,vx):0,weight=yawRate*beta<0?smooth(.12,.32,Math.abs(beta)):0,flow=Math.atan2(vy+front*yawRate,Math.max(3,vx)),counter=beta>=0?Math.max(requested,flow+.035):Math.min(requested,flow-.035);return {angle:requested+(counter-requested)*weight,rate:3+3*weight,recovering:weight>.2};}
function recoveryBrake(vx,vy,yawRate,front,steer){if(Math.abs(Math.atan2(vy,Math.max(3,vx)))<.15)return 1;const vfy=vy+front*yawRate,along=vx*Math.cos(steer)+vfy*Math.sin(steer),side=(-vx*Math.sin(steer)+vfy*Math.cos(steer))/Math.max(3,Math.abs(along)),support=-side*Math.cos(steer)*Math.sign(vy);return clamp(.8*support/Math.max(.001,.13*Math.abs(Math.sin(steer))),.08,.8);}
function edgeRisk(distance,width,yaw,tx,tz,mode,wall=0){
 const forward=Math.cos(yaw)*tx-Math.sin(yaw)*tz,passing=(mode==='pass'||mode==='pressure')&&forward>.94;
 const extent=2.26*Math.abs(-Math.cos(yaw)*tz-Math.sin(yaw)*tx)+.865*Math.abs(-Math.sin(yaw)*tz+Math.cos(yaw)*tx),clearance=passing?extent+.55:2.4;
 return wall>0||distance>width-clearance;
}
function tactics(state,ai,dt){
 ai.commit=Math.max(0,(ai.commit||0)-dt);ai.nudgeCooldown=Math.max(0,(ai.nudgeCooldown||0)-dt);let mode='attack',offset=0;
 if(state.ahead>7&&state.ahead<60&&Math.abs(state.across)<4&&state.aligned){mode='tow';offset=clamp(state.across,-state.room,state.room);}
 const closing=state.speed-state.leadSpeed;
 const obstacle=state.obstacle&&state.ahead>0&&state.ahead<60&&Math.abs(state.across)<3.5&&state.room+Math.abs(state.across)>2;
 if(obstacle||state.ahead>0&&state.ahead<25&&Math.abs(state.across)<4&&state.aligned&&(closing>1||state.ahead<12)&&state.room>1.8){
  if(ai.commit<=0){ai.passSide=state.across>=0?-1:1;ai.commit=1.5;}
  mode='pass';offset=clamp(state.across+ai.passSide*3.1,-state.room,state.room);
 }else if(ai.commit>0&&state.ahead> -6&&state.ahead<35){mode='pass';offset=clamp(state.across+ai.passSide*3.1,-state.room,state.room);}
 if(state.ahead>3&&state.ahead<7&&closing>1&&closing<7&&state.aligned&&Math.abs(state.across)<1.4&&ai.nudgeCooldown<=0&&state.room>2&&state.stable!==false){ai.nudgeCooldown=3;ai.nudgeTime=.22;}
 ai.nudgeTime=state.stable===false?0:Math.max(0,(ai.nudgeTime||0)-dt);if(ai.nudgeTime>0)mode='pressure';
 if(mode==='attack'&&state.gap>25)mode='chase';
 return {mode,offset,nudge:ai.nudgeTime>0};
}
root.RIVAL_CORE={buildLine,sample,preview,forceSteer,controlledSlide,recoverSteer,recoveryBrake,curvature,edgeRisk,tactics};
})(typeof window==='object'?window:globalThis);
