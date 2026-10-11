import * as THREE from '../vendor/three.module.js';

// Original die-cast-inspired designs: curved sheet metal, inset glass and oversized wheels.
const materials=new Map();let environment,taxiTexture;
function studioEnvironment(){
  if(environment)return environment;
  const faces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'#e9f5ff');gradient.addColorStop(.45,'#b5c9dc');gradient.addColorStop(.52,'#718699');gradient.addColorStop(1,'#243344');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);ctx.fillStyle=i===2?'#ffffff':'#f4f8ff';ctx.fillRect(8,10,112,13);if(i%2===0)ctx.fillRect(90,22,10,69);return c;});
  environment=new THREE.CubeTexture(faces);environment.colorSpace=THREE.SRGBColorSpace;environment.needsUpdate=true;return environment;
}
function surface(color,type='paint'){
  const key=color+type;if(materials.has(key))return materials.get(key);
  const props=type==='paint'?{metalness:.48,roughness:.27,clearcoat:1,clearcoatRoughness:.13}:type==='glass'?{metalness:.25,roughness:.12,clearcoat:1}:type==='chrome'?{metalness:.95,roughness:.23}:type==='rubber'?{metalness:0,roughness:.91}:{metalness:.25,roughness:.46};
  const mat=new THREE.MeshPhysicalMaterial({color,...props,envMap:studioEnvironment(),envMapIntensity:type==='rubber'?.2:.85});materials.set(key,mat);return mat;
}
function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function rounded(w,h,d,mat,x=0,y=0,z=0,r=.08){
  r=Math.min(r,w/4,h/4,d/4);const s=new THREE.Shape(),a=w/2-r,b=d/2-r;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth:h-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2+r,0);return mesh(geo,mat,x,y,z);
}
function panel(points,mat){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(geo,mat);}
function rod(a,b,r,mat){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function bodyLoft(stations,mat){
  const positions=[],indices=[];
  for(const [z,w,y] of stations){
    for(const [x,dy] of [[-1,-.11],[-.93,0],[-.66,.07],[0,.10],[.66,.07],[.93,0],[1,-.11],[.80,-.23],[-.80,-.23]])positions.push(x*w,y+dy,z);
  }
  const n=9;for(let j=0;j<stations.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=b+n,d=a+n;indices.push(a,d,b,b,d,c);}
  for(let i=1;i<n-1;i++){indices.push(0,i,i+1);const a=(stations.length-1)*n;indices.push(a,a+i+1,a+i);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,mat);
}
function sidePanel(l,axle,r,wy,x,mat){
  const s=new THREE.Shape();s.moveTo(-l/2,.55);s.lineTo(-l/2,1.34);s.quadraticCurveTo(-l*.44,1.87,-axle,wy+r+.14);s.quadraticCurveTo(-axle+.4,wy+r+.14,-axle+r+.12,1.48);s.lineTo(axle-r-.12,1.48);s.quadraticCurveTo(axle-.4,wy+r+.14,axle,wy+r+.14);s.quadraticCurveTo(l*.44,1.77,l/2,1.24);s.lineTo(l/2,.55);
  for(const z of [axle,-axle]){s.lineTo(z+r,.55);s.lineTo(z+r,wy);s.absarc(z,wy,r,0,Math.PI,false);s.lineTo(z-r,.55);}
  s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1});geo.rotateY(-Math.PI/2);return mesh(geo,mat,x,0,0);
}
function fender(side,w,z,wy,r,mat){
  const positions=[],indices=[];
  for(let i=0;i<=28;i++){
    const a=i*Math.PI/28,along=z+Math.cos(a)*(r+.075);
    positions.push(side*(w/2-.43),wy+Math.sin(a)*(r+.035)-.055,along);
    positions.push(side*(w/2+.075),wy+Math.sin(a)*(r+.13)+.035,along);
    if(i<28){const p=i*2;const faces=[p,p+1,p+2,p+1,p+3,p+2];if(side<0)faces.reverse();indices.push(...faces);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,mat);
}
export function makeCar(config,paint='#f8ce58',wheels='classic',stripe=false,taxi=true){
  const g=new THREE.Group(),gt=config.shape==='gt',suv=config.shape==='suv',hatch=config.shape==='hatch';
  const w=gt?3.35:suv?3.32:3.12,l=gt?6.85:hatch?5.75:suv?6.55:6.6,roof=gt?2.12:suv?3.02:hatch?2.58:2.43;
  const axle=gt?2.13:hatch?1.82:2.08,r=suv?.86:.79,wy=r+.03;
  const body=surface(paint),black=surface('#18232c','trim'),rubber=surface('#171b20','rubber'),chrome=surface('#c4d0d7','chrome'),glass=surface('#173142','glass'),darkPaint=surface('#273b50'),light=surface('#dcf7ff','chrome'),red=surface('#e43743');
  g.add(bodyLoft([[-l/2,w*.42,1.38],[-l*.43,w*.49,1.50],[-axle,w*.51,1.62],[-.65,w*.47,1.53],[.68,w*.47,1.52],[axle,w*.50,1.57],[l*.44,w*.47,1.41],[l/2,w*.41,1.28]],body));
  g.add(rounded(w*.67,.42,l*.92,black,0,.64,0,.09));
  g.add(sidePanel(l,axle,r+.06,wy,w/2,body),sidePanel(l,axle,r+.06,wy,-w/2+.12,body));
  for(const side of [-1,1]){
    for(const z of [-axle,axle])g.add(fender(side,w,z,wy,r,body));
    g.add(rounded(.18,.16,axle*2-r*2,black,side*(w/2+.04),.53,0,.04));
  }
  const bottomY=1.57,bottomW=w*.425,topW=w*(suv?.36:.315),front=gt?.94:1.35,back=hatch?-1.85:suv?-2.0:-1.53,topFront=gt?-.04:.37,topBack=suv?-1.57:hatch?-1.48:-.78;
  const cabin=[[-bottomW,bottomY,back],[bottomW,bottomY,back],[bottomW,bottomY,front],[-bottomW,bottomY,front],[-topW,roof,topBack],[topW,roof,topBack],[topW,roof,topFront],[-topW,roof,topFront]];
  g.add(panel([cabin[3],cabin[2],cabin[6],cabin[7]],glass),panel([cabin[1],cabin[0],cabin[4],cabin[5]],glass));
  g.add(panel([cabin[0],cabin[3],cabin[7],cabin[4]],glass),panel([cabin[2],cabin[1],cabin[5],cabin[6]],glass));
  g.add(rounded(topW*2+.10,.16,topFront-topBack+.17,body,0,roof+.045,(topFront+topBack)/2,.06));
  for(const [a,b] of [[0,4],[1,5],[2,6],[3,7],[4,7],[5,6],[0,3],[1,2]])g.add(rod(cabin[a],cabin[b],.055,body));
  for(const side of [-1,1]){
    const split=hatch?-.50:-.38;g.add(rod([side*bottomW,1.60,split],[side*topW,roof,split],.065,black));
    g.add(rounded(.32,.19,.53,body,side*(w/2+.19),1.77,1.06,.065));g.add(rounded(.04,.12,.39,glass,side*(w/2+.355),1.77,1.06,.015));
    g.add(rounded(.035,.075,.34,chrome,side*(w/2+.025),1.30,-.35,.018));
    for(let k=0;k<3;k++)g.add(rounded(.035,.065,.34,black,side*(w/2+.025),1.30-k*.11,.98,.01));
    g.add(rod([side*(w/2+.027),.62,-.78],[side*(w/2+.027),1.36,-.78],.013,black));
  }
  // Contoured bonnet, separate front fascia, splitter and recessed grille.
  const hoodFront=front+.12,hoodEnd=l/2-.30;
  g.add(bodyLoft([[hoodFront,w*.29,1.60],[hoodEnd-.25,w*.27,1.47],[hoodEnd,w*.22,1.43]],body));
  g.add(rounded(w*.83,.36,.32,body,0,1.12,l/2-.02,.11));
  g.add(rounded(w*.55,.26,.08,black,0,1.11,l/2+.16,.05));
  for(let i=-4;i<=4;i++)g.add(rounded(.025,.16,.018,chrome,i*.16,1.11,l/2+.205,.005));
  g.add(rounded(w*.98,.11,.44,black,0,.66,l/2-.04,.04));
  for(const side of [-1,1]){
    const eye=rounded(w*.22,.18,.21,light,side*w*.32,1.32,l/2+.015,.055);eye.rotation.z=-side*(gt?.19:.10);g.add(eye);
    g.add(rounded(.46,.10,.10,black,side*w*.32,.87,l/2+.13,.03));
    g.add(rounded(.85,.105,.15,red,side*w*.29,1.41,-l/2-.01,.035));
    g.add(rounded(.88,.045,.025,light,side*w*.29,1.43,-l/2-.095,.01));
  }
  g.add(rounded(w*.84,.37,.27,body,0,1.09,-l/2+.015,.10));
  g.add(rounded(w*.83,.21,.32,black,0,.72,-l/2-.04,.035));
  for(const x of [-.68,-.34,0,.34,.68])g.add(rounded(.055,.27,.47,black,x,.68,-l/2+.02,.01));
  for(const side of [-1,1]){const pipe=mesh(new THREE.CylinderGeometry(.15,.15,.26,16),chrome,side*w*.32,.79,-l/2-.10);pipe.rotation.x=Math.PI/2;g.add(pipe);const hole=mesh(new THREE.CircleGeometry(.105,16),black,side*w*.32,.79,-l/2-.24);hole.rotation.y=Math.PI;g.add(hole);}
  g.add(rounded(.58,.16,.05,surface('#ebe9d9','trim'),0,1.18,-l/2-.14,.014));
  if(gt||hatch){const spoilerY=gt?1.99:roof+.10,spoilerZ=gt?-l*.40:topBack-.12;g.add(rounded(w*.97,.10,.48,black,0,spoilerY,spoilerZ,.045));for(const side of [-1,1])g.add(rounded(.08,.38,.12,black,side*.91,spoilerY-.20,spoilerZ,.02));}
  if(suv){for(const x of [-1.02,1.02])g.add(rounded(.12,.14,2.1,black,x,roof+.16,-.5,.035));g.add(rounded(w*.56,.16,.17,chrome,0,.83,l/2+.19,.04));}
  if(!gt&&!suv){g.add(rounded(w*.43,.11,.75,body,0,1.78,l*.25,.04));g.add(rounded(w*.32,.08,.09,black,0,1.79,l*.25+.37,.02));}
  if(stripe){const ink=surface('#f3f0e7');for(const x of [-.27,.27]){
    g.add(panel([[x-.085,1.713,hoodFront],[x+.085,1.713,hoodFront],[x+.085,1.543,hoodEnd],[x-.085,1.543,hoodEnd]],ink));
    g.add(rounded(.17,.015,topFront-topBack,ink,x,roof+.135,(topFront+topBack)/2,.003));
  }}
  if(taxi){
    const signY=roof+.22,signZ=(topFront+topBack)/2;g.add(rounded(.81,.21,.40,surface('#fff0bb','trim'),0,signY,signZ,.045));
    if(!taxiTexture){const c=document.createElement('canvas');c.width=192;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#fff0bb';ctx.fillRect(0,0,192,64);ctx.fillStyle='#1b2835';ctx.font='bold 46px sans-serif';ctx.textAlign='center';ctx.fillText('TAXI',96,48);taxiTexture=new THREE.CanvasTexture(c);taxiTexture.colorSpace=THREE.SRGBColorSpace;}
    for(const sign of [-1,1]){const face=new THREE.Mesh(new THREE.PlaneGeometry(.70,.16),new THREE.MeshBasicMaterial({map:taxiTexture}));face.position.set(0,signY,signZ+sign*.202);if(sign<0)face.rotation.y=Math.PI;g.add(face);}
    for(const side of [-1,1])for(let i=0;i<6;i++)g.add(rounded(.025,.115,.18,i%2?body:black,side*(w/2+.034),1.12,-.60+i*.20,.004));
  }
  const tires=[],frontWheels=[],spinners=[],pivots=[];
  for(const side of [-1,1])for(const z of [-axle,axle]){
    const pivot=new THREE.Group();pivot.position.set(side*(w/2+.02),wy,z);g.add(pivot);pivots.push(pivot);const spin=new THREE.Group();pivot.add(spin);spinners.push(spin);
    const tire=mesh(new THREE.CylinderGeometry(r-.045,r-.045,.40,32),rubber);tire.rotation.z=Math.PI/2;spin.add(tire);tires.push(tire);
    for(const x of [-.16,.16]){const wall=mesh(new THREE.TorusGeometry(r-.16,.16,9,32),rubber,x,0,0);wall.rotation.y=Math.PI/2;spin.add(wall);}
    const rotor=mesh(new THREE.CylinderGeometry(r*.66,r*.66,.42,24),surface('#8b969e','chrome'));rotor.rotation.z=Math.PI/2;spin.add(rotor);
    const outer=side*.235,ring=mesh(new THREE.TorusGeometry(r*.72,.035,7,32),chrome,outer,0,0);ring.rotation.y=Math.PI/2;spin.add(ring);
    const spokeMat=wheels==='sport'?surface('#bdc9d5','chrome'):chrome;
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;const center=[outer,Math.sin(a)*.14,Math.cos(a)*.14];
      for(const offset of (wheels==='sport'?[-.12,.12]:[0]))spin.add(rod(center,[outer,Math.sin(a+offset)*r*.69,Math.cos(a+offset)*r*.69],wheels==='sport'?.036:.065,spokeMat));
    }
    const hub=mesh(new THREE.CylinderGeometry(.15,.15,.50,16),darkPaint);hub.rotation.z=Math.PI/2;spin.add(hub);
    const caliper=rounded(.10,.35,.15,red,side*.19,.12,r*.44,.04);pivot.add(caliper);
    if(z>0)frontWheels.push(pivot);
  }
  const flames=new THREE.Group();for(const side of [-1,1]){const flame=mesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:'#8bf1ff',transparent:true,opacity:.8}),side*w*.32,.79,-l/2-.65);flame.scale.set(.13,.14,.9);flames.add(flame);}flames.visible=false;g.add(flames);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w*1.15,l*1.04),new THREE.MeshBasicMaterial({color:'#15202c',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.04;g.add(shadow);
  g.userData={tires,frontWheels,spinners,pivots,flames,wheelRadius:r};return g;
}
