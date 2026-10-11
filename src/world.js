import * as THREE from '../vendor/three.module.js';
import { ROADS, ROAD_WIDTH, LANDMARKS } from './core.js';
export { THREE };
const mats=new Map();
const ramp=new THREE.DataTexture(new Uint8Array([80,150,215,255]),4,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
export function material(color, extra={}) {const key=color+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new THREE.MeshToonMaterial({color,gradientMap:ramp,...extra}));return mats.get(key);}
function meshBox(w,h,d,color,x=0,y=0,z=0,extra={}) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
export { makeCar, makePassenger } from './models.js';
// Traffic cars are rigid scenery: merge their parts per material to reduce draw calls on phones.
export function compactCar(group) {
  group.updateMatrixWorld(true);
  const parts=new Map();
  group.traverseVisible(o=>{if(!o.isMesh)return;let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(geo.index){const indexed=geo;geo=geo.toNonIndexed();indexed.dispose();}if(!parts.has(o.material))parts.set(o.material,[]);parts.get(o.material).push(geo);});
  const result=new THREE.Group();
  for(const [mat,geos] of parts){
    const merged=new THREE.BufferGeometry();
    for(const name of ['position','normal']){
      const size=geos[0].getAttribute(name).itemSize,length=geos.reduce((sum,g)=>sum+g.getAttribute(name).array.length,0),values=new Float32Array(length);let offset=0;
      for(const g of geos){const a=g.getAttribute(name).array;values.set(a,offset);offset+=a.length;}
      merged.setAttribute(name,new THREE.BufferAttribute(values,size));
    }
    const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=!mat.transparent;mesh.receiveShadow=true;result.add(mesh);geos.forEach(g=>g.dispose());
  }
  group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isLineSegments||o.material?.isMeshBasicMaterial&&!parts.has(o.material))o.material.dispose();});return result;
}
function labelTexture(text,ink,bg) {const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,256,80);ctx.fillStyle=ink;ctx.font='bold 43px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,41);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
export function createCity(scene) {
  const obstacles=[],batches=new Map(),dummy=new THREE.Object3D();
  const geos={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,10,7),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,8)};
  function add(shape,color,x,y,z,w,h,d,rotation=0,shadow=true) {const key=shape+color+shadow; if(!batches.has(key))batches.set(key,{shape,color,shadow,items:[]});batches.get(key).items.push({x,y,z,w,h,d,rotation});}
  const box=(color,x,y,z,w,h,d,rot=0,shadow=true)=>add('box',color,x,y,z,w,h,d,rot,shadow);
  box('#90bf7e',0,-.4,0,680,.5,680,0,false);
  // Broad bay to the east, a sandy edge, and accessible connected piers.
  box('#37abc7',590,-.52,0,500,.3,1300,0,false);
  box('#d6d2ab',340,-.15,0,18,.5,660,0,false);
  for(let i=0;i<45;i++){box('#97c7c6',380+(i%5)*70,-.35,-500+Math.floor(i/5)*125,35,.05,1.5,0,false);}
  for(const r of ROADS) {
    box('#e4d7b9',r,-.07,0,ROAD_WIDTH+7,.18,630,0,false);box('#e4d7b9',0,-.07,r,630,.18,ROAD_WIDTH+7,0,false);
    box('#52687f',r,.035,0,ROAD_WIDTH,.08,630,0,false);box('#52687f',0,.04,r,630,.08,ROAD_WIDTH,0,false);
    for(let v=-309;v<315;v+=12) {
      if(ROADS.some(t=>Math.abs(t-v)<18))continue;
      box('#e8d9a0',r,.092,v,.35,.025,5,0,false);box('#e8d9a0',v,.097,r,5,.025,.35,0,false);
    }
  }
  for(const x of ROADS)for(const z of ROADS) {
    for(const side of [-1,1])for(let k=-4;k<=4;k++){
      box('#d7ddcc',x+k*2.2,.106,z+side*15,1.15,.025,3,0,false);
      box('#d7ddcc',x+side*15,.111,z+k*2.2,3,.025,1.15,0,false);
    }
  }
  let seed=23;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  function tree(x,z,palm=false) {
    if(palm){add('cylinder','#a29372',x,4,z,.4,8,.4);for(let i=0;i<5;i++)box('#56876d',x+Math.sin(i*1.256)*2.2,8.15,z+Math.cos(i*1.256)*2.2,1,.3,6,i*1.256);}
    else{const blossom=Math.abs(Math.round(x+z))%3===0;add('cylinder','#957354',x,2.1,z,.45,4.2,.45);add('sphere',blossom?'#e79db9':'#56a773',x,5.8,z,3.6,3.7,3.6);add('sphere',blossom?'#f9bfd3':'#83c87d',x+1.4,7.2,z+.4,2.9,2.7,2.9);add('sphere',blossom?'#f1afc8':'#78bb80',x-2.0,5.7,z-.5,2.4,2.4,2.5);}
  }
  function building(x,z,w,d,h,color) {
    obstacles.push({x,z,w,d});
    box(color,x,h/2,z,w,h,d);
    box('#fff0cc',x,h+.28,z,w+1,.55,d+1);
    box('#677c92',x,.28,z,w+.25,.5,d+.25);
    box('#b4baab',x+2,h+.9,z-2,5,1.2,4);
    for(let level=3;level<h-1;level+=4) {
      box('#ecdac0',x,level-1.2,z,w+.16,.13,d+.16,0,false);
      for(let xx=-w/2+3;xx<w/2-1;xx+=5){
        box('#3f6988',x+xx,level,z+d/2+.035,2.0,2.0,.06,0,false);box('#3f6988',x+xx,level,z-d/2-.035,2.0,2.0,.06,0,false);
        box('#a1d4e5',x+xx-.55,level+.1,z+d/2+.075,.23,1.65,.04,0,false);box('#f2e5c9',x+xx,level-1.1,z+d/2+.30,2.3,.18,.65);
      }
      for(let zz=-d/2+3;zz<d/2-1;zz+=5){box('#3f6988',x+w/2+.035,level,z+zz,.06,2.0,2,0,false);box('#3f6988',x-w/2-.035,level,z+zz,.06,2.0,2,0,false);box('#a1d4e5',x+w/2+.08,level+.1,z+zz-.55,.04,1.6,.23,0,false);}
    }
    box('#506b65',x,1.4,z+d/2+.06,2.3,2.8,.12);
    if(h<21){
      box('#f38388',x,3.1,z+d/2+1.7,w*.75,.25,3.2);
      for(let stripe=-w*.34;stripe<w*.35;stripe+=2.8)box('#fff1d4',x+stripe,3.25,z+d/2+1.7,1.25,.05,3.25,0,false);
      for(const sx of [-1,1])box('#58788b',x+sx*w*.36,1.5,z+d/2+3,.15,3,.15);
      box('#3d6984',x,1.5,z+d/2+.12,w*.48,2.6,.13);box('#fff1d4',x,1.5,z+d/2+.2,.14,2.65,.14);
    }
  }
  const palette=['#eda78d','#e8d69c','#8ebfae','#de94a7','#82b7d5','#b0a1cc','#ecc58c'];
  for(let ix=0;ix<ROADS.length-1;ix++)for(let iz=0;iz<ROADS.length-1;iz++) {
    const x0=ROADS[ix],x1=ROADS[ix+1],z0=ROADS[iz],z1=ROADS[iz+1],cx=(x0+x1)/2,cz=(z0+z1)/2;
    const bw=x1-x0-38,bd=z1-z0-38;
    if((ix===2&&iz===3)||(ix===4&&iz===4)) {
      box('#8eb185',cx,.12,cz,bw,.1,bd);
      box('#d9d5b4',cx,.21,cz,5,.12,bd);box('#d9d5b4',cx,.21,cz,bw,.12,5);
      for(let i=0;i<14;i++)tree(cx+(random()-.5)*(bw-8),cz+(random()-.5)*(bd-8));
      box('#9dbdc0',cx+18,.25,cz+12,15,.1,12);
      add('cylinder','#d3d6c6',cx,1.1,cz,6,.8,6);add('cylinder','#85b6b5',cx,1.56,cz,5.1,.1,5.1);
      continue;
    }
    if(bw<35||bd<35){building(cx,cz,bw*.66,bd*.64,8+random()*12,palette[(ix+iz)%palette.length]);continue;}
    for(let a=0;a<2;a++)for(let b=0;b<2;b++){
      const x=cx+(a?1:-1)*bw*.26,z=cz+(b?1:-1)*bd*.26;
      const h=8+random()*23+(ix===3&&iz===2?12:0);
      building(x,z,bw*.38,bd*.37,h,palette[Math.floor(random()*palette.length)]);
    }
    for(const side of [-1,1]){tree(cx+side*(bw/2-3),cz);tree(cx,cz+side*(bd/2-3));}
  }
  // The promenade includes lamps, palms, railings, piers, boats, and seating.
  for(let z=-285;z<=300;z+=30) {
    tree(321,z,true);box('#62756f',327,2,z,.22,4,.22);box('#f1dab0',327,4.2,z,.9,.3,.9);
    box('#9c8d6c',329,.8,z+8,1.4,.3,3.2);box('#65786b',329,.4,z+8,1,.8,.2);
  }
  for(const z of [-200,-80,80,200]) {
    box('#b7a789',369,.05,z,70,.4,8);box('#d0be98',402,1.2,z,1,2.2,9);
    for(const zz of [z-15,z+15]) {
      box('#e4e4d6',379,0,zz,15,2,5);box('#97aaaa',381,2,zz,6,2,3.8);
      box('#e2e4d6',377,8,zz,.2,15,.2);add('cone','#f4ebd3',379,7,zz,4,9,.2,Math.PI/2);
    }
  }
  for(let i=0;i<11;i++) {
    const x=-660+i*100,z=-510-random()*150;
    add('cone',i%2?'#9bbcb0':'#acc7b6',x,30,z,100+random()*100,90+random()*110,110,0,false);
  }
  // Soft cloud banks and flowering planters complete the illustrated coastal skyline.
  for(let i=0;i<15;i++){const x=-650+i*90,z=-390-(i%3)*130,y=75+(i%4)*10;for(let j=0;j<3;j++)add('sphere','#f8f5ee',x+j*17,y+(j===1?7:0),z,22,11,12,0,false);}
  for(const x of [-120,0,120])for(const z of [-120,0,120]){
    box('#ba8375',x+20,.6,z-22,3.4,1.2,2.1);
    for(let k=0;k<4;k++){add('sphere',k%2?'#f3b5cc':'#efcf71',x+19+k*.65,1.55,z-22,.43,.45,.4);}
  }
  // Street lamps double as clear intersection landmarks.
  for(const x of [-240,-120,0,120,240])for(const z of [-240,-120,0,120,240]) {
    box('#536e68',x+17,3.3,z+17,.3,6.6,.3);box('#e8dab2',x+17,6.8,z+17,1.3,.4,1.3);
  }
  for(const batch of batches.values()) {
    const mesh=new THREE.InstancedMesh(geos[batch.shape],material(batch.color),batch.items.length);
    batch.items.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.set(0,b.rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=batch.shadow;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  }
  for(const landmark of LANDMARKS) {
    const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(landmark.name,'#38594f','#f0efdb'),depthTest:true}));
    sign.position.set(landmark.x+16,5,landmark.z+12);sign.scale.set(12,3.75,1);scene.add(sign);
  }
  return {obstacles};
}
export function makeDestination(color='#f8ce58') {
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(9.5,11,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.15;g.add(ring);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(9.5,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.12,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.y=.14;g.add(disk);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.0,4,22,12,1,true),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.1,depthWrite:false}));beam.position.y=11;g.add(beam);
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(1.8,2.8,4),material(color,{emissive:color,emissiveIntensity:.2}));arrow.rotation.z=Math.PI;arrow.position.y=8;g.add(arrow);g.userData.arrow=arrow;
  return g;
}
