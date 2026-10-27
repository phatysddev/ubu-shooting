import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {COVER,TARGETS,MEDKIT_SPAWNS,EYE_HEIGHT,MAGAZINE,RELOAD_MS,FIRE_MS,groundHeight,movePlayer,direction} from '../shared/world.js';
import {WEAPONS,CHARACTERS,getWeapon,getCharacter} from '../shared/arsenal.js';
import {createWeapon,createOperator,createJeep,disposeModel} from './models.js';
import {SKILLS,canAim,stepJump,launchJump,smokeBlocks} from '../shared/tactics.js';
import {getUltimate,ULTIMATE_KILLS} from '../shared/ultimate.js';
import {selectSkills} from '../shared/loadout.js';
import {getPerk} from '../shared/perks.js';
import './style.css';

const $=id=>document.getElementById(id);
const settings={sensitivity:1,adsSensitivity:.7,volume:.6,quality:'high',motion:matchMedia('(prefers-reduced-motion: reduce)').matches};
try{Object.assign(settings,JSON.parse(localStorage.getItem('red-earth-settings')||'{}'));$('callsign').value=localStorage.getItem('red-earth-name')||'Ranger';}catch{}
const queryRoom=new URLSearchParams(location.search).get('room');if(queryRoom)$('room-code').value=queryRoom.slice(0,16);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{ $('unsupported').hidden=false;throw new Error('WebGL 2 unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
$('world').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#bfc8bb');scene.fog=new THREE.FogExp2('#c5bea0',.0038);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.08,650);camera.rotation.order='YXZ';scene.add(camera);
scene.add(new THREE.HemisphereLight('#c6dded','#896747',2.15));
const sun=new THREE.DirectionalLight('#ffe0a6',3.6);sun.position.set(-65,55,40);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:190});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun);
const sky=new Sky();sky.scale.setScalar(450);scene.add(sky);
Object.assign(sky.material.uniforms.turbidity,{value:5});sky.material.uniforms.rayleigh.value=1.8;sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.83;
sky.material.uniforms.sunPosition.value.copy(sun.position);
let seed=14259;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}const range=(a,b)=>a+rand()*(b-a);
const mats={};function material(name,color,roughness=1){return mats[name]||(mats[name]=new THREE.MeshStandardMaterial({color,roughness}));}
const dirt=material('dirt','#a16e46'),sand=material('sand','#aa9870'),olive=material('olive','#555d40'),metal=material('metal','#424942',.72),wood=material('wood','#746044'),concrete=material('concrete','#b1a07f'),dark=material('dark','#292f29',.7);
function mesh(geo,mat,parent=scene){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(x,y,z,w,h,d,mat,parent=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;}
function cyl(x,y,z,r1,r2,h,mat,parent=scene,segments=8){const m=mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat,parent);m.position.set(x,y,z);return m;}
function branch(parent,a,b,r1,r2,mat){const delta=new THREE.Vector3().subVectors(b,a);const m=mesh(new THREE.CylinderGeometry(r2,r1,delta.length(),7),mat,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
// A deterministic soil albedo: baked stipple, pebbles and pale mineral flecks.
const soilCanvas=document.createElement('canvas');soilCanvas.width=soilCanvas.height=512;const sc=soilCanvas.getContext('2d');sc.fillStyle='#9c704b';sc.fillRect(0,0,512,512);
for(let i=0;i<50000;i++){const b=Math.floor(range(60,155));sc.fillStyle=`rgba(${b+35},${b},${Math.max(20,b-34)},${range(.1,.4)})`;sc.fillRect(rand()*512,rand()*512,range(.5,3),range(.5,2));}
for(let i=0;i<800;i++){sc.fillStyle=rand()>.5?'#c6ab7c66':'#5b4b3b55';sc.beginPath();sc.ellipse(rand()*512,rand()*512,range(1,3),range(.5,1.6),rand()*6,0,Math.PI*2);sc.fill();}
const soilTexture=new THREE.CanvasTexture(soilCanvas);soilTexture.wrapS=soilTexture.wrapT=THREE.RepeatWrapping;soilTexture.repeat.set(80,80);soilTexture.colorSpace=THREE.SRGBColorSpace;soilTexture.anisotropy=8;
const terrainGeo=new THREE.PlaneGeometry(700,700,150,150);terrainGeo.rotateX(-Math.PI/2);const tp=terrainGeo.attributes.position;
for(let i=0;i<tp.count;i++)tp.setY(i,groundHeight(tp.getX(i),tp.getZ(i)));terrainGeo.computeVertexNormals();
const terrain=mesh(terrainGeo,new THREE.MeshStandardMaterial({map:soilTexture,roughness:1,color:'#d6b18b'}));terrain.castShadow=false;
// A red-earth road fading into grass, following the outpost approach.
const roadGeo=new THREE.PlaneGeometry(9,165,8,80);roadGeo.rotateX(-Math.PI/2);const rp=roadGeo.attributes.position;
for(let i=0;i<rp.count;i++){let x=rp.getX(i),z=rp.getZ(i)+20;x+=Math.sin(z*.028)*2;rp.setXYZ(i,x,groundHeight(x,z)+.025,z);}roadGeo.computeVertexNormals();
const roadTex=soilTexture.clone();roadTex.repeat.set(3,55);const road=mesh(roadGeo,new THREE.MeshStandardMaterial({map:roadTex,color:'#b68156',roughness:1}));road.castShadow=false;
// Grass is instanced, with a small vertex wind displacement rather than per-blade JS.
const grassVertices=[];
for(let blade=0;blade<4;blade++){
  const a=blade*2.399,h=.35+blade*.11,bx=Math.cos(a)*.08,bz=Math.sin(a)*.08,wx=Math.cos(a)*.018,wz=Math.sin(a)*.018,tx=bx+Math.cos(a+.7)*.15,tz=bz+Math.sin(a+.7)*.15;
  grassVertices.push(bx-wx,0,bz-wz,bx+wx,0,bz+wz,tx+wx*.5,h*.6,tz+wz*.5,bx-wx,0,bz-wz,tx+wx*.5,h*.6,tz+wz*.5,tx-wx*.5,h*.6,tz-wz*.5,tx-wx*.5,h*.6,tz-wz*.5,tx+wx*.5,h*.6,tz+wz*.5,tx*1.4,h,tz*1.4);
}
const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grassVertices,3));grassGeo.computeVertexNormals();
const grassMat=new THREE.MeshStandardMaterial({color:'#a4a06a',roughness:1,side:THREE.DoubleSide});let grassShader;
grassMat.onBeforeCompile=s=>{grassShader=s;s.uniforms.windTime={value:0};s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(windTime * 1.3 + instanceMatrix[3].x * .3 + instanceMatrix[3].z * .2) * position.y * position.y * .16;');};
const grass=new THREE.InstancedMesh(grassGeo,grassMat,42000);grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);
const dummy=new THREE.Object3D();let gi=0;
for(let i=0;i<60000&&gi<42000;i++){
  const x=range(-105,105),z=range(-105,105);if(Math.abs(x-Math.sin(z*.028)*2)<5.5&&z>-65&&z<102)continue;
  if(COVER.some(b=>Math.abs(x-b.x)<b.w+1&&Math.abs(z-b.z)<b.d+1))continue;
  const patch=Math.sin(x*.13)*Math.sin(z*.11);if(rand()<.15+patch*.2)continue;
  dummy.position.set(x,groundHeight(x,z),z);dummy.rotation.set(0,rand()*Math.PI,0);dummy.scale.setScalar(range(.5,1.5));dummy.updateMatrix();grass.setMatrixAt(gi,dummy.matrix);grass.setColorAt(gi,new THREE.Color().setHSL(range(.10,.135),range(.18,.30),range(.46,.7)));gi++;
}grass.count=gi;
const outerGrass=new THREE.InstancedMesh(grassGeo,grassMat,20000);outerGrass.receiveShadow=true;scene.add(outerGrass);let outerCount=0;
for(let i=0;i<30000&&outerCount<20000;i++){const x=range(-225,225),z=range(-225,225);if(Math.abs(x)<105&&Math.abs(z)<105)continue;if(COVER.some(b=>Math.abs(x-b.x)<b.w+1&&Math.abs(z-b.z)<b.d+1))continue;dummy.position.set(x,groundHeight(x,z),z);dummy.rotation.set(0,rand()*6,0);dummy.scale.setScalar(range(.5,1.5));dummy.updateMatrix();outerGrass.setMatrixAt(outerCount,dummy.matrix);outerGrass.setColorAt(outerCount,new THREE.Color().setHSL(.12,.23,range(.46,.65)));outerCount++;}outerGrass.count=outerCount;


const coverMeshes=[];
for(const b of COVER){
  const y=groundHeight(b.x,b.z),g=new THREE.Group();g.position.set(b.x,y,b.z);scene.add(g);
  if(b.type==='container'){
    const color=b.x<0?'#686d5b':'#84735c';const bodyMat=new THREE.MeshStandardMaterial({color,roughness:.88});
    box(0,b.h/2,0,b.w*2,b.h,b.d*2,bodyMat,g);
    const long=b.w>b.d;
    for(let t=-((long?b.w:b.d)-.25);t<(long?b.w:b.d);t+=.42){
      for(const side of [-1,1])box(long?t:side*(b.w+.025),b.h/2,long?side*(b.d+.025):t,long?.055:.07,b.h-.16,long?.07:.055,bodyMat,g);
    }
    for(const z of [-b.d,b.d]){box(0,b.h-.07,z,b.w*2+.1,.13,.12,metal,g);box(0,.08,z,b.w*2+.1,.13,.12,metal,g);}
    for(const x of [-b.w,b.w])box(x,b.h/2,0,.12,b.h,b.d*2,metal,g);
    for(const x of [-.65,.65])box(x,b.h/2,b.d+.08,.05,b.h-.2,.06,metal,g);
  }else if(b.type==='house'){
    box(0,b.h/2,0,b.w*2,b.h,b.d*2,concrete,g);
    for(let x=-b.w+.8;x<b.w;x+=2.3){box(x,1.65,b.d+.015,1.15,.8,.035,dark,g);box(x,1.23,b.d+.1,1.3,.08,.25,wood,g);}
    box(-b.w+.7,1,b.d+.025,1.2,2,.04,wood,g);
    const roof=box(0,b.h+.14,0,b.w*2+.6,.18,b.d*2+.55,metal,g);roof.rotation.z=.025;
    for(let x=-b.w-.1;x<b.w+.2;x+=.35)box(x,b.h+.25,0,.04,.04,b.d*2+.5,metal,g);
    box(b.w-.5,b.h+.5,-b.d+.5,.45,1,.45,concrete,g);
  }else if(b.type==='sandbag'){
    const long=b.w>b.d,len=long?b.w:b.d;
    for(let row=0;row<3;row++)for(let t=-len+.4;t<len;t+=.85){
      const bag=box(long?t+(row%2)*.15:0,.18+row*.33,long?0:t+(row%2)*.15,long?.86:1.05,.35,long?1.05:.86,sand,g);bag.rotation.y=range(-.06,.06);bag.geometry=new THREE.BoxGeometry(long?.86:1.05,.35,long?1.05:.86,2,2,2);const p=bag.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*range(.94,1.04),p.getY(i)*range(.92,1.08),p.getZ(i)*range(.94,1.04));bag.geometry.computeVertexNormals();
    }
  }else if(b.type==='crate'){
    box(0,b.h/2,0,b.w*2,b.h,b.d*2,wood,g);
    for(const x of [-b.w,b.w])for(const z of [-b.d,b.d])box(x,b.h/2,z,.12,b.h+.1,.12,sand,g);
    for(const y of [.16,b.h-.16]){box(0,y,b.d+.03,b.w*2,.12,.09,sand,g);box(0,y,-b.d-.03,b.w*2,.12,.09,sand,g);}
  }else{const r=mesh(new THREE.DodecahedronGeometry(1,1),material('rock','#80765f'),g);r.position.y=b.h*.38;r.scale.set(b.w,b.h*.65,b.d);r.rotation.y=range(0,3);}
  g.updateMatrixWorld(true);g.traverse(o=>{if(o.isMesh)coverMeshes.push(o);});
}
// Acacias: branching trunks and clustered flat crowns, kept outside the playable cover.
const bark=material('bark','#655942'),leaf=material('leaf','#596442');
function tree(x,z,scale=1){
  const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);
  branch(g,new THREE.Vector3(),new THREE.Vector3(.2,3.8,.1),.26,.12,bark);
  for(let j=0;j<5;j++){
    const a=j*Math.PI*2/5+rand()*.4,len=range(2.8,4.8),end=new THREE.Vector3(Math.cos(a)*len,range(5,6.5),Math.sin(a)*len);
    branch(g,new THREE.Vector3(.15,range(2.2,3.5),0),end,.13,.035,bark);
    for(let k=0;k<5;k++){const crownGeo=new THREE.IcosahedronGeometry(1,2),cp=crownGeo.attributes.position;for(let v=0;v<cp.count;v++){const amount=1+.11*Math.sin(cp.getX(v)*19+cp.getZ(v)*13+cp.getY(v)*21);cp.setXYZ(v,cp.getX(v)*amount,cp.getY(v)*amount,cp.getZ(v)*amount);}crownGeo.computeVertexNormals();const crown=mesh(crownGeo,leaf,g);crown.position.copy(end).add(new THREE.Vector3(range(-1.6,1.6),range(0,.5),range(-1.6,1.6)));crown.scale.set(range(1.1,2.1),range(.4,.65),range(1.1,2.1));crown.rotation.y=rand()*6;}
  }
}
[[30,21,1.35],[-27,34,1.1],[-38,-20,1.2],[39,-35,1.4],[-17,-54,1],[60,5,1.5],[-58,0,1.3],[15,-72,1.3],[67,-55,1.1],[-65,-65,1.5]].forEach(a=>tree(...a));
for(let i=0;i<28;i++){const a=rand()*Math.PI*2,r=range(95,245);tree(Math.cos(a)*r,Math.sin(a)*r,range(.7,1.5));}
for(let i=0;i<45;i++){const x=range(-210,210),z=range(-210,210);if(Math.abs(x)>80||Math.abs(z)>80)tree(x,z,range(.8,1.4));}
// Distant weathered escarpments.
const mesaMat=material('mesa','#8b8066');
for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=range(270,315),geo=new THREE.CylinderGeometry(range(8,20),range(30,55),range(15,38),18,5),p=geo.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j);p.setY(j,p.getY(j)+Math.sin(x*.4+z*.28)*1.6+Math.cos(z*.6)*.7);}geo.computeVertexNormals();const m=mesh(geo,mesaMat);m.position.set(Math.cos(a)*r,range(1,7),Math.sin(a)*r);m.rotation.y=rand()*4;m.castShadow=false;}
// Utility poles, cables and outpost perimeter.
for(const x of [-27,28])for(const z of [-47,-22,3]){
  const y=groundHeight(x,z);cyl(x,y+3,z,.09,.12,6,wood);box(x,y+5.5,z,2,.1,.13,wood);
  if(z<3){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,y+5.5,z),new THREE.Vector3(x,y+4.1,z+12),new THREE.Vector3(x,groundHeight(x,z+25)+5.5,z+25));mesh(new THREE.TubeGeometry(curve,20,.018,3,false),dark);}
}
for(let i=0;i<35;i++){const x=-40+i*2.4,z=-50,y=groundHeight(x,z);cyl(x,y+.7,z,.035,.035,1.4,wood);if(i<34){branch(scene,new THREE.Vector3(x,y+.8,z),new THREE.Vector3(x+2.4,groundHeight(x+2.4,z)+.8,z),.012,.012,metal);branch(scene,new THREE.Vector3(x,y+1.2,z),new THREE.Vector3(x+2.4,groundHeight(x+2.4,z)+1.2,z),.012,.012,metal);}}
// Water barrels and stones give the path a human scale.
for(let i=0;i<15;i++){const x=range(-36,36),z=range(-43,15);if(COVER.some(b=>Math.abs(x-b.x)<b.w+1&&Math.abs(z-b.z)<b.d+1)||Math.abs(x)<5)continue;const y=groundHeight(x,z);cyl(x,y+.45,z,.31,.32,.9,material('barrel','#6d7360'),scene,12);for(const dy of [.18,.72])cyl(x,y+dy,z,.33,.33,.045,metal,scene,12);}
const rockGeo=new THREE.DodecahedronGeometry(1,0),smallRocks=new THREE.InstancedMesh(rockGeo,material('pebbles','#95846a'),650);scene.add(smallRocks);
for(let i=0;i<650;i++){const x=range(-100,100),z=range(-100,100);dummy.position.set(x,groundHeight(x,z),z);dummy.rotation.set(rand(),rand()*6,rand());dummy.scale.set(range(.08,.3),range(.04,.15),range(.08,.35));dummy.updateMatrix();smallRocks.setMatrixAt(i,dummy.matrix);}smallRocks.receiveShadow=true;

const targetGroups=[];
for(const [x,z]of TARGETS){
  const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);scene.add(g);
  box(0,.4,0,.08,.8,.1,wood,g);const plate=new THREE.Group();g.add(plate);
  const steel=material('target','#b9b3a0');box(0,1.22,0,.72,1.08,.12,steel,plate);const head=mesh(new THREE.CircleGeometry(.25,20),steel,plate);head.position.set(0,1.88,.075);
  const circleMat=new THREE.MeshBasicMaterial({color:'#423c30',side:THREE.DoubleSide});for(const r of [.25,.13]){const ring=mesh(new THREE.RingGeometry(r-.018,r,24),circleMat,plate);ring.position.set(0,1.3,.066);}
  targetGroups.push(plate);
}
// Viewmodel uses its own scene: the rifle never clips through world geometry.
const weaponScene=new THREE.Scene();const weaponCamera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.01,10);weaponScene.add(new THREE.HemisphereLight('#dce9ef','#71563a',2.6));const wl=new THREE.DirectionalLight('#ffdc9b',3);wl.position.set(-3,5,2);weaponScene.add(wl);
const gun=new THREE.Group();gun.scale.setScalar(.75);weaponScene.add(gun);
let weaponModel=createWeapon('ar4',{hands:true});gun.add(weaponModel);
function rebuildWeapon(id){gun.remove(weaponModel);disposeModel(weaponModel);weaponModel=createWeapon(id,{hands:true});gun.add(weaponModel);}
const flashGeo=new THREE.ConeGeometry(.13,.4,5),flashMat=new THREE.MeshBasicMaterial({color:'#fff1b5',transparent:true,opacity:.85,depthWrite:false});const flash=mesh(flashGeo,flashMat,gun);flash.position.set(0,0,-1.38);flash.rotation.x=-Math.PI/2;flash.visible=false;
const flashLight=new THREE.PointLight('#ffb75e',0,5);flashLight.position.set(0,0,-1.3);gun.add(flashLight);
const particles=[];function puff(position,color='#c8b28b',count=7){for(let i=0;i<count;i++){const m=mesh(new THREE.IcosahedronGeometry(range(.015,.06),0),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8}));m.position.copy(position);particles.push({m,v:new THREE.Vector3(range(-1,1),range(.3,1.7),range(-1,1)),life:range(.25,.6)});}}
const tracers=[];function tracer(origin,end){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...origin),new THREE.Vector3(...end)]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:'#ffe5a7',transparent:true,opacity:.55}));scene.add(line);tracers.push({line,life:.065});}

let socket=null,myId=null,active=false,joined=false,joining=false,locked=false,dead=false,fallback=false;
let me={weapon:'ar4',grenades:2,primary:'ar4',secondary:'falcon',x:0,z:30,hp:100,ammo:MAGAZINE,reloading:false,kills:0,deaths:0},yaw=0,pitch=0,aiming=false,firing=false,lastShot=0,recoil=0,flashUntil=0,reloadStart=0,reloadEnd=0,noticeTimer,hitTimer;
let serverSnapshot=null,sendAccumulator=0,walkTime=0,wasAlive=true;
const keys={w:false,a:false,s:false,d:false,sprint:false,crouch:false};
const remotePlayers=new Map();let playerList=[];
function clearInput(){for(const key in keys)keys[key]=false;firing=false;aiming=false;document.body.classList.remove('aiming');if(joined)sendInput();}
function send(msg){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg));}
function sendInput(){send({type:'input',yaw,pitch,keys});}
function notice(msg){$('notice').textContent=msg;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),3500);}
function feed(msg){const p=document.createElement('p');p.textContent=msg;$('kill-feed').prepend(p);if($('kill-feed').children.length>4)$('kill-feed').lastChild.remove();setTimeout(()=>p.remove(),6000);}

let audioCtx,master,windSource;
function initAudio(){if(audioCtx){audioCtx.resume();return;}audioCtx=new AudioContext();master=audioCtx.createGain();master.gain.value=settings.volume;const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=4;master.connect(limiter);limiter.connect(audioCtx.destination);
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*3,audioCtx.sampleRate),data=buffer.getChannelData(0);let prev=0;for(let i=0;i<data.length;i++){prev=(prev+(Math.random()*2-1)*.025)/1.025;data[i]=prev*3;}
  windSource=audioCtx.createBufferSource();windSource.buffer=buffer;windSource.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;const gain=audioCtx.createGain();gain.gain.value=.07;windSource.connect(filter).connect(gain).connect(master);windSource.start();
}
function sound(kind,distance=0,weaponId=me.weapon){
  if(!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime,atten=1/Math.max(1,distance*.055);
  function tone(f,to,amp,duration,start=now,type='sine'){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(f,start);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+duration);g.gain.setValueAtTime(amp*atten,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g).connect(master);o.start(start);o.stop(start+duration+.01);}
  function noise(duration,freq,amp,start=now,type='lowpass'){const buffer=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*duration),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*5);const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();source.buffer=buffer;filter.type=type;filter.frequency.value=freq;g.gain.value=amp*atten;source.connect(filter).connect(g).connect(master);source.start(start);}
  if(kind==='shot'){
    const w=getWeapon(weaponId),heavy=['sniper','shotgun','launcher'].includes(w.kind),suppressed=w.id==='spectre',duration=heavy?.38:.18;
    noise(duration,distance?1000:suppressed?900:heavy?2900:5000,suppressed?.22:.48);
    tone(heavy?115:180,heavy?35:65,suppressed?.08:.28,heavy?.24:.12);
    noise(.035,6200,.09,now+.012,'highpass');noise(duration*.9,650,.12,now+.09);noise(duration*.8,500,.055,now+.19);
  }else if(kind==='hurt'){tone(105,38,.28,.16);noise(.10,1500,.22);noise(.045,4200,.06,now+.025,'highpass');}
  else if(kind==='blast'){noise(.8,1100,.6);tone(90,24,.45,.6);noise(.7,400,.14,now+.15);}
  else if(kind==='warning'){for(let i=0;i<3;i++)tone(620,620,.08,.13,now+i*.22,'triangle');}
  else if(kind==='reload'){noise(.045,3800,.15,now,'highpass');tone(380,190,.05,.045,now,'triangle');}
  else if(kind==='hit'){tone(900,600,.07,.065);}
  else if(kind==='step'){noise(.075,450,.055);tone(85,45,.025,.07);}
}
function createSoldier(p){
  const g=createOperator(p.character,p.weapon);scene.add(g);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=48;const c=canvas.getContext('2d');c.fillStyle='#20291ecc';c.fillRect(0,0,256,48);c.fillStyle='#f3f0df';c.font='22px sans-serif';c.textAlign='center';c.fillText(p.name,128,31);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:true,transparent:true}));label.position.y=2.22;label.scale.set(1.8,.34,1);g.add(label);
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:'#86dff1',transparent:true,opacity:.12,wireframe:true,depthWrite:false}));shield.position.y=1;shield.scale.set(.65,1.1,.65);shield.visible=false;g.add(shield);g.userData.shield=shield;
  g.position.set(p.x,groundHeight(p.x,p.z),p.z);return {g,legs:g.userData.legs,target:p,label,weapon:p.weapon,character:p.character};
}
function updateHud(){
  const perk=getPerk(me.perks?.[me.weapon]);$('perk-name').textContent=perk.name||'ไม่มีสกิลปืน';$('perk-description').textContent=perk.description||'มีดระยะประชิด';$('perk-roll').textContent=(me.rollLeft||0)>0?`B สุ่มใหม่ ${Math.ceil(me.rollLeft/1000)}s`:'B สุ่มสกิลปืนใหม่';
  const car=currentVehicles.find(v=>v.id===me.vehicle),near=currentVehicles.some(v=>v.hp>0&&!v.driver&&Math.hypot(v.x-me.x,v.z-me.z)<4.5);$('vehicle-status').textContent=car?`H ลงรถ · รถ ${Math.round(car.hp)} HP · ${Math.round(Math.abs(car.speed)*3.6)} km/h`:near?'H ขึ้นรถ · WASD ขับ / เมาส์ยิง':'H ขึ้นรถเมื่ออยู่ใกล้รถ';
  const ult=getUltimate(me.character),ultLeft=Math.max(0,(me.ultEnds||0)-performance.now()),charge=me.ultCharge||0;
  $('ultimate-title').textContent=ult.name;$('ultimate-status').textContent=ultLeft>0?`กำลังทำงาน ${Math.ceil(ultLeft/1000)}s`:charge>=ULTIMATE_KILLS?'พร้อมใช้ · T':`${charge} / 5 KILLS`;
  $('ultimate-meter').style.width=`${charge/5*100}%`;$('ultimate-panel').classList.toggle('ready',charge>=5||ultLeft>0);

  for(const [id,skill]of Object.entries(SKILLS)){const el=$('skill-'+id),slot=(me.skills||['wall','heal']).indexOf(id);el.hidden=slot<0;el.style.order=slot;if(slot>=0)el.querySelector('kbd').textContent=slot===0?'Q':'E';const left=Math.max(0,(skillReady[id]||0)-performance.now()),button=$('skill-'+id);button.classList.toggle('cooling',left>0||!!me.vehicle);button.querySelector('small').textContent=me.vehicle?'ลงรถก่อน':left>0?`${Math.ceil(left/1000)}s`:'พร้อม';}
  document.body.classList.toggle('scoped',active&&aiming&&!!getWeapon(me.weapon).zoom&&!me.reloading&&!dead);
  $('scope-name').textContent=getWeapon(me.weapon).name;$('scope-zoom').textContent=me.weapon==='longbow'?'2.4×':'1.9×';

  const w=getWeapon(me.weapon);$('weapon-name').textContent=`${w.name} / ${w.caliber}`;$('mag-size').textContent=w.mag?`/ ${w.mag}`:'ระยะประชิด';$('grenade-count').textContent=`G ระเบิด × ${me.grenades??2}`;
  $('health').textContent=`${Math.round(Math.max(0,me.hp))} / ${me.maxHp||100}`;$('health-fill').style.width=`${me.hp/(me.maxHp||100)*100}%`;$('health-fill').style.background=me.hp<35?'#e39472':'#e2e8cb';$('ammo').textContent=w.kind==='knife'?'—':String(me.ammo).padStart(2,'0');
  $('shield-status').textContent=(me.shieldEnds||0)>performance.now()?`โล่อมตะ ${Math.ceil((me.shieldEnds-performance.now())/1000)}s`:'';
  $('stance').textContent=(me.slideEnds||0)>performance.now()?'สไลด์':keys.crouch?'ย่อตัว':keys.sprint?'วิ่ง':'ยืน';
  $('reload-label').textContent=me.reloading?'กำลังรีโหลด…':w.kind==='knife'?'คลิกซ้ายฟัน · 1 / 2 เปลี่ยนปืน':me.ammo===0?'กระสุนหมด · กด R':'R รีโหลด · 1 / 2 / 3 เปลี่ยนอาวุธ';
  const deg=((yaw*-180/Math.PI)%360+360)%360;const names=['N','NE','E','SE','S','SW','W','NW'];$('heading').textContent=`${Math.round(deg).toString().padStart(3,'0')}° ${names[Math.round(deg/45)%8]}`;
}
function scoreboard(){
  $('score-rows').replaceChildren();for(const p of [...playerList].sort((a,b)=>b.kills-a.kills)){
    const row=document.createElement('div');row.className='score-row'+(p.id===myId?' self':'');for(const text of [p.name,p.kills,p.deaths]){const cell=document.createElement('span');cell.textContent=text;row.append(cell);}$('score-rows').append(row);
  }
}
function onState(m){
  playerList=m.players;const own=m.players.find(p=>p.id===myId);if(!own)return;
  const wasDead=dead;serverSnapshot=own;
  if(Math.abs((me.lift||0)-(own.lift||0))>.35){me.lift=own.lift;me.vy=own.vy;}if(!own.lift&&Math.abs(me.vy||0)<2){me.lift=0;me.vy=0;}
  for(const id of Object.keys(SKILLS))skillReady[id]=performance.now()+(own.cooldowns?.[id]||0);
  updateSmokes(m.smokes||[]);updateWalls(m.walls||[]);updateRocketVisuals(m.rockets||[]);updateVehicles(m.vehicles||[]);updateMedkits(m.medkits||[]);
if(me.weapon!==own.weapon)rebuildWeapon(own.weapon);me.weapon=own.weapon;if(!canAim(getWeapon(me.weapon))){aiming=false;document.body.classList.remove('aiming');}me.primary=own.primary;me.secondary=own.secondary;me.grenades=own.grenades;updateGrenadeVisuals(m.grenades||[]);
  // Position prediction reconciles toward the server; large errors are corrected immediately.
  const delta=Math.hypot(me.x-own.x,me.z-own.z);if((own.vehicle?delta>25:delta>2)||!active){me.x=own.x;me.z=own.z;}
  Object.assign(me,{hp:own.hp,maxHp:own.maxHp,character:own.character,skills:own.skills,vehicle:own.vehicle,slideEnds:performance.now()+(own.slideLeft||0),slideX:own.slideX,slideZ:own.slideZ,shieldEnds:performance.now()+(own.shieldLeft||0),perks:own.perks,rollLeft:own.rollLeft,slow:own.slow,ultCharge:own.ultCharge,ultEnds:performance.now()+(own.ultLeft||0),ammo:own.ammo,reloading:own.reloading,kills:own.kills,deaths:own.deaths});
  if(own.reloading&&!reloadEnd){reloadStart=performance.now();reloadEnd=reloadStart+own.reloadLeft;}
  if(!own.reloading)reloadEnd=0;
  dead=own.hp<=0;$('death').hidden=!dead;$('respawn-time').textContent=Math.ceil(own.respawnLeft/1000);
  if(wasDead&&!dead){me.lift=0;me.vy=0;me.x=own.x;me.z=own.z;yaw=own.yaw;pitch=0;notice('กลับเข้าสนาม · โล่อมตะ 3 วินาที');}
  if(dead){streak=0;lastKillAt=0;clearInput();$('pause').hidden=true;}
  for(const p of m.players){if(p.id===myId)continue;let r=remotePlayers.get(p.id);if(r&&r.character!==p.character){scene.remove(r.g);disposeModel(r.g);remotePlayers.delete(p.id);r=null;}if(!r){r=createSoldier(p);remotePlayers.set(p.id,r);}if(r.weapon!==p.weapon){const old=r.g.userData.held;r.g.remove(old);disposeModel(old);const held=createWeapon(p.weapon);held.scale.setScalar(.65);held.position.set(.16,1.18,-.23);r.g.add(held);r.g.userData.held=held;r.weapon=p.weapon;}r.target=p;r.g.userData.shield.visible=p.protected;r.g.visible=p.hp>0;r.label.visible=own.hp>0&&((own.ultLeft>0&&getUltimate(own.character).reveal)||Math.hypot(p.x-me.x,p.z-me.z)<45&&!smokeBlocks([me.x,groundHeight(me.x,me.z)+(me.lift||0)+1.7,me.z],[p.x,groundHeight(p.x,p.z)+(p.lift||0)+1.7,p.z],m.smokes||[]));}
  for(const [id,r]of remotePlayers)if(!m.players.some(p=>p.id===id)){scene.remove(r.g);r.g.traverse(o=>{if(o.isSprite){o.material.map?.dispose();o.material.dispose();}else if(o.isMesh)o.geometry.dispose();});remotePlayers.delete(id);}
  m.targets.forEach((hp,i)=>targetGroups[i].userData.down=hp<=0);
  $('player-count').textContent=`${m.players.length} / 8 ผู้เล่น`;
  scoreboard();updateHud();
}
function leaveRoom(){joined=false;active=false;joining=false;fallback=false;myId=null;clearInput();socket?.close();socket=null;document.exitPointerLock?.();document.body.classList.remove('playing');$('hud').hidden=true;$('lobby').hidden=false;$('pause').hidden=true;$('death').hidden=true;$('scoreboard').hidden=true;$('deploy').disabled=false;$('deploy').querySelector('span').textContent='เข้าสู่สนาม';$('connection-label').textContent='พื้นที่พร้อมสำรวจ';gun.visible=false;for(const r of remotePlayers.values())scene.remove(r.g);remotePlayers.clear();me={weapon:$('primary-weapon').value,grenades:2,primary:$('primary-weapon').value,secondary:$('secondary-weapon').value,x:0,z:30,hp:100,ammo:30,reloading:false,kills:0,deaths:0};serverSnapshot=null;me.lift=0;me.vy=0;rebuildWeapon(me.weapon);updateGrenadeVisuals([]);updateSmokes([]);updateWalls([]);updateVehicles([]);updateRocketVisuals([]);document.body.classList.remove('scoped');}
$('join-form').addEventListener('submit',e=>{
  e.preventDefault();if(joined||joining)return;joining=true;$('deploy').disabled=true;$('deploy').querySelector('span').textContent='กำลังเชื่อมต่อ…';$('join-note').classList.remove('error');initAudio();
  const name=$('callsign').value.trim()||'Ranger',room=$('room-code').value.trim().toUpperCase()||'SAVANNA';
  try{localStorage.setItem('red-earth-name',name);}catch{}
  const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`);socket=ws;
  const timeout=setTimeout(()=>{if(!joined&&socket===ws){ws.close();connectionError('เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง');}},8000);
  ws.addEventListener('open',()=>send({type:'join',name,room,primary:$('primary-weapon').value,secondary:$('secondary-weapon').value,character:$('character-select').value,skills:[$('skill-slot-1').value,$('skill-slot-2').value]}));
  ws.addEventListener('message',event=>{
    let m;try{m=JSON.parse(event.data);}catch{return;}
    if(m.type==='joined'){
      clearTimeout(timeout);joined=true;joining=false;active=true;myId=m.id;$('lobby').hidden=true;$('hud').hidden=false;$('room-label').textContent=m.room;$('connection-label').textContent='เชื่อมต่อแล้ว';document.body.classList.add('playing');gun.visible=true;me.x=0;me.z=30;yaw=0;pitch=0;sendInput();
      history.replaceState(null,'',`?room=${encodeURIComponent(m.room)}`);
      requestLock();notice('WASD เดิน · คลิกขวาเล็ง · R รีโหลด');
    }else if(m.type==='state')onState(m);
    else if(m.type==='ability'){if(m.skill==='dash'&&m.from){tracer(m.from,m.to);}if(m.id===myId)notice(`${SKILLS[m.skill].name} ใช้งานแล้ว`);}
    else if(m.type==='ultimate'){feed(`${m.name} · ${getUltimate(m.character).name}`);if(m.id===myId)notice(`อัลติ ${getUltimate(m.character).name} ทำงาน 15 วินาที`);}
    else if(m.type==='perk'){notice(`${getWeapon(m.weapon).name} · สุ่มได้ ${getPerk(m.perk).name}`);sound('hit');}
    else if(m.type==='strike-warning'){notice(`${m.name} · ${m.kind==='nuke'?'ระเบิดล้างแมพ':'อัลติถล่มพื้นที่'} ใน 3 วินาที!`);sound('warning');}
    else if(m.type==='cataclysm'){sound('blast');$('damage').style.opacity='.5';setTimeout(()=>$('damage').style.opacity='0',350);}
    else if(m.type==='explosion'){explosion(m.position,m.weapon==='rpg');}
    else if(m.type==='shot'){if(getWeapon(m.weapon).kind==='knife'){if(m.id!==myId)sound('reload');return;}tracer(m.origin,m.end);if(m.id!==myId)sound('shot',Math.hypot(m.origin[0]-me.x,m.origin[2]-me.z),m.weapon);puff(new THREE.Vector3(...m.end),m.hit?'#aaa58a':'#c6a379');}
    else if(m.type==='hit'){const marker=$('hitmarker');marker.classList.add('hit');marker.classList.toggle('down',m.down);clearTimeout(hitTimer);hitTimer=setTimeout(()=>marker.classList.remove('hit','down'),170);sound('hit');if(m.target&&m.down)notice('เป้าล้มแล้ว · จะตั้งขึ้นใหม่ใน 4.5 วินาที');}
    else if(m.type==='damage'){sound('hurt');$('damage').style.opacity='.85';setTimeout(()=>$('damage').style.opacity='0',180);}
    else if(m.type==='kill'){feed(`${m.killer}  /  ${m.victim}`);if(m.killerId===myId&&m.victimId!==myId)showKill(m);}
    else if(m.type==='notice')feed(m.message);
    else if(m.type==='error'){connectionError(m.message);ws.close();}
  });
  ws.addEventListener('close',()=>{clearTimeout(timeout);if(socket!==ws)return;const hadJoined=joined;leaveRoom();if(hadJoined)connectionError('การเชื่อมต่อขาดหาย กรุณาเข้าสู่ห้องอีกครั้ง');else if(joining)connectionError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');});
  ws.addEventListener('error',()=>{if(!joined)connectionError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่');});
});
function connectionError(message){joining=false;$('deploy').disabled=false;$('deploy').querySelector('span').textContent='เข้าสู่สนาม';$('join-note').textContent=message;$('join-note').classList.add('error');}
function enableFallback(){if(!joined)return;fallback=true;active=true;$('pause').hidden=true;notice('โหมดเมาส์อิสระ · กดคลิกขวาค้างแล้วลากเพื่อมอง · Esc พัก');}
async function requestLock(){if(dead||!joined)return;if(fallback){active=true;$('pause').hidden=true;return;}try{await renderer.domElement.requestPointerLock();}catch{enableFallback();}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;clearInput();if(joined&&!dead){$('pause').hidden=locked;active=locked;}if(locked)initAudio();});
document.addEventListener('pointerlockerror',enableFallback);
$('resume').onclick=requestLock;$('leave').onclick=leaveRoom;
document.addEventListener('mousemove',e=>{if(!active||dead||(!locked&&!(fallback&&(e.buttons&2))))return;const sensitivity=.002*settings.sensitivity*(aiming?settings.adsSensitivity*Math.min(.5,(getWeapon(me.weapon).zoom||49)/72):1);yaw-=e.movementX*sensitivity;pitch=Math.max(-1.4,Math.min(1.4,pitch-e.movementY*sensitivity));});
document.addEventListener('contextmenu',e=>{if(joined)e.preventDefault();});
document.addEventListener('mousedown',e=>{if(!active||dead||e.target!==renderer.domElement)return;if(e.button===0){firing=true;shoot();}if(e.button===2&&canAim(getWeapon(me.weapon))){aiming=true;document.body.classList.add('aiming');}});
document.addEventListener('mouseup',e=>{if(e.button===0)firing=false;if(e.button===2){aiming=false;document.body.classList.remove('aiming');}});
const keyMap={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',ShiftLeft:'sprint',ShiftRight:'sprint',KeyC:'crouch',ControlLeft:'crouch'};
document.addEventListener('keydown',e=>{
  if(!joined||e.target instanceof HTMLInputElement||$('settings').open||$('help').open)return;
  if(e.code==='Tab'){e.preventDefault();$('scoreboard').hidden=false;return;}
  if(e.code==='Escape'&&fallback){active=!active;clearInput();$('pause').hidden=active;return;}
  if(!active||dead)return;
  if(!e.repeat){if(e.code==='KeyB')send({type:'roll'});if(e.code==='KeyH')send({type:'vehicle'});if(e.code==='KeyZ'&&canAim(getWeapon(me.weapon))){aiming=!aiming;document.body.classList.toggle('aiming',aiming);}if(e.code==='Space'){e.preventDefault();if(!me.vehicle&&launchJump(me))send({type:'jump'});}if(e.code==='KeyQ')useSkill((me.skills||['wall','heal'])[0]);if(e.code==='KeyE')useSkill((me.skills||['wall','heal'])[1]);if(e.code==='KeyT'){if((me.ultCharge||0)>=5)send({type:'ultimate'});else notice(`อัลติ ${me.ultCharge||0} / 5 คิลผู้เล่น`);}if(e.code==='Digit1')switchWeapon(me.primary);if(e.code==='Digit2')switchWeapon(me.secondary);if(e.code==='Digit3'||e.code==='KeyV')switchWeapon('knife');if(e.code==='KeyG')throwGrenade();}
  if((e.code==='KeyC'||e.code==='ControlLeft')&&!e.repeat&&keys.sprint){sendInput();send({type:'slide'});}
  if(keyMap[e.code]){e.preventDefault();keys[keyMap[e.code]]=true;}if(e.code==='KeyR'&&!e.repeat)reload();
});
document.addEventListener('keyup',e=>{if(keyMap[e.code])keys[keyMap[e.code]]=false;if(e.code==='Tab')$('scoreboard').hidden=true;});
window.addEventListener('blur',()=>{clearInput();$('scoreboard').hidden=true;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(locked)document.exitPointerLock();}});
let wheelTotal=0;
document.addEventListener('wheel',e=>{if(!active||dead||!joined)return;e.preventDefault();wheelTotal+=e.deltaY*(e.deltaMode===1?16:1);if(Math.abs(wheelTotal)<40||performance.now()-lastSwitch<350)return;const slots=[me.primary,me.secondary,'knife'];switchWeapon(slots[(slots.indexOf(me.weapon)+(wheelTotal>0?1:2))%3]);wheelTotal=0;},{passive:false});
const skillReady={dash:0,smoke:0,heal:0,wall:0};
function useSkill(id){if(!active||dead||me.vehicle||!(me.skills||['wall','heal']).includes(id)||performance.now()<(skillReady[id]||0))return;if(id==='heal'&&me.hp>=(me.maxHp||100)){notice('สุขภาพเต็มอยู่แล้ว');return;}sendInput();send({type:'skill',skill:id});skillReady[id]=performance.now()+SKILLS[id].cooldown;}
function switchWeapon(id){if(!active||dead||me.weapon===id||performance.now()-lastSwitch<300)return;lastSwitch=performance.now();send({type:'switch',weapon:id});firing=false;aiming=false;document.body.classList.remove('aiming');reloadEnd=0;}
let lastSwitch=0,knifeUntil=0;
function throwGrenade(){if(!active||dead||!me.grenades||performance.now()-lastThrow<950)return;lastThrow=performance.now();sendInput();send({type:'grenade'});notice('ขว้างระเบิดแล้ว · ระวังแรงระเบิด');}
let lastThrow=0;
function reload(){const w=getWeapon(me.weapon);if(!joined||dead||me.reloading||!w.mag||me.ammo>=w.mag)return;send({type:'reload'});me.reloading=true;reloadStart=performance.now();reloadEnd=reloadStart+w.reload*(getPerk(me.perks?.[w.id]).reload||1);sound('reload');updateHud();}
function shoot(){const w=getWeapon(me.weapon),now=performance.now();if(!active||dead||me.reloading||now-lastShot<w.fire*(getPerk(me.perks?.[w.id]).fire||1)*((me.ultEnds||0)>now?(getUltimate(me.character).fire||1):1)+4||now-lastSwitch<300)return;if(w.mag&&me.ammo<=0){reload();return;}lastShot=now;sendInput();send({type:'shoot'});if(w.mag)me.ammo--;recoil=Math.min(.12,recoil+w.recoil*(aiming?.12:.45)*((me.ultEnds||0)>now?(getUltimate(me.character).recoil??1):1));if(w.kind==='knife'){knifeUntil=now+330;sound('reload');}else{flashUntil=now+45;flash.rotation.z=Math.random()*6;sound('shot');}if(!w.auto)firing=false;updateHud();}
$('share-room').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);notice('คัดลอกลิงก์ห้องแล้ว ส่งให้เพื่อนได้เลย');}catch{notice(`รหัสห้อง: ${$('room-label').textContent}`);}};
function syncSettings(){
  $('ads-sensitivity').value=settings.adsSensitivity;$('ads-sensitivity-value').value=Number(settings.adsSensitivity).toFixed(2)+'×';
  $('sensitivity').value=settings.sensitivity;$('sensitivity-value').value=Number(settings.sensitivity).toFixed(2)+'×';$('volume').value=settings.volume*100;$('volume-value').value=`${Math.round(settings.volume*100)}%`;$('quality').value=settings.quality;$('motion').checked=settings.motion;
  renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'?1:1.75));renderer.shadowMap.enabled=settings.quality!=='low';grass.count=settings.quality==='low'?Math.floor(gi*.5):gi;if(master)master.gain.value=settings.volume;
}
$('mouse-settings').onclick=()=>$('settings-button').click();
$('reset-mouse').onclick=()=>{settings.sensitivity=1;settings.adsSensitivity=.7;syncSettings();try{localStorage.setItem('red-earth-settings',JSON.stringify(settings));}catch{}};
$('settings-button').onclick=()=>{if(locked)document.exitPointerLock();if(joined){active=false;clearInput();$('pause').hidden=false;}syncSettings();$('settings').showModal();};
$('help-button').onclick=()=>$('help').showModal();
for(const name of ['sensitivity','ads-sensitivity','volume','quality','motion'])$(name).addEventListener('input',()=>{settings[name==='ads-sensitivity'?'adsSensitivity':name]=name==='motion'?$(name).checked:name==='quality'?$(name).value:Number($(name).value)/(name==='volume'?100:1);syncSettings();try{localStorage.setItem('red-earth-settings',JSON.stringify(settings));}catch{}});
syncSettings();
function updateSupport(){const unsupported=matchMedia('(pointer:coarse)').matches||innerWidth<650;$('unsupported').hidden=!unsupported;if(unsupported&&joined){active=false;clearInput();if(locked)document.exitPointerLock();}}
window.addEventListener('resize',()=>{camera.aspect=weaponCamera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();weaponCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);updateSupport();});
updateSupport();

const vehicleVisuals=new Map();let currentVehicles=[];
function updateVehicles(list){currentVehicles=list;for(const v of list){let g=vehicleVisuals.get(v.id);if(!g){g=createJeep();g.position.set(v.x,groundHeight(v.x,v.z),v.z);scene.add(g);vehicleVisuals.set(v.id,g);}g.visible=v.hp>0;g.userData.target=v;}
  for(const [id,g]of vehicleVisuals)if(!list.some(v=>v.id===id)){scene.remove(g);disposeModel(g);vehicleVisuals.delete(id);}}
const medkitVisuals=new Map();
function updateMedkits(list){for(const k of list){let g=medkitVisuals.get(k.id);if(!g){g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.65,.35,.45),new THREE.MeshStandardMaterial({color:'#dde7cc',roughness:.6}));g.add(body);const plus=new THREE.MeshBasicMaterial({color:'#568a57'});const v=new THREE.Mesh(new THREE.BoxGeometry(.10,.01,.27),plus),h=new THREE.Mesh(new THREE.BoxGeometry(.27,.01,.10),plus);v.position.y=h.position.y=.18;g.add(v,h);g.position.set(k.x,groundHeight(k.x,k.z)+.45,k.z);scene.add(g);medkitVisuals.set(k.id,g);}g.visible=k.active;}}
const wallVisuals=new Map(),rocketVisuals=new Map();let currentWalls=[];
function updateWalls(list){currentWalls=list;
  for(const w of list){let g=wallVisuals.get(w.id);if(!g){g=new THREE.Group();const ice=new THREE.MeshStandardMaterial({color:'#9bd9e7',roughness:.24,metalness:.10,flatShading:true}),edge=new THREE.MeshStandardMaterial({color:'#d6f2ef',roughness:.36});
    for(let i=0;i<9;i++){const h=2.6+(Math.sin(i*2.7)+1)*.3,part=new THREE.Mesh(new THREE.CylinderGeometry(.50,.70,h,5),i%3?ice:edge);const offset=-2.65+i*.66;part.position.set(w.w>w.d?offset:0,h/2,w.w>w.d?0:offset);part.rotation.y=i*.5;part.castShadow=true;part.receiveShadow=true;g.add(part);}
    g.position.set(w.x,groundHeight(w.x,w.z),w.z);scene.add(g);wallVisuals.set(w.id,g);}
    g.scale.y=.94+.06*w.hp/450;
  }
  for(const [id,g]of wallVisuals)if(!list.some(w=>w.id===id)){puff(g.position.clone().add(new THREE.Vector3(0,1,0)),'#c8eaf2',12);scene.remove(g);disposeModel(g);wallVisuals.delete(id);}
}
function updateRocketVisuals(list){
  for(const r of list){let g=rocketVisuals.get(r.id);if(!g){g=new THREE.Group();const core=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:'#fff4b9'}));g.add(core);const body=new THREE.Mesh(new THREE.ConeGeometry(.13,.6,8),new THREE.MeshStandardMaterial({color:'#657449',roughness:.6}));body.position.y=.15;g.add(body);g.add(new THREE.PointLight('#ffb957',3,4));scene.add(g);rocketVisuals.set(r.id,g);}g.position.set(r.x,r.y,r.z);if(r.direction)g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...r.direction));puff(g.position,'#b5aa94',1);}
  for(const [id,g]of rocketVisuals)if(!list.some(r=>r.id===id)){scene.remove(g);disposeModel(g);rocketVisuals.delete(id);}
}
let killTimer,streak=0,lastKillAt=0;
function showKill(m){const now=performance.now();streak=now-lastKillAt<5000?streak+1:1;lastKillAt=now;$('kill-title').textContent=streak>1?`${streak} KILL COMBO`:m.head?'HEADSHOT':'ELIMINATED';$('kill-victim').textContent=m.victim;$('kill-weapon').textContent=m.weapon==='grenade'?'FRAG GRENADE':getWeapon(m.weapon).name;const banner=$('kill-banner');banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');sound('hit');clearTimeout(killTimer);killTimer=setTimeout(()=>banner.classList.remove('show'),2600);}
const smokeVisuals=new Map();let currentSmokes=[];
function updateSmokes(list){currentSmokes=list;
  for(const s of list){if(!smokeVisuals.has(s.id)){const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#afb8b0',roughness:1,transparent:true,opacity:.96,side:THREE.DoubleSide});for(let i=0;i<7;i++){const cloud=new THREE.Mesh(new THREE.SphereGeometry(SKILLS.smoke.radius*(i? .63:1),20,14),mat);if(i)cloud.position.set(Math.cos(i*2.4)*2,Math.sin(i*3)*1.2,Math.sin(i*2.4)*2);g.add(cloud);}g.position.set(s.x,s.y,s.z);scene.add(g);smokeVisuals.set(s.id,g);}}
  for(const [id,g]of smokeVisuals)if(!list.some(s=>s.id===id)){scene.remove(g);disposeModel(g);smokeVisuals.delete(id);}
}
const grenadeVisuals=new Map();
function updateGrenadeVisuals(list){
  for(const g of list){let model=grenadeVisuals.get(g.id);if(!model){model=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:'#55613c',roughness:.8}));scene.add(model);grenadeVisuals.set(g.id,model);}model.position.set(g.x,g.y,g.z);}
  for(const [id,model]of grenadeVisuals)if(!list.some(g=>g.id===id)){scene.remove(model);model.geometry.dispose();model.material.dispose();grenadeVisuals.delete(id);}
}
const explosionEffects=[];
function explosion(position,rocket=false){
  const p=new THREE.Vector3(...position),size=rocket?1.8:1; sound('blast',Math.max(1,p.distanceTo(camera.position)*.25));
  const group=new THREE.Group();group.position.copy(p);scene.add(group);
  const fire=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshBasicMaterial({color:'#ffb744',transparent:true,opacity:1,depthWrite:false}));group.add(fire);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.7,12,8),new THREE.MeshBasicMaterial({color:'#fff5cb',transparent:true,depthWrite:false}));group.add(core);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.86,1,64),new THREE.MeshBasicMaterial({color:'#dfba7d',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.06;group.add(ring);
  const light=new THREE.PointLight('#ff9c38',45,35);group.add(light);
  const clouds=[];for(let i=0;i<(rocket?14:8);i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:i%2?'#645f55':'#94816a',transparent:true,opacity:0,roughness:1,depthWrite:false}));m.position.set(Math.cos(i*2.4)*.7,.3+Math.sin(i)*.5,Math.sin(i*2.4)*.7);group.add(m);clouds.push(m);}
  explosionEffects.push({group,fire,core,ring,light,clouds,time:0,size});
  for(let i=0;i<(rocket?50:24);i++){const spark=new THREE.Mesh(new THREE.SphereGeometry(.025,4,3),new THREE.MeshBasicMaterial({color:i%3?'#ffd58d':'#6e5944',transparent:true}));spark.position.copy(p);scene.add(spark);particles.push({m:spark,v:new THREE.Vector3(range(-12,12),range(2,13),range(-12,12)).multiplyScalar(size),life:range(.5,1.25)});}
  if(!settings.motion&&p.distanceTo(camera.position)<30)recoil=.12;
}
function animateReload(model,p,active){
  const data=model.userData,w=getWeapon(data.weapon);for(const [node,rest]of data.rest||[]){node.position.copy(rest.p);node.rotation.copy(rest.r);}
  if(data.reloadHand)data.reloadHand.visible=active;if(data.supportHand)data.supportHand.visible=!active;if(data.supportArm)data.supportArm.visible=!active;
  if(data.shell)data.shell.visible=false;
  if(data.round)data.round.visible=active||me.ammo>0;
  if(!active){reloadSoundStage=-1;return;}
  const stage=p<.22?0:p<.55?1:p<.8?2:3;if(stage!==reloadSoundStage){reloadSoundStage=stage;sound('reload');}
  const hand=data.reloadHand;
  if(w.kind==='launcher'&&data.round){const round=data.round;round.visible=p>.25;round.position.x+=(1-Math.min(1,Math.max(0,(p-.25)/.5)))*.5;round.position.y-=Math.sin(p*Math.PI)*.2;if(hand)hand.position.copy(round.position).add(new THREE.Vector3(-.06,-.05,.12));}
  else if(w.kind==='shotgun'&&data.shell){const phase=(p*5)%1;data.shell.visible=p<.8;data.shell.position.x+=(1-phase)*.16;data.shell.position.y-=(1-phase)*.16;if(hand)hand.position.copy(data.shell.position);if(data.pump&&p>.8)data.pump.position.z+=Math.sin((p-.8)/.2*Math.PI)*.14;}
  else if(data.magazine){const mag=data.magazine;let drop=0;if(p<.24)drop=p/.24;else if(p<.48)drop=1;else if(p<.78)drop=1-(p-.48)/.30;mag.position.y-=drop*.45;mag.position.x-=drop*.12;mag.rotation.z-=drop*.25;if(hand)hand.position.copy(mag.position).add(new THREE.Vector3(-.06,-.05,0));}
  if(data.bolt&&p>.8)data.bolt.position.z+=Math.sin((p-.8)/.2*Math.PI)*.1;
}
let reloadSoundStage=-1;
const previewScene=new THREE.Scene();previewScene.add(new THREE.HemisphereLight('#d7e3e3','#71573d',3));const pl=new THREE.DirectionalLight('#ffe0b1',4);pl.position.set(-2,4,4);previewScene.add(pl);const rim=new THREE.DirectionalLight('#b7c9d3',2);rim.position.set(2,2,-2);previewScene.add(rim);
const previewCamera=new THREE.PerspectiveCamera(33,1,.05,15);previewCamera.position.set(0,1.17,4.4);previewCamera.lookAt(0,1.05,0);
let previewOperator;
function refreshPreview(){if(previewOperator){previewScene.remove(previewOperator);disposeModel(previewOperator);}previewOperator=createOperator($('character-select').value,$('primary-weapon').value);previewOperator.rotation.y=Math.PI+.28;previewScene.add(previewOperator);const c=getCharacter($('character-select').value);$('operator-name').textContent=`${c.name} · ${c.maxHp||100} HP`;$('operator-description').textContent=`${c.outfit} · อัลติ ${getUltimate(c.id).name}: ${getUltimate(c.id).description}`;const w=getWeapon($('primary-weapon').value);$('weapon-description').textContent=`${w.label} · ${w.mag} นัด · ${w.auto?'อัตโนมัติ':'ทีละนัด'} · ${w.damage}${w.pellets?' × '+w.pellets:''} ดาเมจ`;}
for(const id of ['primary-weapon','secondary-weapon'])for(const w of WEAPONS.filter(w=>w.mag)){const option=document.createElement('option');option.value=w.id;option.textContent=`${w.name} — ${w.label}`;$(id).append(option);}
for(const c of CHARACTERS){const option=document.createElement('option');option.value=c.id;option.textContent=`${c.name} · ${c.label}`;$('character-select').append(option);}
$('primary-weapon').value='ar4';$('secondary-weapon').value='falcon';$('character-select').value='nova';
for(const id of ['primary-weapon','secondary-weapon','character-select'])$(id).addEventListener('change',()=>{if($('primary-weapon').value===$('secondary-weapon').value)$('secondary-weapon').value=$('primary-weapon').value==='falcon'?'magnum':'falcon';refreshPreview();});
for(const name of ['skill-slot-1','skill-slot-2'])for(const [id,skill]of Object.entries(SKILLS)){const option=document.createElement('option');option.value=id;option.textContent=skill.name;$(name).append(option);}
$('skill-slot-1').value='wall';$('skill-slot-2').value='heal';
for(const name of ['skill-slot-1','skill-slot-2'])$(name).addEventListener('change',()=>{const other=name==='skill-slot-1'?'skill-slot-2':'skill-slot-1';if($(other).value===$(name).value)$(other).value=Object.keys(SKILLS).find(id=>id!==$(name).value);});
refreshPreview();
let last=performance.now(),lastStep=0;gun.visible=false;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;const t=now/1000;
  if(grassShader)grassShader.uniforms.windTime.value=t;
  for(const g of vehicleVisuals.values()){const v=g.userData.target;if(!v)continue;const alpha=1-Math.exp(-dt*18);g.position.lerp(new THREE.Vector3(v.x,groundHeight(v.x,v.z),v.z),alpha);let delta=((v.yaw-g.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;g.rotation.y+=delta*alpha;g.userData.wheels.forEach(w=>w.rotation.x-=v.speed*dt);}
  for(const [id,g]of medkitVisuals){if(g.visible){g.position.y=groundHeight(MEDKIT_SPAWNS[id][0],MEDKIT_SPAWNS[id][1])+.45+Math.sin(t*2+id)*.07;g.rotation.y=t*.5;}}

  for(let i=explosionEffects.length-1;i>=0;i--){const f=explosionEffects[i];f.time+=dt;const age=f.time,s=f.size;f.fire.scale.setScalar((.5+age*8)*s);f.fire.material.opacity=Math.max(0,1-age*1.8);f.core.scale.setScalar((.3+age*7)*s);f.core.material.opacity=Math.max(0,1-age*3);f.light.intensity=Math.max(0,45*(1-age*2));f.ring.scale.setScalar((1+age*19)*s);f.ring.material.opacity=Math.max(0,.65-age*.7);f.clouds.forEach((m,j)=>{m.material.opacity=Math.max(0,Math.min(.65,age*2)*Math.min(1,(3.4-age)/1.5));m.position.y+=dt*(1.1+j*.05);m.position.x+=Math.cos(j*2.4)*dt*1.2;m.position.z+=Math.sin(j*2.4)*dt*1.2;m.scale.setScalar((.3+age*1.5)*s);});if(age>3.4){scene.remove(f.group);disposeModel(f.group);explosionEffects.splice(i,1);}}

  const insideSmoke=joined&&currentSmokes.some(s=>Math.hypot(camera.position.x-s.x,camera.position.y-s.y,camera.position.z-s.z)<SKILLS.smoke.radius);$('smoke-screen').hidden=!insideSmoke;
  for(const g of smokeVisuals.values())g.rotation.y=t*.04;

  if(!joined){
    const drift=settings.motion?0:Math.sin(t*.08)*1.4;camera.position.set(13+drift,groundHeight(13,24)+4.1,24);camera.lookAt(-5,1.5,-17);
  }else{
    if(me.vehicle){const car=currentVehicles.find(v=>v.id===me.vehicle);if(car){me.x=THREE.MathUtils.lerp(me.x,car.x,1-Math.exp(-dt*18));me.z=THREE.MathUtils.lerp(me.z,car.z,1-Math.exp(-dt*18));}}
    if(active&&!dead&&!me.vehicle){
      stepJump(me,dt);
      let dx=Number(keys.d)-Number(keys.a),dz=Number(keys.s)-Number(keys.w);const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
      const speed=(me.slow?.5:1)*(keys.crouch?2.1:keys.sprint&&!aiming?7:4.2)*(getCharacter(me.character).speed||1)*((me.ultEnds||0)>now?(getUltimate(me.character).speed||1):1);
      // Sprint input is sent exactly as simulated; aiming releases sprint.
      if(aiming)keys.sprint=false;
      if((me.slideEnds||0)>now){const slideSpeed=12*(.4+.6*Math.min(1,(me.slideEnds-now)/900));movePlayer(me,(me.slideX||0)*slideSpeed*dt,(me.slideZ||0)*slideSpeed*dt,[...COVER,...currentWalls]);}
      else movePlayer(me,(dx*Math.cos(yaw)+dz*Math.sin(yaw))*speed*dt,(dz*Math.cos(yaw)-dx*Math.sin(yaw))*speed*dt,[...COVER,...currentWalls]);
      if(dx||dz){walkTime+=dt*(keys.sprint?12:8);if(now-lastStep>(keys.sprint?290:450)){sound('step');lastStep=now;}}
      if(serverSnapshot){const error=Math.hypot(me.x-serverSnapshot.x,me.z-serverSnapshot.z);if(error>.8){me.x=THREE.MathUtils.lerp(me.x,serverSnapshot.x,Math.min(1,dt*3));me.z=THREE.MathUtils.lerp(me.z,serverSnapshot.z,Math.min(1,dt*3));}}
      if(firing)shoot();
    }
    sendAccumulator+=dt;if(sendAccumulator>=.05){sendAccumulator=0;sendInput();}
    const moving=active&&(keys.w||keys.s||keys.a||keys.d),bob=settings.motion?0:moving?Math.sin(walkTime)*.035:Math.sin(t*1.3)*.004;
    const eye=groundHeight(me.x,me.z)+(me.lift||0)+((me.slideEnds||0)>now?.9:keys.crouch?1.12:EYE_HEIGHT)+(aiming?0:bob);
    camera.position.set(me.x,THREE.MathUtils.lerp(camera.position.y,eye,Math.min(1,dt*14)),me.z);camera.rotation.set(pitch,yaw,0);
    camera.fov=THREE.MathUtils.lerp(camera.fov,aiming?(getWeapon(me.weapon).zoom||49):keys.sprint&&moving?78:72,1-Math.exp(-dt*12));camera.updateProjectionMatrix();
    const a=aiming?1:0;recoil*=Math.exp(-dt*15);
    const reloading=reloadEnd>now,progress=reloading?Math.max(0,Math.min(1,(now-reloadStart)/(reloadEnd-reloadStart))):0,handling=Math.sin(progress*Math.PI);
    gun.position.lerp(new THREE.Vector3(reloading?.23-.12*handling:aiming?0:.23,reloading?-.26+.22*handling:aiming?-.1125:-.26,reloading?-.4-.22*handling:aiming?-.38:-.4),1-Math.exp(-dt*14));
    gun.position.y+=(settings.motion?0:moving?Math.abs(Math.sin(walkTime))*.0015:0);gun.position.z+=recoil*.7;
    gun.rotation.set(recoil*1.5+Math.sin(progress*Math.PI)*.42,Math.sin(progress*Math.PI)*-.2,Math.sin(progress*Math.PI)*-.65+(settings.motion?0:Math.sin(walkTime*.5)*(moving?.012:.002)));
    animateReload(weaponModel,reloading?progress:0,reloading);if(knifeUntil>now){const slash=Math.sin((1-(knifeUntil-now)/330)*Math.PI);gun.rotation.z-=slash*1.5;gun.position.x-=slash*.3;gun.position.z-=slash*.2;}gun.visible=!dead&&!(aiming&&getWeapon(me.weapon).zoom&&!me.reloading);
    flash.visible=now<flashUntil&&getWeapon(me.weapon).kind!=='knife';flashLight.intensity=flash.visible?3:0;
    for(const r of remotePlayers.values()){
      const p=r.target,prev=r.g.position.clone(),next=new THREE.Vector3(p.x,groundHeight(p.x,p.z)+(p.lift||0),p.z);r.g.position.lerp(next,1-Math.exp(-dt*14));r.g.rotation.y=p.yaw;r.g.scale.y=p.crouch?.72:1;
      const walking=prev.distanceTo(r.g.position)>.003;r.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(t*10+i*Math.PI)*.4:0);
    }
    updateHud();
  }
  targetGroups.forEach(g=>g.rotation.x=THREE.MathUtils.lerp(g.rotation.x,g.userData.down?-Math.PI/2:0,1-Math.exp(-dt*10)));
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.m.position.addScaledVector(p.v,dt);p.v.y-=dt*2;p.m.scale.multiplyScalar(1+dt*1.5);p.m.material.opacity=Math.max(0,p.life*1.4);if(p.life<=0){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();particles.splice(i,1);}}
  for(let i=tracers.length-1;i>=0;i--){const p=tracers[i];p.life-=dt;if(p.life<=0){scene.remove(p.line);p.line.geometry.dispose();p.line.material.dispose();tracers.splice(i,1);}}
  renderer.autoClear=true;renderer.render(scene,camera);
  if(!joined&&previewOperator){const rect=$('operator-stage').getBoundingClientRect();if(rect.width&&rect.height&&innerWidth>=650){previewCamera.aspect=rect.width/rect.height;previewCamera.updateProjectionMatrix();previewOperator.rotation.y=Math.PI+.28+(settings.motion?0:Math.sin(t*.3)*.12);renderer.autoClear=false;renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissorTest(true);renderer.clearDepth();renderer.render(previewScene,previewCamera);renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);}}
if(joined&&!dead){renderer.autoClear=false;renderer.clearDepth();renderer.render(weaponScene,weaponCamera);}
}
requestAnimationFrame(frame);
