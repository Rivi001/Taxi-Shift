import * as THREE from '../vendor/three.module.js';

export function makeRaceGate(){
  const g=new THREE.Group(),frame=new THREE.MeshToonMaterial({color:'#9875ef'}),ink=new THREE.MeshBasicMaterial({color:'#303854'}),light=new THREE.MeshBasicMaterial({color:'#d4c5ff'});
  function block(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);}
  for(const x of [-13,13]){block(.8,8,.8,x,4,0,frame);block(.18,6.6,1,x,4.1,0,light);block(2,.25,2,x,.13,0,ink);}
  block(26.8,.9,.8,0,8,0,frame);
  for(let i=0;i<18;i++)block(1.45,.04,1.7,-12.3+i*1.45,.13,0,i%2?light:ink);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(25.3,6.8),new THREE.MeshBasicMaterial({color:'#b39aff',transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false}));plane.position.y=3.8;g.add(plane);
  const arrow=new THREE.Mesh(new THREE.OctahedronGeometry(1.3),light);arrow.position.y=10;g.add(arrow);g.userData.arrow=arrow;return g;
}
const textures={};
function arrowTexture(direction){
  if(textures[direction])return textures[direction];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  const sign=direction==='left'?-1:1;
  c.lineJoin='round';c.lineCap='round';
  const draw=(color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(128,220);c.lineTo(128,140);c.quadraticCurveTo(128,85,128+sign*48,85);c.lineTo(128+sign*85,85);c.stroke();c.beginPath();c.moveTo(128+sign*52,51);c.lineTo(128+sign*88,85);c.lineTo(128+sign*52,119);c.stroke();};
  draw('#253959',43);draw('#fff0a5',27);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures[direction]=texture;return texture;
}
export function makeTurnMarker(direction){
  const g=new THREE.Group();
  const mat=new THREE.MeshBasicMaterial({map:arrowTexture(direction),transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
  const road=new THREE.Mesh(new THREE.PlaneGeometry(16,16),mat);road.rotation.x=-Math.PI/2;road.position.y=.19;g.add(road);
  // A second upright sign stays legible from a low driver camera.
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,5),mat);sign.position.set(direction==='left'?12:-12,4,-2);g.add(sign);
  g.visible=false;return g;
}
