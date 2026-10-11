import test from 'node:test';
import assert from 'node:assert/strict';
import { CARS,ROADS,LANDMARKS,createPlayer,stepPlayer,createJob,advanceJob,validateSave,defaultSave,selectCar,streetRoute } from '../src/core.js';
test('driving accelerates, steers, brakes, and collides with solid buildings',()=>{
  const p=createPlayer();
  for(let i=0;i<120;i++) stepPlayer(p,{forward:true},CARS[0],1/60);
  assert.ok(p.z<20);assert.ok(p.speed>10);
  const initialYaw=p.yaw;for(let i=0;i<30;i++)stepPlayer(p,{forward:true,left:true},CARS[0],1/60);
  assert.ok(p.yaw>initialYaw);
  const before=p.speed;for(let i=0;i<30;i++)stepPlayer(p,{brake:true},CARS[0],1/60);
  assert.ok(p.speed<before/3);
  Object.assign(p,{x:0,z:6,yaw:Math.PI,speed:20});
  for(let i=0;i<40;i++)stepPlayer(p,{forward:true},CARS[0],1/60,[{x:0,z:0,w:10,d:4}]);
  assert.ok(p.z>4);assert.ok(p.crashes>=1);
});
test('passengers require a slow sustained stop; trip pays exactly once',()=>{
  const j=createJob(0),p=createPlayer();j.stage='pickup';j.crashes=p.crashes;
  Object.assign(p,{x:j.pickup.x,z:j.pickup.z,speed:20});assert.equal(advanceJob(j,p,2),null);
  p.speed=0;assert.equal(advanceJob(j,p,.5),null);assert.equal(advanceJob(j,p,.6).type,'picked-up');
  Object.assign(p,{x:j.dropoff.x,z:j.dropoff.z});const result=advanceJob(j,p,1.1);
  assert.equal(result.amount,j.fare+Math.round(j.fare*.2));assert.equal(advanceJob(j,p,2),null);
  for(let i=0;i<100;i++){const job=createJob(i);assert.notDeepEqual(job.pickup,job.dropoff);}
});
test('handbrake cornering breaks traction into a drift and grips again on release',()=>{
  const p=createPlayer();
  for(let i=0;i<180;i++)stepPlayer(p,{forward:true},CARS[0],1/60);
  const straightYaw=p.yaw;
  assert.equal(p.drifting,false);
  for(let i=0;i<45;i++)stepPlayer(p,{forward:true,left:true,brake:true},CARS[0],1/60);
  assert.equal(p.drifting,true,'expected the handbrake turn to start a drift');
  assert.ok(Math.abs(p.slip)>.14);
  const slipAngle=Math.abs(p.slip);
  assert.ok(p.yaw>straightYaw);
  // The car keeps sliding even after the driver straightens the wheel.
  for(let i=0;i<10;i++)stepPlayer(p,{forward:true},CARS[0],1/60);
  assert.equal(p.drifting,false);
  assert.ok(Math.abs(p.slip)<slipAngle);
  for(let i=0;i<60;i++)stepPlayer(p,{forward:true},CARS[0],1/60);
  assert.ok(Math.abs(p.slip)<.05,'traction should pull the travel direction back in line');
  // Straight-line handbraking stops hard without sliding sideways.
  const q=createPlayer();
  for(let i=0;i<120;i++)stepPlayer(q,{forward:true},CARS[0],1/60);
  const before=q.speed;const yawBefore=q.yaw;
  for(let i=0;i<30;i++)stepPlayer(q,{brake:true},CARS[0],1/60);
  assert.equal(q.drifting,false);assert.ok(Math.abs(q.slip)<.02);assert.equal(q.yaw,yawBefore);
  assert.ok(q.speed<before/3);
});
test('car purchases enforce earnings and never charge twice',()=>{
  const save=defaultSave();assert.equal(selectCar(save,'hatch'),false);assert.equal(save.cash,0);
  save.cash=700;assert.equal(selectCar(save,'hatch'),true);assert.equal(save.cash,50);
  assert.equal(selectCar(save,'hatch'),true);assert.equal(save.cash,50);assert.equal(save.selected,'hatch');
});

test('reversing and collisions do not retain sideways drift momentum',()=>{
  const p=createPlayer();
  for(let i=0;i<60;i++)stepPlayer(p,{reverse:true,brake:true,left:true},CARS[0],1/60);
  assert.equal(p.drifting,false);
  const q=createPlayer();Object.assign(q,{x:0,z:6,speed:30,slip:.4,drifting:true});
  stepPlayer(q,{forward:true},CARS[0],.04,[{x:0,z:0,w:10,d:4}]);
  for(let i=0;i<10&&!q.crashes;i++)stepPlayer(q,{forward:true},CARS[0],.04,[{x:0,z:0,w:10,d:4}]);
  assert.ok(q.crashes>0);assert.equal(q.drifting,false);assert.equal(q.slip,0);
});
test('corrupt save cannot introduce unsupported cars, paint, or negative money',()=>{
  const save=validateSave({version:1,cash:-1,trips:NaN,unlocked:['gt','fake','gt'],selected:'fake',paint:'bad',bests:{sprint:-5}});
  assert.equal(save.cash,0);assert.deepEqual(save.unlocked,['cab','gt']);assert.equal(save.selected,'cab');assert.deepEqual(save.bests,{});
});
test('navigation follows connected streets for every landmark pair',()=>{
  for(const a of LANDMARKS)for(const b of LANDMARKS){
    const route=streetRoute(a,b);assert.ok(route.length>=1);assert.ok(Math.hypot(route[0].x-a.x,route[0].z-a.z)<.01);
    assert.ok(route.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
    for(let i=1;i<route.length;i++){const p=route[i-1],q=route[i];assert.ok(p.x===q.x||p.z===q.z,`Diagonal navigation ${a.name} to ${b.name}`);}
    assert.ok(Math.hypot(route.at(-1).x-b.x,route.at(-1).z-b.z)<.01);
  }
});
