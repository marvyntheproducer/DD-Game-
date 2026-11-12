// Verbatim from V4 commit 5ab4783 (Drift Drive/index.html).
function cameraSpring(position,velocity,target,omega,dt){const d=position-target,t=(velocity+omega*d)*dt,e=Math.exp(-omega*dt);return [target+(d+t)*e,(velocity-omega*t)*e];}
function updCam(c,dt,aspect){
  const cam=c.cam,yv=c.root.position.y,speed=Math.hypot(c.vwx,c.vwz),energy=(!reducedMotion&&P.effects)?P.cameraEnergy:0;
  const travel=speed>3?Math.atan2(-c.vwz,c.vwx):c.yaw,beta=Math.atan2(Math.sin(travel-c.yaw),Math.cos(travel-c.yaw));
  const targetYaw=c.yaw+clamp(beta,-.9,.9)*(.15+energy*.18);
  if(c.camSnap)c.camYaw=targetYaw;
  const dy=Math.atan2(Math.sin(targetYaw-c.camYaw),Math.cos(targetYaw-c.camYaw));c.camYaw+=dy*(1-Math.exp(-dt*(5+energy*4)));
  if(c.camMode===3){wp.set(-.10,1.09,.33);c.root.localToWorld(wp);cam.position.copy(wp);wp.set(15,1.02,.33);c.root.localToWorld(wp);cam.lookAt(wp);c.camSnap=false;}
  else if(c.camMode===2){wp.set(1.9,.96,0);c.root.localToWorld(wp);cam.position.copy(wp);wp.set(14,1.0,0);c.root.localToWorld(wp);cam.lookAt(wp);c.camSnap=false;}
  else{
    const far=c.camMode===1,back=(far?8.2:5.8)+clamp(speed/70,0,1)*energy*.85,up=(far?2.8:1.9)+Math.abs(beta)*energy*.18;
    const lateral=clamp(c.ayF*.012,-.22,.22)*energy,tx=c.x-Math.cos(c.camYaw)*back+Math.sin(c.camYaw)*lateral,tz=c.z+Math.sin(c.camYaw)*back+Math.cos(c.camYaw)*lateral;
    let ty=Math.max(yv+up,ground(tx,tz)+.75);const tq=nearestRoad(tx,tz);if(tq&&EDGES[ROAD_EDGE[tq.i]].type==='tunnel'&&tq.d<tq.w)ty=Math.min(ty,tq.h+5.6);
    c.camVelocity=c.camVelocity||new THREE.Vector3();
    if(c.camSnap){cam.position.set(tx,ty,tz);c.camVelocity.set(0,0,0);c.camSnap=false;}
    else{for(const [key,target] of [['x',tx],['y',ty],['z',tz]]){const result=cameraSpring(cam.position[key],c.camVelocity[key],target,key==='y'?8:10+energy*3,Math.min(dt,.05));cam.position[key]=result[0];c.camVelocity[key]=result[1];}}
    cam.position.y=Math.max(cam.position.y,ground(cam.position.x,cam.position.z)+.65);
    if(c.tunnelRoad){const q=nearestRoad(cam.position.x,cam.position.z);if(q&&EDGES[ROAD_EDGE[q.i]].type==='tunnel'){const side=clamp(q.d*q.side,-q.w+.75,q.w-.75);cam.position.x=q.px-q.tz*side;cam.position.z=q.pz+q.tx*side;cam.position.y=clamp(cam.position.y,q.h+.65,q.h+5.5);}}
    const lead=Math.min(.20,4.5/Math.max(speed,1));cam.lookAt(c.x+c.vwx*lead+Math.cos(c.yaw)*1.2,yv+1.0,c.z+c.vwz*lead-Math.sin(c.yaw)*1.2);
    if(energy>0&&!split){const pulse=(c.fxImpact||0)*Math.sin(performance.now()*.045)*.018*energy;cam.position.y+=pulse;cam.rotateZ(clamp(c.ayF*.0008,-.014,.014)*energy);}
  }
  cam.far=cruiseSettings.rain?1250:cruiseSettings.time==='night'?1500:!split&&soloQuality.tier===1?2000:1500;cam.aspect=aspect;
  const targetFov=62+Math.min(speed,65)*(.14+energy*.07)+(!split?(c.fxKick||0)*energy*1.8:0);cam.fov+=(targetFov-cam.fov)*(1-Math.exp(-dt*7));cam.updateProjectionMatrix();
}
