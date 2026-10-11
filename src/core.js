export const ROADS = [-300, -240, -120, 0, 120, 240, 300];
export const ROAD_WIDTH = 24;
export const CARS = [
  { id: 'cab', name: 'City Cab', tagline: 'Your trusty first ride. Now with a little extra punch.', price: 0, speed: 46, acceleration: 24, handling: 2.5, shape: 'sedan' },
  { id: 'hatch', name: 'Metro Sport', tagline: 'A nimble hatch made for the downtown hustle.', price: 650, speed: 56, acceleration: 30, handling: 2.9, shape: 'hatch' },
  { id: 'suv', name: 'Trail Nomad', tagline: 'A planted, powerful ride for the scenic route.', price: 1200, speed: 52, acceleration: 28, handling: 2.3, shape: 'suv' },
  { id: 'gt', name: 'Comet GT', tagline: 'Long straights. Late nights. A whole lot of speed.', price: 2200, speed: 69, acceleration: 36, handling: 2.75, shape: 'gt' },
];
export const PAINTS = ['#f8ce58', '#eb815f', '#76ad9c', '#8da6c7', '#e7e9dc', '#3a464b'];
export const LANDMARKS = [
  { name: 'Market Square', x: 6, z: -72 },
  { name: 'Palm Promenade', x: 240, z: 173 },
  { name: 'Sunbay Station', x: -180, z: -240 },
  { name: 'The Green', x: -120, z: 57 },
  { name: 'Marina Café', x: 300, z: -170 },
  { name: 'Old Town', x: -240, z: 185 },
  { name: 'Central Arcade', x: 68, z: -120 },
  { name: 'Hillview Hotel', x: -120, z: -175 },
  { name: 'Boardwalk', x: 185, z: 300 },
  { name: 'Arts Quarter', x: 120, z: -185 },
];
const NAMES = ['Maya', 'Leo', 'Aisha', 'Theo', 'Zoe', 'Sam', 'Luca', 'Nia'];
export const RACES = [
  { id: 'sprint', name: 'Sunbay Sprint', description: 'Fly through the straightaway gates. Follow the arrows around the city blocks.', reward: 250, limit: 80, difficulty: 'Easy', start: [30,120], yaw: -Math.PI/2, points: [[-60,120],[-120,60],[-60,0],[60,0],[120,60],[60,120]], color: '#7caaa0' },
  { id: 'coast', name: 'Coastal Run', description: 'Open the throttle past the marina and along the palm-lined coast.', reward: 450, limit: 115, difficulty: 'Medium', start: [120,240], yaw: Math.PI/2, points: [[270,240],[300,60],[300,-180],[180,-240],[120,-60],[120,180]], color: '#92b7c1' },
  { id: 'city', name: 'The Grand Shift', description: 'One big city loop. Clear turn cues, long straights, and a finish worth chasing.', reward: 700, limit: 150, difficulty: 'Hard', start: [-240,240], yaw: Math.PI, points: [[-240,180],[-240,-180],[-60,-240],[180,-240],[240,-60],[240,180],[60,240],[-180,240]], color: '#ab9cb7' },
];
export const distance = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const nearestLine = v => ROADS.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a, ROADS[0]);
export function snapToRoad(p) {
  const x = nearestLine(p.x), z = nearestLine(p.z);
  return Math.abs(x-p.x) < Math.abs(z-p.z) ? {x,z:clamp(p.z,-300,300)} : {x:clamp(p.x,-300,300),z};
}
export function onRoad(p) { return Math.min(...ROADS.map(r=>Math.min(Math.abs(r-p.x),Math.abs(r-p.z)))) < ROAD_WIDTH/2+1; }
export function createPlayer() { return {x:0,z:28,yaw:Math.PI,travelYaw:Math.PI,speed:0,steer:0,slip:0,drifting:false,boost:1,crashes:0,collisionCooldown:0}; }
export function stepPlayer(p, input, car, dt, obstacles = []) {
  dt = clamp(dt,0,.04);
  p.collisionCooldown = Math.max(0,p.collisionCooldown-dt);
  const offroad = !onRoad(p);
  const boosting = input.boost && p.boost>.03 && input.forward && !input.brake;
  p.boost = clamp(p.boost + (boosting ? -.32 : .11)*dt,0,1);
  const max = car.speed * (offroad ? .5 : 1) * (boosting ? 1.35 : 1);
  let acc = 0;
  if(input.forward) acc += p.speed < -1 ? 40 : car.acceleration*(boosting?1.6:1);
  if(input.reverse) acc -= p.speed > 1 ? 46 : car.acceleration*.7;
  const steerTarget = (input.left?1:0)-(input.right?1:0);
  p.steer += (steerTarget-p.steer)*Math.min(1,dt*9);
  // Hold the handbrake into a bend and the tyres break traction: the tail swings
  // out and the car slides sideways instead of simply following its nose.
  const breaking = !!input.brake && p.speed > 6 && Math.abs(p.steer) > .18 && !input.reverse;
  if(input.brake) {
    // A sliding car scrubs speed gradually so the drift can be held through the corner.
    if(breaking) p.speed = Math.sign(p.speed)*Math.max(0,Math.abs(p.speed)-14*dt);
    else p.speed *= Math.max(0,1-dt*6);
  }
  p.speed += acc*dt;
  const drag = (!input.forward && !input.reverse ? 1.8 : .22) + (offroad ? 1.4 : 0);
  p.speed *= Math.max(0,1-drag*dt);
  p.speed = clamp(p.speed,-9,max);
  if(Math.abs(p.speed)<.04) p.speed=0;
  const grip = Math.min(1,Math.abs(p.speed)/7)/(1+Math.abs(p.speed)/48);
  p.yaw += p.steer * car.handling * grip * Math.sign(p.speed) * dt * (input.brake?1.5:1);
  // The direction of travel trails the heading; grip pulls the two back together.
  const heading = p.speed >= 0 ? p.yaw : p.yaw+Math.PI;
  if(Math.abs(p.speed)<2)p.travelYaw=heading;
  let gap = heading - p.travelYaw;
  gap = Math.atan2(Math.sin(gap),Math.cos(gap));
  const traction = (breaking ? 1.7 : offroad ? 6 : 11) * (input.brake && !breaking ? 2 : 1);
  gap -= gap*(1-Math.exp(-traction*dt));
  const limit = breaking ? .55 : .3;
  if(Math.abs(gap) > limit) gap = Math.sign(gap)*limit;
  p.travelYaw = heading - gap;
  p.slip = -gap;
  p.drifting = breaking && Math.abs(p.slip) > .14;
  const oldX=p.x,oldZ=p.z;
  p.x += Math.sin(p.travelYaw)*Math.abs(p.speed)*dt;
  p.z += Math.cos(p.travelYaw)*Math.abs(p.speed)*dt;
  let collided = Math.abs(p.x)>326 || Math.abs(p.z)>326;
  for(const b of obstacles) {
    const dx=p.x-clamp(p.x,b.x-b.w/2,b.x+b.w/2), dz=p.z-clamp(p.z,b.z-b.d/2,b.z+b.d/2);
    if(dx*dx+dz*dz<2.7*2.7) {collided=true;break;}
  }
  if(collided) {
    p.x=oldX;p.z=oldZ;
    if(Math.abs(p.speed)>5 && p.collisionCooldown===0) {p.crashes++;p.collisionCooldown=1;}
    p.speed *= -.25;
    p.travelYaw=p.yaw+(p.speed<0?Math.PI:0);p.slip=0;p.drifting=false;
  }
  return collided;
}
export function createJob(index) {
  const pickup = LANDMARKS[index % LANDMARKS.length];
  const dropoff = LANDMARKS[(index*3+4)%LANDMARKS.length === index%LANDMARKS.length ? (index+5)%LANDMARKS.length : (index*3+4)%LANDMARKS.length];
  return { passenger:NAMES[index%NAMES.length],pickup,dropoff,fare:Math.round((90+distance(pickup,dropoff)*.23)/10)*10,stage:'offer',elapsed:0,crashes:0,stopTime:0 };
}
export function canStop(p,target) { return distance(p,target)<12 && Math.abs(p.speed)*3.6<10; }
export function advanceJob(job,p,dt) {
  if(job.stage!=='pickup' && job.stage!=='dropoff') return null;
  job.elapsed += dt;
  const target=job.stage==='pickup'?job.pickup:job.dropoff;
  job.stopTime = canStop(p,target) ? job.stopTime+dt : 0;
  if(job.stopTime<1) return null;
  job.stopTime=0;
  if(job.stage==='pickup') {job.stage='dropoff';return {type:'picked-up'};}
  job.stage='complete';
  const smooth = p.crashes===job.crashes;
  const bonus = smooth?Math.round(job.fare*.2):0;
  return {type:'completed',amount:job.fare+bonus,bonus};
}
export function defaultSave() {return {version:1,cash:0,trips:0,unlocked:['cab'],selected:'cab',paint:PAINTS[0],wheels:'classic',stripe:false,bests:{}};}
export function validateSave(raw) {
  const base=defaultSave();
  if(!raw || raw.version!==1) return base;
  for(const k of ['cash','trips']) if(Number.isFinite(raw[k]) && raw[k]>=0) base[k]=Math.floor(raw[k]);
  if(Array.isArray(raw.unlocked)) base.unlocked=[...new Set(['cab',...raw.unlocked.filter(id=>CARS.some(c=>c.id===id))])];
  if(base.unlocked.includes(raw.selected)) base.selected=raw.selected;
  if(PAINTS.includes(raw.paint)) base.paint=raw.paint;
  if(['classic','sport'].includes(raw.wheels)) base.wheels=raw.wheels;
  base.stripe=raw.stripe===true;
  for(const race of RACES) if(Number.isFinite(raw.bests?.[race.id]) && raw.bests[race.id]>0) base.bests[race.id]=raw.bests[race.id];
  return base;
}
export function selectCar(save,id) {
  const car=CARS.find(c=>c.id===id);
  if(!car) return false;
  if(!save.unlocked.includes(id)) {
    if(save.cash<car.price) return false;
    save.cash-=car.price;save.unlocked.push(id);
  }
  save.selected=id;return true;
}
// Connect the current and destination positions to a street-intersection graph.
// A shortest path keeps navigation on actual roads rather than through buildings.
export function streetRoute(start,end) {
  const nodes=[];
  for(const x of ROADS) for(const z of ROADS) nodes.push({x,z});
  const edges=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
    const a=nodes[i],b=nodes[j];
    if((a.x===b.x && Math.abs(ROADS.indexOf(a.z)-ROADS.indexOf(b.z))===1)||(a.z===b.z && Math.abs(ROADS.indexOf(a.x)-ROADS.indexOf(b.x))===1)) {
      const d=distance(a,b);edges[i].push([j,d]);edges[j].push([i,d]);
    }
  }
  for(const p of [snapToRoad(start),snapToRoad(end)]) {
    const idx=nodes.length;nodes.push(p);edges.push([]);
    // Attach to every node sharing the projected road; all such links are straight road segments.
    for(let i=0;i<49;i++) if(nodes[i].x===p.x||nodes[i].z===p.z) {const d=distance(p,nodes[i]);edges[idx].push([i,d]);edges[i].push([idx,d]);}
  }
  if(nodes[49].x===nodes[50].x||nodes[49].z===nodes[50].z) {const d=distance(nodes[49],nodes[50]);edges[49].push([50,d]);}
  const cost=nodes.map(()=>Infinity),prev=[],seen=new Set();cost[49]=0;
  while(seen.size<nodes.length) {
    let u=-1;for(let i=0;i<nodes.length;i++) if(!seen.has(i)&&(u<0||cost[i]<cost[u])) u=i;
    if(u<0||!Number.isFinite(cost[u])||u===50) break;
    seen.add(u);for(const [v,w] of edges[u]) if(cost[u]+w<cost[v]) {cost[v]=cost[u]+w;prev[v]=u;}
  }
  const route=[];let current=50;while(current!==undefined) {route.unshift(nodes[current]);current=prev[current];}
  if(distance(start,route[0])>1) route.unshift({x:start.x,z:start.z});
  if(distance(end,route.at(-1))>1) route.push({x:end.x,z:end.z});
  return route;
}

export function routeTurns(route) {
  const points=[];
  for(const p of route){
    if(points.length&&distance(points.at(-1),p)<.05)continue;
    while(points.length>=2){
      const a=points.at(-2),b=points.at(-1);
      const cross=(b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x);
      const dot=(b.x-a.x)*(p.x-b.x)+(b.z-a.z)*(p.z-b.z);
      if(Math.abs(cross)>.01||dot<0)break;points.pop();
    }
    points.push(p);
  }
  const turns=[];let along=0;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1],incoming=distance(a,b),outgoing=distance(b,c);
    along+=incoming;
    // Ignore short corrections from a car's lane to the street centerline.
    if(incoming<10||outgoing<10)continue;
    const cross=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);
    if(Math.abs(cross)<.01)continue;
    turns.push({x:b.x,z:b.z,direction:cross<0?'left':'right',distance:along,yaw:Math.atan2(b.x-a.x,b.z-a.z)});
  }
  return turns;
}

// Swept detection prevents a fast car from skipping a gate between rendered frames.
export function passedCheckpoint(previous,current,target,radius=15){
  const dx=current.x-previous.x,dz=current.z-previous.z,length2=dx*dx+dz*dz;
  const t=length2?clamp(((target.x-previous.x)*dx+(target.z-previous.z)*dz)/length2,0,1):0;
  return Math.hypot(previous.x+t*dx-target.x,previous.z+t*dz-target.z)<=radius;
}
