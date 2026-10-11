import { THREE,createCity,makeCar,compactCar,makeDestination,makePassenger,material } from './world.js';
import { CARS,PAINTS,RACES,ROADS,LANDMARKS,createPlayer,stepPlayer,createJob,advanceJob,validateSave,selectCar,streetRoute,routeTurns,passedCheckpoint,snapToRoad,distance,clamp } from './core.js';
import { makeRaceGate,makeTurnMarker } from './navigation-visuals.js';
import { modelPortrait,disposeModel } from './models.js';
import { touchDevice } from './mobile-ui.js';

const $=id=>document.getElementById(id);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
} catch(error) {
  $('loading').hidden=true;$('fatal').hidden=false;$('fatal-message').textContent='This game needs WebGL. Enable hardware acceleration in your browser and try again.';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,touchDevice?1.25:1.5));
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();scene.background=new THREE.Color('#98d9f1');scene.fog=new THREE.Fog('#b7dfea',180,640);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1100);scene.add(camera);
scene.add(new THREE.HemisphereLight('#e7f6ff','#667b9a',1.7));
const sun=new THREE.DirectionalLight('#fff0d4',2.5);sun.position.set(-100,180,65);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-105;sun.shadow.camera.right=105;sun.shadow.camera.top=105;sun.shadow.camera.bottom=-105;sun.shadow.camera.near=1;sun.shadow.camera.far=380;sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;scene.add(sun);scene.add(sun.target);
const city=createCity(scene);
let storageAvailable=true,save;
try{save=validateSave(JSON.parse(localStorage.getItem('taxi-shift-save')));}catch{save=validateSave(null);storageAvailable=false;}
function persist(){try{localStorage.setItem('taxi-shift-save',JSON.stringify(save));}catch{storageAvailable=false;toast('Browser storage is unavailable. Progress lasts for this session.');}}
const player=createPlayer();let carConfig=CARS.find(c=>c.id===save.selected),car;
let started=false,modal=null,paused=false,cameraMode=0,job=createJob(save.trips),race=null,route=[],navigationRoute=[],turns=[],routeTime=0,hudTime=0,lastTime=performance.now(),totalTime=0;
const input={forward:false,reverse:false,left:false,right:false,brake:false,boost:false};
const heldKeys=new Set(),touchInputs=new Map();
const target=makeDestination();target.visible=false;scene.add(target);
const raceTarget=makeRaceGate();raceTarget.visible=false;scene.add(raceTarget);
const turnMarkers=Array.from({length:4},()=>{const left=makeTurnMarker('left'),right=makeTurnMarker('right');scene.add(left,right);return {left,right};});
let passenger=makePassenger(save.trips);passenger.visible=false;scene.add(passenger);
for(let i=0;i<LANDMARKS.length;i++){const person=makePassenger(i+1);person.userData.arm.rotation.z=.12;const npc=compactCar(person);npc.position.set(LANDMARKS[i].x+17,0,LANDMARKS[i].z+19);npc.rotation.y=i*1.3;scene.add(npc);}
const trail=new THREE.InstancedMesh(new THREE.SphereGeometry(.48,5,4),new THREE.MeshBasicMaterial({color:'#f8ce58',transparent:true,opacity:.75}),400);trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);trail.count=0;scene.add(trail);
const dummy=new THREE.Object3D();const mapCtx=$('minimap').getContext('2d');
// Drift effects: tyre smoke that boils off the rear wheels and rubber marks left on the road.
const puffs=Array.from({length:90},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,age:1,life:1,size:0}));
const smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.5,6,5),new THREE.MeshBasicMaterial({color:'#e9eef0',transparent:true,opacity:.4,depthWrite:false}),puffs.length);
smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);smoke.count=puffs.length;smoke.frustumCulled=false;scene.add(smoke);
let puffCursor=0;
const MARKS=300,MARK_FADE_START=1.6,MARK_LIFE=5,MARK_Y=.112;
const marks=new THREE.InstancedMesh(new THREE.PlaneGeometry(.44,1.2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#1b2228',transparent:true,opacity:.48,depthWrite:false}),MARKS);
marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);marks.count=MARKS;marks.frustumCulled=false;scene.add(marks);
const markX=new Float32Array(MARKS),markZ=new Float32Array(MARKS),markYaw=new Float32Array(MARKS),markTime=new Float32Array(MARKS).fill(-1e9),markFactor=new Float32Array(MARKS);
let markCursor=0;
dummy.position.set(0,-40,0);dummy.rotation.set(0,0,0);dummy.scale.set(0,0,0);dummy.updateMatrix();
for(let i=0;i<MARKS;i++)marks.setMatrixAt(i,dummy.matrix);
for(let i=0;i<puffs.length;i++)smoke.setMatrixAt(i,dummy.matrix);
marks.instanceMatrix.needsUpdate=true;smoke.instanceMatrix.needsUpdate=true;
const cockpit=new THREE.Group();camera.add(cockpit);cockpit.visible=false;
const dash=new THREE.Mesh(new THREE.BoxGeometry(2,.33,.65),material('#34494a'));dash.position.set(0,-.7,-1.0);cockpit.add(dash);
const hood=new THREE.Mesh(new THREE.BoxGeometry(1.75,.12,1.8),material(save.paint));hood.position.set(0,-.59,-2.0);cockpit.add(hood);
const steeringWheel=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,6,20),material('#172d30'));steeringWheel.position.set(-.35,-.5,-.74);steeringWheel.rotation.x=-.15;cockpit.add(steeringWheel);
for(const x of [-.93,.93]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.055,1.3,.09),material('#34494a'));pillar.position.set(x,-.05,-1.15);pillar.rotation.z=x>0?-.15:.15;cockpit.add(pillar);}
const traffic=[];
for(let i=0;i<9;i++) {
  const mesh=compactCar(makeCar(CARS[i%3],['#b1bfc1','#d98068','#e4ded0','#819eac'][i%4],'classic',false,false));
  const loops=[{lo:-240,hi:240},{lo:-120,hi:120},{lo:-300,hi:300}],loop=loops[i%3];
  const entity={mesh,lo:loop.lo,hi:loop.hi,progress:i*173,speed:8+(i%4)*1.3,x:0,z:0};traffic.push(entity);scene.add(mesh);
}
let rearWheels=[];
function rebuildCar(){if(car){scene.remove(car);disposeModel(car);}carConfig=CARS.find(c=>c.id===save.selected);car=makeCar(carConfig,save.paint,save.wheels,save.stripe);rearWheels=car.userData.pivots.filter(p=>p.position.z<0);scene.add(car);hood.material=material(save.paint);$('car-label').textContent=carConfig.name;}
rebuildCar();
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function refreshInputs(){input.forward=heldKeys.has('KeyW')||heldKeys.has('ArrowUp');input.reverse=heldKeys.has('KeyS')||heldKeys.has('ArrowDown');input.left=heldKeys.has('KeyA')||heldKeys.has('ArrowLeft');input.right=heldKeys.has('KeyD')||heldKeys.has('ArrowRight');input.brake=heldKeys.has('Space');input.boost=heldKeys.has('ShiftLeft')||heldKeys.has('ShiftRight');for(const name of touchInputs.values())input[name]=true;}
function clearInput(){heldKeys.clear();touchInputs.clear();for(const k in input)input[k]=false;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function needsLandscape(){return document.body.classList.contains('mobile-mode')&&innerHeight>innerWidth;}
function setModal(name){clearInput();modal=name;document.body.classList.toggle('menu-open',!!name);$('mobile-menu-button').setAttribute('aria-expanded',name==='mobile-menu');for(const id of ['garage','events','help','mobile-menu'])$(id).hidden=id!==name;$('garage-tab').classList.toggle('active',name==='garage');$('races-tab').classList.toggle('active',name==='events');$('drive-tab').classList.toggle('active',!name);if(name==='garage')renderGarage();if(name==='events')renderEvents();}
function start(){started=true;document.body.classList.add('game-started');$('welcome').hidden=true;if(!storageAvailable)toast('Progress saving is unavailable in this browser.');}
function setPaused(value){paused=value;clearInput();document.body.classList.toggle('game-paused',value);$('paused').hidden=!value;$('pause-button').textContent=value?'▶':'Ⅱ';$('pause-button').setAttribute('aria-label',value?'Resume game':'Pause game');}
$('start-button').onclick=start;$('drive-tab').onclick=()=>{setModal(null);start();};
$('garage-tab').onclick=()=>setModal(modal==='garage'?null:'garage');
$('races-tab').onclick=()=>setModal(modal==='events'?null:'events');$('race-shortcut').onclick=()=>setModal('events');
$('help-button').onclick=()=>setModal('help');$('pause-button').onclick=()=>setPaused(!paused);$('resume-button').onclick=()=>setPaused(false);
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>setModal(null));
function switchCamera(){cameraMode=(cameraMode+1)%2;cockpit.visible=!!cameraMode;$('camera-name').textContent=cameraMode?'Driver’s seat':'Chase camera';updateCamera(1,true);}
$('camera-button').onclick=switchCamera;
function resetCar(){const p=snapToRoad(player);player.x=p.x;player.z=p.z;player.speed=0;player.steer=0;player.slip=0;player.drifting=false;player.yaw=ROADS.includes(p.x)?Math.PI:Math.PI/2;player.travelYaw=player.yaw;routeTime=2;toast('Back on the road.');updateCamera(1,true);}
$('reset-button').onclick=resetCar;
$('reset-button').setAttribute('aria-label','Return to road');
$('mobile-menu-button').onclick=()=>setModal(modal==='mobile-menu'?null:'mobile-menu');
$('mobile-help').onclick=()=>setModal('help');
const privacyButton=document.createElement('button');privacyButton.className='primary-button';privacyButton.textContent='Privacy & licenses';
const privacyFrame=document.createElement('iframe');privacyFrame.title='Taxi Shift privacy and licenses';privacyFrame.hidden=true;privacyFrame.setAttribute('sandbox','');privacyFrame.style.cssText='width:100%;height:220px;border:0;margin-top:12px;background:#fafaf4';
privacyButton.onclick=()=>{privacyFrame.hidden=!privacyFrame.hidden;if(!privacyFrame.hidden)privacyFrame.src='./privacy.html';};
$('help').querySelector('.dialog').append(privacyButton,privacyFrame);
$('mobile-camera').onclick=()=>{switchCamera();setModal(null);};
$('mobile-reset').onclick=()=>{resetCar();setModal(null);};
$('mobile-sound').onclick=()=>$('sound-button').click();
$('mobile-fullscreen').hidden=!document.fullscreenEnabled;
$('mobile-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();setModal(null);}catch{toast('Full screen is unavailable. You can keep playing in this view.');}};
document.addEventListener('fullscreenchange',()=>{$('mobile-fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
const touchHelp=document.createElement('p');touchHelp.className='touch-help';touchHelp.textContent='Hold ◀ or ▶ to steer. Hold Gas to accelerate and Brake to slow down or reverse. For a drift, hold Gas + a steering arrow + Drift. Boost gives a burst of speed. Use the top tabs for your garage and races, and ☰ for sound, help, and camera controls.';$('help').querySelector('.help-keys').before(touchHelp);
document.querySelector('[data-control="forward"]').innerHTML='▲<small>Gas</small>';
document.querySelector('[data-control="reverse"]').innerHTML='▼<small>Brake</small>';
document.querySelector('[data-control="boost"]').innerHTML='⚡<small>Boost</small>';
addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) {if(e.code!=='Escape')return;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&e.code!=='Tab')e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Escape'){if(modal)setModal(null);else setPaused(!paused);return;}
  if(e.code==='KeyP'){setPaused(!paused);return;}
  if(e.code==='KeyG'){setModal(modal==='garage'?null:'garage');return;}
  if(modal||paused)return;
  if(e.code==='KeyC'){switchCamera();return;}
  if(e.code==='KeyR'){resetCar();return;}
  heldKeys.add(e.code);refreshInputs();
  if(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))start();
});
addEventListener('keyup',e=>{heldKeys.delete(e.code);refreshInputs();});
addEventListener('blur',()=>{clearInput();if(started)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started)setPaused(true);}});
screen.orientation?.addEventListener('change',clearInput);
document.querySelector('#mobile-controls').addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-control]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(modal||paused||needsLandscape())return;start();button.setPointerCapture(e.pointerId);touchInputs.set(e.pointerId,button.dataset.control);button.classList.add('pressed');refreshInputs();});
  const release=e=>{touchInputs.delete(e.pointerId);if(![...touchInputs.values()].includes(button.dataset.control))button.classList.remove('pressed');refreshInputs();};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
});
// Buttons relinquish focus after a pointer action so keyboard driving resumes immediately.
document.addEventListener('pointerup',e=>{if(e.target.closest('button') && !e.target.closest('[data-control]'))setTimeout(()=>document.activeElement?.blur(),0);});
let audioContext,oscillator,gain,sound=false;
$('sound-button').onclick=async()=>{
  try{
    if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();oscillator=audioContext.createOscillator();oscillator.type='sawtooth';gain=audioContext.createGain();gain.gain.value=0;oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();}
    await audioContext.resume();sound=!sound;$('sound-button').style.background=sound?'#f8ce58':'transparent';$('sound-button').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
    $('mobile-sound').textContent=sound?'Sound on':'Sound off';$('mobile-sound').setAttribute('aria-pressed',sound);
  }catch{toast('Sound is unavailable in this browser.');}
};
function targetPoint(){if(race)return {x:race.config.points[race.index][0],z:race.config.points[race.index][1]};if(job.stage==='pickup')return job.pickup;if(job.stage==='dropoff')return job.dropoff;return null;}
function acceptJob(){
  if(race){toast('Finish your race before taking a fare.');return;}
  if(job.stage==='pickup'||job.stage==='dropoff'){toast('Follow the yellow route and stop inside the marked zone.');return;}
  start();job.stage='pickup';job.crashes=player.crashes;job.elapsed=0;routeTime=2;target.visible=true;passenger.visible=true;toast(`Fare accepted. ${job.passenger} is waiting at ${job.pickup.name}.`);updateJobUI();
}
$('job-button').onclick=acceptJob;
function updateJobUI(){
  document.body.classList.toggle('racing',!!race);
  if(passenger.userData.personIndex!==save.trips){scene.remove(passenger);disposeModel(passenger);passenger=makePassenger(save.trips);passenger.visible=job.stage==='pickup';scene.add(passenger);}
  $('balance').textContent=save.cash.toLocaleString();$('completed-count').textContent=`${save.trips} ${save.trips===1?'trip':'trips'}`;
  const active=job.stage==='pickup'||job.stage==='dropoff';
  $('job-title').textContent=race?'Make every corner count.':job.stage==='pickup'?`Let’s pick up ${job.passenger}.`:job.stage==='dropoff'?'One happy passenger.':save.trips?'Another day. Another fare.':'The city is yours.';
  $('job-description').textContent=race?'Race through the wide gates on the straights. Gold arrows show each upcoming turn.':job.stage==='pickup'?`Follow the yellow route to ${job.pickup.name}. Stop in the marked zone to pick up your passenger.`:job.stage==='dropoff'?`${job.passenger} is headed to ${job.dropoff.name}. Keep it smooth for a 20% bonus.`:'A passenger is waiting nearby. Take your next fare and get rolling.';
  $('job-person').replaceChildren(document.createTextNode(job.passenger));const small=document.createElement('small');small.textContent=job.stage==='dropoff'?`To ${job.dropoff.name}`:`Waiting at ${job.pickup.name}`;$('job-person').append(small);
  $('fare-value').textContent=`$${job.fare}`;$('job-button').hidden=active||!!race;$('job-progress').hidden=!active||!!race;
  $('passenger-avatar').src=modelPortrait('person',save.trips);$('passenger-avatar').alt=job.passenger;
  $('job-stage').textContent=job.stage==='pickup'?'Drive to pickup':'Drive to drop-off';$('map-hint').textContent=race?'Checkpoint route':active?'Your fare route':'Explore freely';
}
function routeUpdate(){
  turnMarkers.forEach(pair=>{pair.left.visible=pair.right.visible=false;});
  const dest=targetPoint();if(!dest){route=[];navigationRoute=[];turns=[];trail.count=0;return;}
  route=streetRoute(player,dest);trail.material.color.set(race?'#b9a0df':'#f8ce58');let count=0;
  navigationRoute=route;
  if(race&&race.index+1<race.config.points.length){const next=race.config.points[race.index+1];navigationRoute=[...route,...streetRoute(dest,{x:next[0],z:next[1]}).slice(1)];}
  turns=routeTurns(navigationRoute);
  turns.slice(0,4).forEach((turn,i)=>{const marker=turnMarkers[i][turn.direction];marker.visible=true;marker.position.set(turn.x,0,turn.z);marker.rotation.y=turn.yaw-Math.PI;});
  for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],d=distance(a,b);
    for(let t=0;t<d;t+=5){if(count>=400)break;const f=t/d;dummy.position.set(a.x+(b.x-a.x)*f,.25,a.z+(b.z-a.z)*f);dummy.scale.set(1,.35,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();trail.setMatrixAt(count++,dummy.matrix);}
  }
  trail.count=count;trail.instanceMatrix.needsUpdate=true;
}
function carArt(config,color){const selected=config.id===save.selected;return `<img class="car-art" alt="${config.name} 3D preview" src="${modelPortrait('car',config,color,selected?save.wheels:'classic',selected?save.stripe:false)}">`;}
function renderGarage(){
  $('car-cards').innerHTML=CARS.map(c=>{
    const owned=save.unlocked.includes(c.id),selected=c.id===save.selected;
    return `<article class="car-card ${selected?'selected':''}"><span class="car-status">${selected?'Your current ride':owned?'In your garage':'Unlock with earnings'}</span>${carArt(c,selected?save.paint:['#f8ce58','#8bafa2','#c29178','#8da6c7'][CARS.indexOf(c)])}<h3>${c.name}</h3><p>${c.tagline}</p><div class="car-stat"><span>${Math.round(c.speed*3.6)} km/h</span><div class="stat-line"><i style="width:${c.speed/Math.max(...CARS.map(x=>x.speed))*100}%"></i></div></div><div class="car-stat"><span>Handling</span><div class="stat-line"><i style="width:${c.handling/2.9*100}%"></i></div></div><button data-car="${c.id}" ${selected?'disabled':''}>${selected?'Ready to roll':owned?'Select car':`Unlock · $${c.price.toLocaleString()}`}</button></article>`;
  }).join('');
  $('car-cards').querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{
    const config=CARS.find(c=>c.id===b.dataset.car),owned=save.unlocked.includes(config.id);
    if(!selectCar(save,config.id)){toast(`Earn $${(config.price-save.cash).toLocaleString()} more to unlock the ${config.name}.`);return;}
    player.speed=0;player.travelYaw=player.yaw;player.slip=0;player.drifting=false;rebuildCar();persist();renderGarage();updateJobUI();toast(owned?`${config.name} selected.`:`${config.name} unlocked. Enjoy the ride!`);
  });
  $('swatches').innerHTML=PAINTS.map((p,i)=>`<button class="swatch ${save.paint===p?'selected':''}" style="background:${p}" data-paint="${p}" aria-label="Paint ${['taxi yellow','coral','sage green','blue','ivory','charcoal'][i]}" aria-pressed="${save.paint===p}"></button>`).join('');
  $('swatches').querySelectorAll('button').forEach(b=>b.onclick=()=>{save.paint=b.dataset.paint;rebuildCar();persist();renderGarage();});
  $('wheel-options').querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b.dataset.wheel===save.wheels);b.setAttribute('aria-pressed',b.dataset.wheel===save.wheels);b.onclick=()=>{save.wheels=b.dataset.wheel;rebuildCar();persist();renderGarage();};});
  $('stripe-toggle').checked=save.stripe;
}
$('stripe-toggle').onchange=()=>{save.stripe=$('stripe-toggle').checked;rebuildCar();persist();renderGarage();};
function renderEvents(){
  $('event-cards').innerHTML=RACES.map((r,i)=>`<article class="event-card"><div class="event-art" style="background:${r.color}"><svg viewBox="0 0 250 140" aria-hidden="true"><path d="M-20 105L70 105Q90 105 90 85V55Q90 35 110 35H175Q195 35 195 55V155" fill="none" stroke="#ffffff35" stroke-width="32"/><path d="M-20 105L70 105Q90 105 90 85V55Q90 35 110 35H175Q195 35 195 55V155" fill="none" stroke="#f5e8b6" stroke-width="2" stroke-dasharray="7 6"/><path d="M171 15v42" stroke="#354e50" stroke-width="3"/><path d="M172 15h23v17h-23z" fill="#f8ce58"/><path d="M172 15h23v17h-23z" fill="none" stroke="#354e50" stroke-dasharray="4" stroke-width="4"/></svg><span class="event-number">${i+1}</span></div><div class="event-body"><h3>${r.name}</h3><p>${r.description}</p><div class="event-stats"><span>${r.difficulty}<strong>${r.limit}s</strong></span><span>Prize<strong>$${r.reward}</strong></span><span>Personal best<strong>${save.bests[r.id]?`${save.bests[r.id].toFixed(1)}s`:'—'}</strong></span></div><button class="primary-button" data-race="${r.id}">Start race <span>↗</span></button></div></article>`).join('');
  $('event-cards').querySelectorAll('[data-race]').forEach(b=>b.onclick=()=>startRace(RACES.find(r=>r.id===b.dataset.race)));
}
function startRace(config){
  if(job.stage==='pickup'||job.stage==='dropoff'){toast('Complete your passenger’s fare before entering a race.');return;}
  race={config,index:0,elapsed:0,countdown:3};Object.assign(player,{x:config.start[0],z:config.start[1],yaw:config.yaw,travelYaw:config.yaw,slip:0,drifting:false,speed:0,steer:0,boost:1});
  start();setModal(null);setPaused(false);target.visible=false;passenger.visible=false;raceTarget.visible=true;$('race-hud').hidden=false;routeTime=2;updateJobUI();updateCamera(1,true);
}
function finishRace(win){
  const result=race;if(!result)return;
  if(win){save.cash+=result.config.reward;const best=save.bests[result.config.id];if(!best||result.elapsed<best)save.bests[result.config.id]=result.elapsed;persist();toast(`Race won in ${result.elapsed.toFixed(1)}s! +$${result.config.reward}`);}
  else toast('Race ended. Try another line and go again.');
  race=null;raceTarget.visible=false;$('race-hud').hidden=true;routeUpdate();updateJobUI();
}
$('quit-race').onclick=()=>finishRace(false);
function updateTraffic(dt){
  for(const t of traffic){
    t.progress=(t.progress+t.speed*dt)%(4*(t.hi-t.lo));const side=t.hi-t.lo,leg=Math.floor(t.progress/side),f=t.progress%side;
    if(leg===0){t.x=t.lo+f;t.z=t.lo+5;t.mesh.rotation.y=Math.PI/2;}
    if(leg===1){t.x=t.hi-5;t.z=t.lo+f;t.mesh.rotation.y=0;}
    if(leg===2){t.x=t.hi-f;t.z=t.hi-5;t.mesh.rotation.y=-Math.PI/2;}
    if(leg===3){t.x=t.lo+5;t.z=t.hi-f;t.mesh.rotation.y=Math.PI;}
    t.mesh.position.set(t.x,0,t.z);
    if(distance(player,t)<4 && Math.abs(player.speed)>6 && player.collisionCooldown<=0){player.speed*=.25;player.crashes++;player.collisionCooldown=1.5;toast('A little bump. Take it easy around traffic.');}
  }
}
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),wheelPos=new THREE.Vector3();
let smokeAccum=0,skidDistance=0,driftScore=0,driftHold=0;
function spawnSmoke(){
  const wheel=rearWheels[puffCursor%rearWheels.length];if(!wheel)return;
  wheel.getWorldPosition(wheelPos);
  const q=puffs[puffCursor];puffCursor=(puffCursor+1)%puffs.length;
  const dx=wheelPos.x-player.x,dz=wheelPos.z-player.z,len=Math.hypot(dx,dz)||1;
  q.x=wheelPos.x+(Math.random()-.5)*.4;q.y=.42;q.z=wheelPos.z+(Math.random()-.5)*.4;
  q.vx=dx/len*(.9+Math.random());q.vz=dz/len*(.9+Math.random());q.vy=.9+Math.random()*.9;
  q.age=0;q.life=.9+Math.random()*.6;q.size=1.9+Math.random()*1.5;
}
function laySkidMarks(){
  for(const wheel of rearWheels){
    wheel.getWorldPosition(wheelPos);
    markX[markCursor]=wheelPos.x;markZ[markCursor]=wheelPos.z;markYaw[markCursor]=player.travelYaw;
    markTime[markCursor]=totalTime;markFactor[markCursor]=1;
    dummy.position.set(wheelPos.x,MARK_Y,wheelPos.z);dummy.rotation.set(0,player.travelYaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
    marks.setMatrixAt(markCursor,dummy.matrix);
    markCursor=(markCursor+1)%MARKS;
  }
  marks.instanceMatrix.needsUpdate=true;
}
function updateDriftEffects(dt){
  if(player.drifting){
    driftHold=1.2;driftScore+=Math.abs(player.speed)*Math.abs(player.slip)*dt*4;
    smokeAccum+=dt*(14+Math.abs(player.speed)*.4);skidDistance+=Math.abs(player.speed)*dt;
    while(smokeAccum>=1){smokeAccum-=1;spawnSmoke();}
    if(skidDistance>.7){skidDistance=0;laySkidMarks();}
  } else {smokeAccum=0;skidDistance=0;driftHold=Math.max(0,driftHold-dt);if(driftHold<=0)driftScore=0;}
  let smokeDirty=false;
  for(let i=0;i<puffs.length;i++){
    const q=puffs[i];if(q.age>=q.life)continue;
    q.age+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;
    q.vx*=Math.max(0,1-dt*1.6);q.vz*=Math.max(0,1-dt*1.6);
    const t=Math.min(1,q.age/q.life),s=q.size*(.5+t)*(1-t);
    dummy.position.set(q.x,q.y,q.z);dummy.rotation.set(0,0,0);dummy.scale.set(s,s,s);dummy.updateMatrix();
    smoke.setMatrixAt(i,dummy.matrix);smokeDirty=true;
  }
  if(smokeDirty)smoke.instanceMatrix.needsUpdate=true;
  let marksDirty=false;
  for(let i=0;i<MARKS;i++){
    if(markTime[i]<-1e8)continue;
    const age=totalTime-markTime[i];
    const f=age>MARK_LIFE?0:age>MARK_FADE_START?1-(age-MARK_FADE_START)/(MARK_LIFE-MARK_FADE_START):1;
    if(f===markFactor[i])continue;
    markFactor[i]=f;
    dummy.position.set(markX[i],MARK_Y,markZ[i]);dummy.rotation.set(0,markYaw[i],0);dummy.scale.set(f,1,f);dummy.updateMatrix();
    marks.setMatrixAt(i,dummy.matrix);marksDirty=true;
  }
  if(marksDirty)marks.instanceMatrix.needsUpdate=true;
}
function updateCamera(dt,instant=false){
  const sx=Math.sin(player.yaw),sz=Math.cos(player.yaw);
  car.visible=!cameraMode;
  if(cameraMode){camPos.set(player.x+sx*.4,2.55,player.z+sz*.4);camLook.set(player.x+sx*30,2.3,player.z+sz*30);camera.position.copy(camPos);camera.lookAt(camLook);camera.rotateZ(player.slip*.05);steeringWheel.rotation.z=-player.steer*.55;}
  else{const back=17+Math.abs(player.speed)*.11;camPos.set(player.x-sx*back,10.6+Math.abs(player.speed)*.045,player.z-sz*back);camLook.set(player.x+sx*10,1.3,player.z+sz*10);camera.position.lerp(camPos,instant?1:1-Math.exp(-dt*5));camera.lookAt(camLook);camera.rotateZ(player.slip*.06);}
  const desiredFov=58+Math.min(9,Math.abs(player.speed)*.15);camera.fov+=(desiredFov-camera.fov)*(instant?1:Math.min(1,dt*3));camera.updateProjectionMatrix();
  sun.position.set(player.x-85,160,player.z+65);sun.target.position.set(player.x,0,player.z);
}
function drawMap(){
  const ctx=mapCtx,w=300,h=300,scale=.62,ox=150-player.x*scale,oz=150-player.z*scale;
  const mx=x=>ox+x*scale,mz=z=>oz+z*scale;
  ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(150,150,149,0,Math.PI*2);ctx.clip();ctx.fillStyle='#b9d3ac';ctx.fillRect(0,0,w,h);ctx.fillStyle='#69bed4';ctx.fillRect(mx(338),0,w-mx(338),h);
  ctx.fillStyle='#9abb92';ctx.fillRect(mx(-222),mz(18),84*scale,84*scale);ctx.fillRect(mx(138),mz(138),84*scale,84*scale);
  ctx.strokeStyle='#f9f9ec';ctx.lineWidth=7.5;
  for(const r of ROADS){ctx.beginPath();ctx.moveTo(mx(r),mz(-314));ctx.lineTo(mx(r),mz(314));ctx.stroke();ctx.beginPath();ctx.moveTo(mx(-314),mz(r));ctx.lineTo(mx(314),mz(r));ctx.stroke();}
  if(navigationRoute.length>1){ctx.strokeStyle=race?'#9867d7':'#da9c25';ctx.lineWidth=4;ctx.setLineDash([5,3]);ctx.beginPath();navigationRoute.forEach((p,i)=>i?ctx.lineTo(mx(p.x),mz(p.z)):ctx.moveTo(mx(p.x),mz(p.z)));ctx.stroke();ctx.setLineDash([]);}
  for(const turn of turns){ctx.fillStyle='#294564';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText(turn.direction==='left'?'↰':'↱',mx(turn.x),mz(turn.z)-5);}
  for(const r of RACES){ctx.fillStyle='#967ab1';ctx.beginPath();ctx.arc(mx(r.start[0]),mz(r.start[1]),3,0,Math.PI*2);ctx.fill();}
  const dest=targetPoint();if(dest){let dx=(dest.x-player.x)*scale,dz=(dest.z-player.z)*scale;const radius=Math.hypot(dx,dz);if(radius>131){dx*=131/radius;dz*=131/radius;}ctx.fillStyle=race?'#9967d7':job.stage==='dropoff'?'#438e7d':'#e6b23c';ctx.beginPath();ctx.arc(150+dx,150+dz,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff9df';ctx.lineWidth=2;ctx.stroke();}
  else{ctx.fillStyle='#e6b23c';ctx.beginPath();ctx.arc(mx(job.pickup.x),mz(job.pickup.z),4,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(mx(player.x),mz(player.z));ctx.rotate(-player.yaw);ctx.fillStyle='#203134';ctx.strokeStyle='#fff9df';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-5,-5);ctx.lineTo(0,-2);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#294564';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('N',150,21);ctx.restore();
}
function updateHUD(){
  $('speed').textContent=Math.round(Math.abs(player.speed)*3.6);$('gear').textContent=Math.abs(player.speed)<.4?'N':player.speed<0?'R':Math.min(5,1+Math.floor(player.speed/8));
  $('drift-meter').hidden=driftHold<=0;if(driftHold>0)$('drift-score').textContent=Math.round(driftScore);
  $('boost-charge').style.width=`${player.boost*100}%`;$('boost-meter').setAttribute('aria-valuenow',Math.round(player.boost*100));
  const district=player.x>230?'Palm Promenade':player.z<-170?'Station quarter':player.x<-170?'Old Town':player.z>170?'Southside':player.x<0&&player.z>0?'The Green':'Market district';$('district').textContent=district;
  const dest=targetPoint();$('target-label').hidden=!dest;
  $('turn-guidance').hidden=!dest;document.body.classList.toggle('navigating',!!dest);
  if(dest){const turn=turns[0];$('turn-symbol').textContent=turn?(turn.direction==='left'?'↰':'↱'):'↑';$('turn-name').textContent=turn?`Turn ${turn.direction}`:'Keep straight';$('turn-distance').textContent=turn?`In ${Math.round(turn.distance)} m`:race?'Drive through the gate':'Follow your fare route';}
  if(dest){
    const d=distance(player,dest),routeLength=route.reduce((sum,p,i)=>i?sum+distance(route[i-1],p):0,0);$('job-distance').textContent=`${Math.round(routeLength||d)} m`;
    $('job-progress-bar').style.width=`${clamp(job.stopTime*100,5,100)}%`;
    const label=$('target-label');label.replaceChildren(document.createTextNode(race?'Checkpoint':job.stage==='pickup'?'Pickup':'Drop-off'));
    const detail=document.createElement('span');detail.textContent=d<16?(race?'Drive through':'Slow down & stop'):`${Math.round(d)} m`;label.append(detail);
    const p=new THREE.Vector3(dest.x,9,dest.z).project(camera);
    if(p.z>1||p.z<-1||Math.abs(p.x)>.95||Math.abs(p.y)>.8){label.style.left='50%';label.style.top='68%';}
    else{label.style.left=`${(p.x*.5+.5)*innerWidth}px`;label.style.top=`${(-p.y*.5+.5)*innerHeight}px`;}
  }
  if(race){$('race-checkpoint').textContent=`Gate ${race.index+1} / ${race.config.points.length}`;$('race-time').textContent=race.countdown>0?`${Math.ceil(race.countdown)}`:`${Math.floor(race.elapsed/60)}:${(race.elapsed%60).toFixed(1).padStart(4,'0')}`;$('race-limit').textContent=race.countdown>0?'Get ready…':`${Math.max(0,race.config.limit-race.elapsed).toFixed(1)}s left`;}
  drawMap();
}
function resize(){if(needsLandscape())clearInput();renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();updateCamera(1,true);}
addEventListener('resize',resize);
updateJobUI();updateCamera(1,true);updateTraffic(0);updateHUD();$('loading').hidden=true;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;
  const running=started&&!paused&&!modal&&!needsLandscape();
  if(running){
    totalTime+=dt;
    const previous={x:player.x,z:player.z};
    if(race&&race.countdown>0){race.countdown-=dt;}
    else {const steps=Math.ceil(dt/(1/60));for(let i=0;i<steps;i++)stepPlayer(player,input,carConfig,dt/steps,city.obstacles);}
    updateTraffic(dt);
    if(race&&race.countdown<=0){
      race.elapsed+=dt;
      if(race.elapsed>race.config.limit)finishRace(false);
      else if(passedCheckpoint(previous,player,targetPoint())){race.index++;if(race.index===race.config.points.length)finishRace(true);else routeTime=2;}
    }
    if(!race){const result=advanceJob(job,player,dt);if(result?.type==='picked-up'){passenger.visible=false;routeTime=2;toast(`${job.passenger} is on board. Next stop: ${job.dropoff.name}.`);updateJobUI();}if(result?.type==='completed'){save.cash+=result.amount;save.trips++;persist();toast(`Fare complete! +$${result.amount}${result.bonus?' including smooth-driving bonus.':'.'}`);job=createJob(save.trips);target.visible=false;route=[];trail.count=0;updateJobUI();}}
    routeTime+=dt;if(routeTime>.3){routeTime=0;routeUpdate();}
    updateCamera(dt);
  }
  car.position.set(player.x,Math.sin(totalTime*9)*Math.abs(player.speed)*.001,player.z);car.rotation.y=player.yaw;car.rotation.z=-player.steer*Math.abs(player.speed)*.0018;car.userData.frontWheels.forEach(w=>w.rotation.y=player.steer*.4);
  if(running)car.userData.spinners.forEach(w=>w.rotation.x+=player.speed*dt/(car.userData.wheelRadius||.7));car.userData.flames.visible=running&&input.boost&&input.forward&&player.boost>.03&&player.speed>8;car.userData.flames.scale.z=1+Math.sin(totalTime*39)*.2;
  if(running)updateDriftEffects(dt);
  const dest=targetPoint();if(dest){const marker=race?raceTarget:target;marker.position.set(dest.x,0,dest.z);marker.userData.arrow.position.y=(race?10:8)+Math.sin(totalTime*3)*.4;marker.userData.arrow.rotation.y=totalTime*.7;if(race)marker.rotation.y=ROADS.includes(dest.x)?0:Math.PI/2;}
  if(passenger.visible){passenger.position.set(job.pickup.x+4,0,job.pickup.z);passenger.rotation.y=Math.atan2(player.x-passenger.position.x,player.z-passenger.position.z);passenger.userData.arm.rotation.z=2.5+Math.sin(totalTime*4)*.25;}
  if(gain){gain.gain.setTargetAtTime(sound && running ? .018 : 0,audioContext.currentTime,.1);oscillator.frequency.setTargetAtTime(45+Math.abs(player.speed)*5+(player.drifting?13:0),audioContext.currentTime,.08);}
  hudTime+=dt;if(hudTime>.1){hudTime=0;updateHUD();}
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
window.taxiHandleBack=()=>{if(modal){setModal(null);return 'stay';}if(!paused){setPaused(true);return 'stay';}return 'exit';};
addEventListener('taxi-native-pause',()=>{clearInput();if(started)setPaused(true);});
// Development-only hooks allow full gameplay tests without timing-dependent keyboard routes.
if(new URLSearchParams(location.search).has('test')&&['localhost','127.0.0.1'].includes(location.hostname)){
  window.__taxiTest={snapshot:()=>({player:{...player},save:structuredClone(save),job:structuredClone(job),race:race?{index:race.index,elapsed:race.elapsed,id:race.config.id,countdown:race.countdown}:null,modal,paused,cameraMode,route:structuredClone(route),turns:structuredClone(turns)}),effects:()=>({livePuffs:puffs.filter(q=>q.age<q.life).length,marksLaid:markTime.filter(t=>t>-1e8).length,liveMarks:markTime.filter(t=>t>-1e8&&totalTime-t<MARK_LIFE).length,driftScore:Math.round(driftScore)}),teleport:(x,z,yaw=player.yaw,speed=0)=>{Object.assign(player,{x,z,yaw,speed,steer:0,travelYaw:yaw+(speed<0?Math.PI:0),slip:0,drifting:false});routeTime=2;updateCamera(1,true);},target:()=>targetPoint(),setCash:value=>{save.cash=value;persist();updateJobUI();},raceReady:()=>{if(race)race.countdown=0;}};
}
