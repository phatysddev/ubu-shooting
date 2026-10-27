import * as THREE from 'three';
import {getWeapon,getCharacter} from '../shared/arsenal.js';
const trimMaterial=()=>mat('#b29955',.45);
const mat=(color,roughness=.75)=>new THREE.MeshStandardMaterial({color,roughness});
function shape(g,geometry,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,m,x,y,z,w,h,d){return shape(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function ellipsoid(g,m,x,y,z,w,h,d){return shape(g,new THREE.SphereGeometry(1,16,12),m,x,y,z,w,h,d);}
function tube(g,m,x,y,z,r,length,axis='y'){const t=shape(g,new THREE.CylinderGeometry(r,r,length,12),m,x,y,z);if(axis==='z')t.rotation.x=Math.PI/2;return t;}
export function disposeModel(g){g.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
export function createWeapon(id,{hands=false}={}){
  const w=getWeapon(id),g=new THREE.Group(),steel=mat('#363c3c',.45),poly=mat(w.color),detail=mat('#a3a398',.4),glove=mat('#554b39');
  if(w.kind==='launcher'){
    tube(g,poly,0,0,-.35,.10,.95,'z');tube(g,steel,0,0,.15,.135,.14,'z');tube(g,steel,0,0,-.85,.115,.12,'z');
    const warhead=shape(g,new THREE.ConeGeometry(.13,.40,12),poly,0,0,-1.08);warhead.rotation.x=-Math.PI/2;g.userData.round=warhead;
    box(g,poly,.07,-.17,-.25,.07,.25,.10);box(g,steel,.13,.12,-.42,.025,.20,.18);box(g,detail,.13,.23,-.44,.08,.035,.08);
    if(hands){ellipsoid(g,glove,.07,-.18,-.25,.08,.09,.09);g.userData.supportHand=ellipsoid(g,glove,-.08,-.10,-.62,.08,.075,.12);}
  }else if(w.kind==='knife'){
    box(g,poly,0,-.08,-.12,.07,.08,.23);box(g,steel,0,-.08,-.26,.19,.035,.03);
    const blade=new THREE.Shape();blade.moveTo(-.04,0);blade.lineTo(.04,0);blade.lineTo(.035,.29);blade.lineTo(0,.44);blade.lineTo(-.04,.28);blade.closePath();
    const m=shape(g,new THREE.ExtrudeGeometry(blade,{depth:.012,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:1,steps:1}),detail,0,-.08,-.27);m.rotation.x=-Math.PI/2;
    if(hands)ellipsoid(g,glove,0,-.12,-.11,.085,.08,.13);
  }else{
    const pistol=w.kind==='pistol',short=w.kind==='smg',sniper=w.kind==='sniper',shotgun=w.kind==='shotgun',lmg=w.kind==='lmg',length=pistol?.23:short?.40:sniper?.88:.63;
    box(g,steel,0,0,-.2,.115,.13,pistol?.25:.4);box(g,poly,0,-.035,-.2-length*.55,.12,.12,length*.62);
    tube(g,steel,0,.01,-.2-length,.023,pistol?.14:.3,'z');tube(g,steel,0,.01,-.25-length,.031,.07,'z');
    if(id==='spectre')tube(g,steel,0,.01,-.82,.047,.26,'z');
    const grip=box(g,poly,0,-.16,-.085,.085,.22,.10);grip.rotation.x=-.22;
    if(!pistol){box(g,poly,0,-.02,.11,.085,.11,.26);box(g,poly,0,-.03,.25,.12,.2,.06);}
    if(!shotgun){const magazine=box(g,poly,0,-.21,pistol?-.085:-.27,lmg?.24:.085,lmg?.23:.28,lmg?.23:.15);magazine.rotation.x=id==='ak47'?-.28:0;g.userData.magazine=magazine;}
    else {tube(g,steel,0,-.06,-.55,.027,.55,'z');g.userData.pump=box(g,poly,0,-.045,-.51,.15,.15,.23);g.userData.shell=tube(g,trimMaterial(),.12,-.13,-.24,.022,.10,'z');g.userData.shell.visible=false;}
    if(sniper||w.kind==='dmr'){tube(g,steel,0,.17,-.28,.048,.32,'z');tube(g,detail,0,.17,-.45,.06,.04,'z');box(g,steel,0,.095,-.25,.04,.1,.18);}
    else for(const z of [pistol?-.31:-.67,-.11]){box(g,steel,0,.12,z,.022,.08,.03);box(g,steel,-.036,.15,z,.014,.06,.03);box(g,steel,.036,.15,z,.014,.06,.03);}
    if(!pistol)for(let i=0;i<12;i++)box(g,steel,0,.09,-.1-i*.04,.12,.012,.018);
    if(id==='ak47')box(g,poly,0,-.02,.13,.12,.15,.27);
    if(lmg){const leg=box(g,steel,.09,-.17,-.69,.025,.35,.025);leg.rotation.z=-.35;const other=leg.clone();other.position.x=-.09;other.rotation.z=.35;g.add(other);}
    if(hands){ellipsoid(g,glove,.045,-.18,-.07,.09,.08,.1);if(!pistol){g.userData.supportHand=ellipsoid(g,glove,-.075,-.10,-.49,.08,.075,.12);const arm=box(g,poly,-.19,-.24,-.28,.14,.16,.4);g.userData.supportArm=arm;arm.rotation.y=.35;arm.rotation.z=-.3;}box(g,poly,.14,-.30,.1,.15,.17,.32);}
  }
  if(hands){const hand=new THREE.Group();ellipsoid(hand,glove,0,0,0,.07,.07,.1);box(hand,poly,0,-.05,.15,.12,.12,.30);hand.position.set(-.13,-.12,-.45);hand.visible=false;g.add(hand);g.userData.reloadHand=hand;}
  const bolt=box(g,steel,.075,.01,-.17,.025,.025,.09);bolt.visible=w.mag>0;g.userData.bolt=bolt;
  g.userData.weapon=id;g.userData.rest=new Map();for(const node of [g.userData.magazine,g.userData.round,g.userData.bolt,g.userData.pump,g.userData.shell,g.userData.reloadHand].filter(Boolean))g.userData.rest.set(node,{p:node.position.clone(),r:node.rotation.clone()});return g;
}
// All operators are adults. Costume emphasis is fashion and silhouette.
export function createOperator(id,weapon='ar4'){
  const c=getCharacter(id),g=new THREE.Group(),skin=mat(c.skin),cloth=mat(c.cloth),hair=mat(c.hair),boot=mat('#292c29'),trim=mat(c.accent,.5),legs=[],arms=[];
  const female=c.female;
  if(female){
    ellipsoid(g,skin,0,1.12,0,.205,.30,.135);
    ellipsoid(g,cloth,0,1.34,0,.245,.18,.15);
    // Cropped fitted top and high waist keep the outfit clearly clothed.
    ellipsoid(g,cloth,0,.91,0,.245,.17,.155);
    if(id==='sable'){ellipsoid(g,cloth,0,1.11,.035,.16,.20,.12);for(const side of [-1,1])box(g,trim,side*.17,1.1,-.105,.028,.32,.035);}
    if(id==='valkyrie')for(const side of [-1,1]){const jacket=box(g,cloth,side*.23,1.36,.02,.12,.28,.28);jacket.rotation.z=side*.2;}
    box(g,trim,0,1.01,-.14,.08,.05,.035);
  }else{box(g,cloth,0,1.2,0,.52,.6,.31);box(g,mat('#424c39'),0,1.24,-.03,.57,.45,.36);}
  if(id==='bastion'){
    const armor=mat('#3d494c'),plate=mat('#8a9c9d',.45);
    box(g,armor,0,1.20,-.08,.64,.64,.36);box(g,plate,0,1.30,-.285,.40,.28,.06);
    for(const side of [-1,1]){ellipsoid(g,armor,side*.38,1.4,0,.16,.15,.19);box(g,plate,side*.18,.62,-.16,.19,.25,.07);}
    tube(g,armor,0,1.84,0,.19,.17);box(g,plate,0,1.75,-.16,.28,.07,.035);
  }
  tube(g,skin,0,1.56,0,.067,.12);
  ellipsoid(g,skin,0,1.72,0,female?.143:.16,.193,.145);
  ellipsoid(g,hair,0,1.80,.025,.15,.15,.15);
  if(female){
    ellipsoid(g,hair,.10,1.57,.19,.06,.21,.065);
    ellipsoid(g,hair,0,1.87,.13,.08,.07,.08);
    for(const side of [-1,1]){ellipsoid(g,boot,side*.052,1.735,-.132,.028,.012,.008);ellipsoid(g,trim,side*.15,1.67,-.01,.012,.026,.012);}
    ellipsoid(g,mat('#9a5a4f'),0,1.645,-.132,.034,.009,.008);
  }else tube(g,cloth,0,1.85,0,.18,.12);
  for(const side of [-1,1]){
    const limb=new THREE.Group();limb.position.set(side*(female?.135:.16),.87,0);g.add(limb);legs.push(limb);
    ellipsoid(limb,female?skin:cloth,0,-.23,0,female?.105:.12,.29,.115);
    ellipsoid(limb,boot,0,-.62,0,.105,.25,.115);ellipsoid(limb,boot,0,-.78,-.07,.115,.09,.19);
    if(female){tube(limb,trim,0,-.40,0,.11,.035);box(limb,cloth,0,-.07,0,.215,.19,.22);}
    const arm=new THREE.Group();arm.position.set(side*(female?.29:.35),1.43,0);g.add(arm);arms.push(arm);arm.rotation.x=-.45;
    ellipsoid(arm,female?skin:cloth,0,-.17,0,.075,.20,.08);ellipsoid(arm,skin,0,-.37,-.10,.065,.17,.07);ellipsoid(arm,boot,0,-.51,-.14,.07,.08,.08);
    if(side===1)box(limb,boot,.06,-.20,0,.08,.16,.10);
  }
  const held=createWeapon(weapon);held.scale.setScalar(.65);held.position.set(.16,1.18,-.23);g.add(held);
  g.userData.legs=legs;g.userData.held=held;return g;
}

export function createJeep(){
  const g=new THREE.Group(),body=mat('#58664b'),metal=mat('#303a36',.5),rubber=mat('#202622'),seat=mat('#665841');
  box(g,body,0,.60,0,1.7,.40,3.3);box(g,body,0,.94,-1.05,1.65,.35,1.15);box(g,metal,0,.45,-1.8,1.9,.16,.14);box(g,metal,0,.45,1.8,1.9,.16,.14);
  for(const x of [-.7,.7]){box(g,metal,x,1.32,-.35,.07,.85,.07);box(g,metal,x,1.32,1.1,.07,.85,.07);box(g,metal,x,1.75,.36,.07,.07,1.55);box(g,body,x,.91,.65,.1,.25,1.4);box(g,seat,x*.6,.92,.40,.50,.22,.65);box(g,seat,x*.6,1.15,.72,.50,.55,.14);}
  box(g,metal,0,1.75,-.35,1.5,.07,.07);box(g,metal,0,1.75,1.1,1.5,.07,.07);
  for(const x of [-.6,.6])box(g,mat('#e7dab2',.35),x,.98,-1.64,.28,.17,.03);
  const wheels=[];for(const x of [-.95,.95])for(const z of [-1.05,1.05]){const w=tube(g,rubber,x,.45,z,.40,.28);w.rotation.z=Math.PI/2;wheels.push(w);}
  g.userData.wheels=wheels;return g;
}
