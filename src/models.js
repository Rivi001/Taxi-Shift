import { makeCar } from './vehicles.js';
import * as THREE from '../vendor/three.module.js';

const ramp=new THREE.DataTexture(new Uint8Array([65,135,205,255]),4,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const materials=new Map();
let taxiTexture;
function toon(color){if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color,gradientMap:ramp}));return materials.get(color);}
function part(geometry,color,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,toon(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function box(w,h,d,color,x=0,y=0,z=0,b=.07){
  b=Math.min(b,w/4,h/4,d/4);const shape=new THREE.Shape(),wx=w/2-b,dz=d/2-b;
  shape.moveTo(-wx,-dz);shape.lineTo(wx,-dz);shape.lineTo(wx,dz);shape.lineTo(-wx,dz);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h-2*b,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:b,bevelThickness:b});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+b,0);
  return part(geo,color,x,y,z);
}
function sphere(rx,ry,rz,color,x,y,z){const m=part(new THREE.SphereGeometry(1,12,9),color,x,y,z);m.scale.set(rx,ry,rz);return m;}
function quad(points,color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const mesh=part(g,color);mesh.material=toon(color);return mesh;}
function outline(mesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,32),new THREE.LineBasicMaterial({color:'#263e50',transparent:true,opacity:.65}));mesh.add(edge);}

export { makeCar } from './vehicles.js';

export function makePassenger(index=0){
  const g=new THREE.Group(),skin=['#e4ac86','#a9674f','#f3c5a2','#c98d65'][index%4],hair=['#30344c','#614539','#9b503e','#252e43'][index%4],shirt=['#f4878d','#6b9fdf','#eecb64','#8fcab0'][index%4];
  g.add(sphere(.34,.51,.22,shirt,0,1.43,0));g.add(box(.49,.17,.35,'#e9e6d8',0,1.03,0,.06));
  for(const x of [-.16,.16]){
    const leg=part(new THREE.CapsuleGeometry(.13,.62,3,8),'#374962',x,.64,0);g.add(leg);
    g.add(box(.29,.19,.47,'#faf1df',x,.16,.1,.07));g.add(box(.31,.07,.49,'#577991',x,.055,.10,.02));
  }
  g.add(part(new THREE.CapsuleGeometry(.105,.15,3,8),skin,0,1.93,0));
  g.add(sphere(.36,.43,.32,skin,0,2.25,0));
  for(const x of [-.36,.36])g.add(sphere(.075,.115,.08,skin,x,2.23,0));
  const cap=part(new THREE.SphereGeometry(.38,12,10,0,Math.PI*2,0,Math.PI*.56),hair,0,2.31,-.025);g.add(cap);
  for(let i=0;i<5;i++){const tuft=part(new THREE.ConeGeometry(.14,.38,4),hair,-.29+i*.14,2.49,.24);tuft.rotation.z=Math.PI+(.5-i*.2);g.add(tuft);}
  if(index%2===0){g.add(sphere(.35,.38,.20,hair,0,2.05,-.24));g.add(sphere(.16,.31,.15,hair,.36,2.27,-.22));}
  for(const x of [-.135,.135]){
    g.add(sphere(.082,.119,.037,'#fff9ed',x,2.28,.291));g.add(sphere(.045,.083,.025,'#355b76',x,2.275,.326));g.add(sphere(.018,.044,.016,'#213248',x,2.275,.349));g.add(sphere(.016,.022,.013,'#ffffff',x-.012,2.306,.361));
    const brow=box(.14,.025,.033,hair,x,2.438,.286,.008);brow.rotation.z=x<0?.09:-.09;g.add(brow);
    g.add(sphere(.07,.026,.012,'#dc9180',x*1.45,2.14,.283));
  }
  g.add(sphere(.052,.065,.061,skin,0,2.18,.32));g.add(box(.11,.025,.035,'#9e5c55',0,2.06,.292,.008));
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.35,1.72,0);g.add(arm);
    arm.add(part(new THREE.CapsuleGeometry(.125,.20,3,8),shirt,0,-.14,0));arm.add(part(new THREE.CapsuleGeometry(.085,.31,3,8),skin,0,-.43,0));arm.add(sphere(.10,.12,.08,skin,0,-.67,0));arm.rotation.z=side*.12;arms.push(arm);
  }
  g.add(box(.42,.54,.19,'#ad668d',0,1.42,-.28,.08));
  for(const x of [-.20,.20])g.add(box(.055,.68,.045,'#b57197',x,1.43,.20,.01));
  g.userData.arm=arms[1];g.userData.arm.rotation.z=2.5;g.userData.personIndex=index;return g;
}

export function disposeModel(model){model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.isLineSegments||o.material?.isMeshBasicMaterial)o.material.dispose();});}

let portraitRenderer;
const portraits=new Map();
export function modelPortrait(kind,config,paint,wheels='classic',stripe=false){
  const key=JSON.stringify([kind,config,paint,wheels,stripe]);if(portraits.has(key))return portraits.get(key);
  if(!portraitRenderer){portraitRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});portraitRenderer.setSize(480,260);portraitRenderer.setPixelRatio(1);portraitRenderer.toneMapping=THREE.ACESFilmicToneMapping;portraitRenderer.toneMappingExposure=1;}
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#eff8ff','#6a809c',1.7));const light=new THREE.DirectionalLight('#fff0d4',2.5);light.position.set(-4,8,5);scene.add(light);
  const model=kind==='car'?makeCar(config,paint,wheels,stripe):makePassenger(config);if(kind==='person')model.userData.arm.rotation.z=.12;scene.add(model);
  const camera=new THREE.PerspectiveCamera(kind==='car'?38:32,480/260,.1,60);
  if(kind==='car'){camera.position.set(7,4.6,9);camera.lookAt(0,1.2,0);camera.zoom=1.8;camera.updateProjectionMatrix();}else{camera.position.set(0,2.3,2.1);camera.lookAt(0,2.25,0);}
  portraitRenderer.render(scene,camera);const url=portraitRenderer.domElement.toDataURL('image/png');
  disposeModel(model);
  portraits.set(key,url);if(portraits.size>40)portraits.delete(portraits.keys().next().value);return url;
}
