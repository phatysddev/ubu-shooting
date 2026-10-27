import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {createServer as createViteServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {SPAWNS,TARGETS,COVER,MEDKIT_SPAWNS,EYE_HEIGHT,canStand,movePlayer,groundHeight,direction,rayBox,coverDistance} from './shared/world.js';

import {getWeapon,getCharacter,GRENADE,blastDamage} from './shared/arsenal.js';

import {SKILLS,stepJump,launchJump,beginSlide} from './shared/tactics.js';

import {awardUltimate,activateUltimate,ultimateModifiers,ultimateVictims} from './shared/ultimate.js';

import {selectSkills} from './shared/loadout.js';

import {getPerk,rollPerk,steerHoming} from './shared/perks.js';
import {createVehicles,stepVehicle,VEHICLE_SPAWNS} from './shared/vehicles.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const production=process.env.NODE_ENV==='production';
const vite=production?null:await createViteServer({root,server:{middlewareMode:true},appType:'spa'});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
  if(vite){vite.middlewares(req,res);return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'dist','.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);res.end();return;}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048});
server.on('upgrade',(req,socket,head)=>{
  if(req.url==='/socket')wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  else if(!vite){socket.destroy();}
});
const rooms=new Map();
const send=(ws,msg)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
const broadcast=(room,msg)=>{for(const p of room.players.values())send(p.ws,msg);};
const safeText=(v,max)=>typeof v==='string'?v.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,max):'';
function freshSpawn(p,room){
  const spots=SPAWNS.map(([x,z])=>({x,z,score:Math.min(...[...room.players.values()].filter(q=>q!==p&&q.hp>0).map(q=>Math.hypot(q.x-x,q.z-z)),999)})).sort((a,b)=>b.score-a.score);
  Object.assign(p,{x:spots[0].x,z:spots[0].z,maxHp:getCharacter(p.character).maxHp||100,hp:getCharacter(p.character).maxHp||100,vehicle:null,slideUntil:0,slideCooldown:0,slowUntil:0,perks:Object.fromEntries([p.primary,p.secondary].map(id=>[id,rollPerk()])),rollUntil:0,ultUntil:0,lift:0,vy:0,cooldowns:{dash:0,smoke:0,heal:0,wall:0},healUntil:0,ammo:getWeapon(p.weapon).mag,inventory:Object.fromEntries([p.primary,p.secondary].map(id=>[id,getWeapon(id).mag])),grenades:GRENADE.count,lastGrenade:0,switchUntil:0,reloadUntil:0,deadUntil:0,input:{},yaw:0,pitch:0,spawnUntil:Date.now()+3000});
}
function applyDamage(room,victim,amount,attacker,now,meta={}){
  if(victim.hp<=0||amount<=0||victim.spawnUntil>now)return;
  amount*=getPerk(attacker?.perks?.[meta.weapon]).damage||1;amount*=ultimateModifiers(victim,now).incoming||1;amount*=ultimateModifiers(attacker,now).damage||1;const dealt=Math.min(victim.hp,amount);victim.hp=Math.max(0,victim.hp-amount);
  if(attacker&&attacker!==victim){const perk=getPerk(attacker.perks?.[meta.weapon]);if(perk.leech)attacker.hp=Math.min(attacker.maxHp,attacker.hp+dealt*perk.leech);if(perk.slow)victim.slowUntil=now+2000;}victim.healUntil=0;send(victim.ws,{type:'damage'});
  if(victim.hp===0){victim.ultUntil=0;if(victim.vehicle){const car=room.vehicles.find(v=>v.id===victim.vehicle);if(car){car.driver=null;car.speed=0;}victim.vehicle=null;}victim.deaths++;victim.deadUntil=now+3500;victim.input={};if(attacker&&attacker!==victim&&attacker.id){attacker.kills++;awardUltimate(attacker);}broadcast(room,{type:'kill',killerId:attacker?.id,victimId:victim.id,killer:attacker?.name||'GRENADE',victim:victim.name,weapon:meta.weapon||'grenade',head:!!meta.head});}
}
const roomCover=room=>[...COVER,...room.walls.filter(w=>w.hp>0)];
function moveInRoom(room,p,dx,dz){return movePlayer(p,dx,dz,roomCover(room));}
function rayCover(room,o,d){return coverDistance(o,d,roomCover(room));}
function blast(room,o,damage,radius,owner,now,weapon){
  const cover=roomCover(room);
  for(const p of room.players.values()){
    if(p.hp<=0||p.spawnUntil>now)continue;
    const d=[p.x-o[0],groundHeight(p.x,p.z)+(p.lift||0)+.9-o[1],p.z-o[2]],distance=Math.hypot(...d);
    if(distance<radius&&coverDistance(o,d.map(v=>v/(distance||1)),cover)>=distance-.1)applyDamage(room,p,Math.round(damage*(1-distance/radius)*(weapon==='rpg'&&p===owner? .2:1)),owner,now,{weapon});
  }
  for(const v of room.vehicles){if(v.hp<=0)continue;const distance=Math.hypot(v.x-o[0],v.z-o[2]);if(distance<radius){v.hp=Math.max(0,v.hp-damage*(1-distance/radius));if(v.hp<=0)destroyVehicle(room,v,now);}}
  for(const w of room.walls){const dist=Math.hypot(Math.max(0,Math.abs(o[0]-w.x)-w.w),Math.max(0,Math.abs(o[2]-w.z)-w.d));if(dist<radius)w.hp=Math.max(0,w.hp-Math.round(damage*2*(1-dist/radius)));}
  TARGETS.forEach(([x,z],i)=>{const d=[x-o[0],groundHeight(x,z)+1.2-o[1],z-o[2]],distance=Math.hypot(...d);if(distance<radius&&coverDistance(o,d.map(v=>v/(distance||1)),cover)>=distance-.1){room.targets[i].hp=0;room.targets[i].resetAt=now+4500;}});
  broadcast(room,{type:'explosion',position:o,weapon});
}
function destroyVehicle(room,v,now){v.hp=0;v.resetAt=now+15000;const p=room.players.get(v.driver);if(p){p.vehicle=null;p.lift=0;applyDamage(room,p,60,null,now);}v.driver=null;broadcast(room,{type:'explosion',position:[v.x,groundHeight(v.x,v.z)+.5,v.z],weapon:'rpg'});}
function updateRockets(room,now,dt){
  for(const r of room.rockets){
    const o=[r.x,r.y,r.z];
    const owner=room.players.get(r.owner),targets=[...room.players.values()].filter(p=>p.id!==r.owner&&p.hp>0).map(p=>{const at=[p.x,groundHeight(p.x,p.z)+(p.lift||0)+1,p.z],delta=at.map((v,i)=>v-o[i]),distance=Math.hypot(...delta),dot=delta.reduce((sum,v,i)=>sum+v*r.direction[i],0)/(distance||1);return{p,at,distance,dot};}).filter(t=>t.distance<200&&t.dot>.45&&rayCover(room,o,t.at.map((v,i)=>(v-o[i])/(t.distance||1)))>=t.distance-.2).sort((a,b)=>b.dot-a.dot);
    if(targets[0])r.direction=steerHoming(r.direction,o,targets[0].at,dt);const d=r.direction,travel=70*dt;let best=Math.min(travel,rayCover(room,o,d)),hit=best<travel;
    for(const p of room.players.values()){
      if(p.id===r.owner||p.hp<=0||p.spawnUntil>now)continue;
      const y=groundHeight(p.x,p.z)+(p.lift||0),h=p.input.crouch?1.35:1.9,t=rayBox(o,d,[p.x-.4,y,p.z-.4],[p.x+.4,y+h,p.z+.4]);if(t<best){best=t;hit=true;}
    }
    for(const [x,z] of TARGETS){const y=groundHeight(x,z),t=rayBox(o,d,[x-.48,y+.65,z-.18],[x+.48,y+2,z+.18]);if(t<best){best=t;hit=true;}}
    for(const car of room.vehicles){if(car.hp<=0||car.driver===r.owner)continue;const y=groundHeight(car.x,car.z),t=rayBox(o,d,[car.x-1,y,car.z-1.7],[car.x+1,y+1.2,car.z+1.7]);if(t<best){best=t;hit=true;}}
    r.x+=d[0]*best;r.y+=d[1]*best;r.z+=d[2]*best;
    if(r.y<=groundHeight(r.x,r.z)+.1||now>=r.until)hit=true;
    if(hit){r.done=true;const point=[r.x-d[0]*.15,r.y-d[1]*.15,r.z-d[2]*.15];const owner=room.players.get(r.owner);blast(room,point,420,14*(ultimateModifiers(owner,now).radius||1),owner,now,'rpg');}
  }
  room.rockets=room.rockets.filter(r=>!r.done);
}
function updateGrenades(room,now,dt){
  for(const g of room.grenades){
    const nx=g.x+g.vx*dt,nz=g.z+g.vz*dt,ny=g.y+g.vy*dt;
    if(rayCover(room,[g.x,g.y,g.z],[Math.sign(g.vx),0,0])<Math.abs(g.vx*dt)){g.vx*=-.45;}else g.x=nx;
    if(rayCover(room,[g.x,g.y,g.z],[0,0,Math.sign(g.vz)])<Math.abs(g.vz*dt)){g.vz*=-.45;}else g.z=nz;
    let floor=groundHeight(g.x,g.z)+.12;
    for(const b of roomCover(room)){const top=groundHeight(b.x,b.z)+b.h+.12;if(Math.abs(g.x-b.x)<b.w+.1&&Math.abs(g.z-b.z)<b.d+.1&&g.y>=top-.02)floor=Math.max(floor,top);}
    g.y=ny;g.vy-=9.8*dt;
    if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.36;g.vx*=.76;g.vz*=.76;}
    if(now>=g.explodeAt){
      const o=[g.x,g.y+.15,g.z],owner=room.players.get(g.owner);
      for(const p of room.players.values()){
        if(p.hp<=0||p.spawnUntil>now)continue;
        const target=[p.x,groundHeight(p.x,p.z)+(p.lift||0)+.9,p.z],delta=target.map((v,i)=>v-o[i]),distance=Math.hypot(...delta);
        const blocked=distance>0&&rayCover(room,o,delta.map(v=>v/distance))<distance;
        applyDamage(room,p,blastDamage(distance,blocked),owner||{name:g.name},now);
      }
      TARGETS.forEach(([x,z],i)=>{const delta=[x-o[0],groundHeight(x,z)+1.2-o[1],z-o[2]],distance=Math.hypot(...delta);if(blastDamage(distance,rayCover(room,o,delta.map(v=>v/(distance||1)))<distance)>0){room.targets[i].hp=0;room.targets[i].resetAt=now+4500;}});
      for(const w of room.walls){const distance=Math.hypot(g.x-w.x,g.z-w.z);if(distance<9)w.hp=Math.max(0,w.hp-Math.round(220*(1-distance/9)));}
      broadcast(room,{type:'explosion',position:o});
    }
  }
  room.grenades=room.grenades.filter(g=>now<g.explodeAt);
}
wss.on('connection',ws=>{
  let player=null,room=null;
  const joinTimer=setTimeout(()=>{if(!player)ws.close(1008,'Join timeout');},10000);
  let windowStart=Date.now(),messages=0;
  ws.on('message',raw=>{
    const now=Date.now();if(now-windowStart>1000){windowStart=now;messages=0;}if(++messages>300){ws.close(1008,'Message rate exceeded');return;}
    let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
    if(m.type==='join'&&!player){
      const code=safeText(m.room,16).toUpperCase()||'SAVANNA';
      room=rooms.get(code);if(!room){room={code,players:new Map(),targets:TARGETS.map(()=>({hp:100,resetAt:0})),grenades:[],smokes:[],walls:[],rockets:[],strikes:[],vehicles:createVehicles(),medkits:MEDKIT_SPAWNS.map(([x,z],i)=>({id:i,x,z,readyAt:0}))};rooms.set(code,room);}
      if(room.players.size>=8){send(ws,{type:'error',message:'ห้องเต็มแล้ว กรุณาใช้รหัสห้องอื่น'});return;}
      player={id:randomUUID().slice(0,8),name:safeText(m.name,18)||'Ranger',ws,kills:0,deaths:0,lastShot:0,joined:now,lastSeen:now,ultCharge:0,ultUntil:0};
      player.primary=getWeapon(m.primary).kind==='knife'?'ar4':getWeapon(m.primary).id;player.secondary=getWeapon(m.secondary||'falcon').id;if(player.secondary===player.primary||getWeapon(player.secondary).kind==='knife')player.secondary=player.primary==='falcon'?'magnum':'falcon';player.skills=selectSkills(m.skills);player.weapon=player.primary;player.character=getCharacter(m.character).id;
      freshSpawn(player,room);room.players.set(player.id,player);clearTimeout(joinTimer);
      send(ws,{type:'joined',id:player.id,room:code});broadcast(room,{type:'notice',message:player.name+' เข้าสู่พื้นที่'});return;
    }
    if(!player)return;
    player.lastSeen=now;
    if(m.type==='input'){
      if(!Number.isFinite(m.yaw)||!Number.isFinite(m.pitch))return;
      player.yaw=m.yaw%(Math.PI*2);player.pitch=Math.max(-1.4,Math.min(1.4,m.pitch));
      const i=m.keys||{};if(i.crouch&&!player.input.crouch)beginSlide(player,now);player.input={w:!!i.w,s:!!i.s,a:!!i.a,d:!!i.d,sprint:!!i.sprint,crouch:!!i.crouch};return;
    }
    if(player.hp<=0)return;
    if(m.type==='roll'){
      if(now<player.rollUntil||!getWeapon(player.weapon).mag)return;player.perks[player.weapon]=rollPerk(player.perks[player.weapon]);player.rollUntil=now+8000;send(ws,{type:'perk',weapon:player.weapon,perk:player.perks[player.weapon]});return;
    }
    if(m.type==='vehicle'){
      if(player.vehicle){const car=room.vehicles.find(v=>v.id===player.vehicle);const positions=[[player.x+2.5,player.z],[player.x-2.5,player.z],[player.x,player.z+2.5]];const exit=positions.find(([x,z])=>canStand(x,z,.38,roomCover(room)));if(!exit)return;if(car){car.driver=null;car.speed=0;}player.vehicle=null;player.x=exit[0];player.z=exit[1];player.lift=0;return;}
      const car=room.vehicles.find(v=>v.hp>0&&!v.driver&&Math.hypot(v.x-player.x,v.z-player.z)<4.5);if(car){car.driver=player.id;player.vehicle=car.id;player.lift=.5;player.x=car.x;player.z=car.z;}return;
    }
    if(m.type==='ultimate'){
      if(activateUltimate(player,now)){
        const kind=ultimateModifiers(player,now).strike;
        if(kind){room.strikes.push({owner:player.id,kind,at:now+3000});broadcast(room,{type:'strike-warning',kind,name:player.name,delay:3000});}
        broadcast(room,{type:'ultimate',id:player.id,character:player.character,name:player.name});
      }return;
    }
    if(m.type==='slide'){beginSlide(player,now);return;}
    if(m.type==='jump'){if(!player.vehicle)launchJump(player);return;}
    if(m.type==='skill'){
      const skill=Object.hasOwn(SKILLS,m.skill)?SKILLS[m.skill]:null;if(!skill||player.vehicle||!player.skills.includes(m.skill)||now<player.cooldowns[m.skill])return;
      if(m.skill==='heal'&&player.hp>=player.maxHp)return;
      if(m.skill==='wall'){
        const d=direction(player.yaw,0),x=player.x+d[0]*4.5,z=player.z+d[2]*4.5,acrossZ=Math.abs(d[2])>=Math.abs(d[0]);
        const w={id:randomUUID().slice(0,8),x,z,w:acrossZ?3.35:.7,d:acrossZ?.7:3.35,h:3.2,hp:SKILLS.wall.hp,until:now+SKILLS.wall.duration};
        const overlap=b=>Math.abs(x-b.x)<w.w+b.w+.2&&Math.abs(z-b.z)<w.d+b.d+.2;
        if(roomCover(room).some(overlap)||[...room.players.values()].some(p=>p.hp>0&&Math.abs(p.x-x)<w.w+.5&&Math.abs(p.z-z)<w.d+.5)||Math.abs(x)>215||Math.abs(z)>215){send(ws,{type:'notice',message:'พื้นที่ไม่พอวางไอซ์วอลล์ ลองหันไปพื้นที่โล่ง'});return;}
        room.walls.push(w);
      }
      player.cooldowns[m.skill]=now+skill.cooldown;
      if(m.skill==='dash'){
        const from=[player.x,groundHeight(player.x,player.z)+(player.lift||0)+.8,player.z],k=player.input;
        let dx=Number(!!k.d)-Number(!!k.a),dz=Number(!!k.s)-Number(!!k.w);if(!dx&&!dz)dz=-1;const len=Math.hypot(dx,dz);dx/=len;dz/=len;
        moveInRoom(room,player,(dx*Math.cos(player.yaw)+dz*Math.sin(player.yaw))*7,(dz*Math.cos(player.yaw)-dx*Math.sin(player.yaw))*7);
        broadcast(room,{type:'ability',skill:'dash',id:player.id,from,to:[player.x,groundHeight(player.x,player.z)+(player.lift||0)+.8,player.z]});
      }else if(m.skill==='smoke'){
        const d=direction(player.yaw,0),pos={x:player.x,z:player.z};moveInRoom(room,pos,d[0]*11,d[2]*11);
        room.smokes.push({id:randomUUID().slice(0,8),x:pos.x,y:groundHeight(pos.x,pos.z)+1.5,z:pos.z,until:now+skill.duration});
      }else if(m.skill==='heal')player.healUntil=now+skill.duration;
      send(ws,{type:'ability',skill:m.skill,id:player.id});return;
    }
    const weapon=getWeapon(player.weapon);
    if(m.type==='switch'){
      if(![player.primary,player.secondary,'knife'].includes(m.weapon)||now<player.switchUntil)return;
      player.inventory[player.weapon]=player.ammo;player.weapon=m.weapon;player.ammo=player.inventory[m.weapon]??getWeapon(m.weapon).mag;player.reloadUntil=0;player.switchUntil=now+280;return;
    }
    if(m.type==='grenade'){
      if(player.grenades<=0||now-player.lastGrenade<GRENADE.cooldown)return;
      const d=direction(player.yaw,player.pitch);player.grenades--;player.lastGrenade=now;
      room.grenades.push({id:randomUUID().slice(0,8),owner:player.id,name:player.name,x:player.x,y:groundHeight(player.x,player.z)+(player.lift||0)+1.5,z:player.z,vx:d[0]*15,vy:d[1]*15+5,vz:d[2]*15,explodeAt:now+GRENADE.fuse});return;
    }
    if(m.type==='reload'&&!player.reloadUntil&&weapon.mag&&player.ammo<weapon.mag){player.reloadUntil=now+weapon.reload*(getPerk(player.perks[player.weapon]).reload||1);return;}
    if(m.type!=='shoot'||player.reloadUntil||now<player.switchUntil||(weapon.mag&&player.ammo<=0)||now-player.lastShot<weapon.fire*(ultimateModifiers(player,now).fire||1)*(getPerk(player.perks[player.weapon]).fire||1))return;
    player.lastShot=now;if(weapon.mag)player.ammo--;player.inventory[player.weapon]=player.ammo;
    const o=[player.x,groundHeight(player.x,player.z)+(player.lift||0)+(player.slideUntil>now?.9:player.input.crouch?1.12:EYE_HEIGHT),player.z];
    if(weapon.kind==='launcher'){room.rockets.push({id:randomUUID().slice(0,8),owner:player.id,x:o[0],y:o[1],z:o[2],direction:direction(player.yaw,player.pitch),until:now+4000});return;}
    const accumulated=new Map();let anyHit=false;
    for(let pellet=0;pellet<(weapon.pellets||1);pellet++){
      const spread=weapon.spread||0,d=direction(player.yaw+(Math.random()-.5)*spread,player.pitch+(Math.random()-.5)*spread);
      let best=Math.min(weapon.range,rayCover(room,o,d)),victim=null,target=-1,head=false,vehicle=null;
      for(const q of room.players.values()){
        if(q===player||q.hp<=0||q.spawnUntil>now)continue;
        const base=groundHeight(q.x,q.z)+(q.lift||0),h=q.slideUntil>now?1.1:q.input.crouch?1.35:1.9;
        const hit=rayBox(o,d,[q.x-.36,base,q.z-.36],[q.x+.36,base+h,q.z+.36]);
        if(hit<best){best=hit;victim=q;head=o[1]+d[1]*hit>base+h-.36;target=-1;}
      }
      TARGETS.forEach(([x,z],i)=>{
        if(room.targets[i].hp<=0)return;
        const y=groundHeight(x,z),hit=rayBox(o,d,[x-.48,y+.65,z-.18],[x+.48,y+2,z+.18]);
        if(hit<best){best=hit;target=i;victim=null;}
      });
      for(const car of room.vehicles){if(car.hp<=0||car.driver===player.id)continue;const y=groundHeight(car.x,car.z),hit=rayBox(o,d,[car.x-1,y,car.z-1.7],[car.x+1,y+1.2,car.z+1.7]);if(hit<best){best=hit;vehicle=car;victim=null;target=-1;}}
      if(vehicle){vehicle.hp=Math.max(0,vehicle.hp-weapon.damage);if(vehicle.hp<=0)destroyVehicle(room,vehicle,now);send(ws,{type:'hit'});}
      if(!victim&&target<0&&!vehicle){const wall=room.walls.find(w=>{const y=groundHeight(w.x,w.z);return w.hp>0&&Math.abs(rayBox(o,d,[w.x-w.w,y,w.z-w.d],[w.x+w.w,y+w.h,w.z+w.d])-best)<.02;});if(wall){wall.hp=Math.max(0,wall.hp-weapon.damage);send(ws,{type:'hit',wall:true,down:wall.hp===0});}}
      if(victim)accumulated.set(victim,(accumulated.get(victim)||0)+weapon.damage*(head&&weapon.kind!=='knife'?3:1));
      if(target>=0){const t=room.targets[target];t.hp=Math.max(0,t.hp-(weapon.id==='ar4'?50:weapon.damage));if(t.hp===0)t.resetAt=now+4500;send(ws,{type:'hit',target:true,down:t.hp===0});}
      anyHit ||= victim!==null||target>=0;
      broadcast(room,{type:'shot',id:player.id,weapon:weapon.id,origin:o,end:o.map((v,i)=>v+d[i]*best),hit:victim!==null||target>=0});
    }
    for(const [victim,damage] of accumulated){applyDamage(room,victim,damage,player,now,{weapon:weapon.id,head:!weapon.pellets&&damage>=weapon.damage*3});send(ws,{type:'hit',down:victim.hp===0});if(getPerk(player.perks[weapon.id]).blast)blast(room,[victim.x,groundHeight(victim.x,victim.z)+.5,victim.z],40,3,player,now,'perk');}
  });
  ws.on('close',()=>{clearTimeout(joinTimer);if(!player)return;for(const v of room.vehicles)if(v.driver===player.id){v.driver=null;v.speed=0;}room.players.delete(player.id);broadcast(room,{type:'notice',message:player.name+' ออกจากพื้นที่'});if(!room.players.size)rooms.delete(room.code);});
  ws.on('error',()=>{});
});
let lastTick=Date.now();
const timer=setInterval(()=>{
  const now=Date.now(),dt=Math.min(.1,(now-lastTick)/1000);
  for(const room of rooms.values()){
    for(const p of room.players.values()){
      if(now-p.lastSeen>30000){p.ws.close(1001,'Inactive');continue;}
      if(p.hp<=0){if(now>=p.deadUntil)freshSpawn(p,room);continue;}
      if(p.reloadUntil&&now>=p.reloadUntil){p.ammo=getWeapon(p.weapon).mag;p.inventory[p.weapon]=p.ammo;p.reloadUntil=0;}
      if(p.vehicle){const car=room.vehicles.find(v=>v.id===p.vehicle&&v.hp>0);if(car){stepVehicle(car,p.input,dt,roomCover(room));p.x=car.x;p.z=car.z;p.lift=.5;p.vy=0;}continue;}
      stepJump(p,dt);if(p.healUntil>lastTick){const healMs=Math.max(0,Math.min(now,p.healUntil)-Math.max(lastTick,p.healUntil-SKILLS.heal.duration));p.hp=Math.min(p.maxHp,p.hp+healMs*.012);}
      for(const kit of room.medkits)if(kit.readyAt<=now&&p.hp<p.maxHp&&Math.hypot(p.x-kit.x,p.z-kit.z)<1.8){p.hp=Math.min(p.maxHp,p.hp+60);kit.readyAt=now+18000;send(p.ws,{type:'notice',message:'เก็บชุดพยาบาล +60 HP'});}
      if(p.slideUntil>now){const speed=12*(.4+.6*(p.slideUntil-now)/900);moveInRoom(room,p,p.slideX*speed*dt,p.slideZ*speed*dt);continue;}
      const k=p.input;let x=Number(!!k.d)-Number(!!k.a),z=Number(!!k.s)-Number(!!k.w);
      const length=Math.hypot(x,z)||1;x/=length;z/=length;
      const speed=(k.crouch?2.1:k.sprint?7:4.2)*(p.slowUntil>now?.5:1)*(getCharacter(p.character).speed||1)*(ultimateModifiers(p,now).speed||1);
      moveInRoom(room,p,(x*Math.cos(p.yaw)+z*Math.sin(p.yaw))*speed*dt,(z*Math.cos(p.yaw)-x*Math.sin(p.yaw))*speed*dt);
    }
    for(const v of room.vehicles)if(v.hp<=0&&now>=v.resetAt){const [x,z]=VEHICLE_SPAWNS[Number(v.id.split('-')[1])];Object.assign(v,{x,z,hp:600,driver:null,speed:0,yaw:0});}
    for(const strike of room.strikes){if(now<strike.at)continue;const owner=room.players.get(strike.owner);if(!owner)continue;
      const victims=ultimateVictims(room.players.values(),owner.id);
      for(const p of victims){
        const at=[p.x,groundHeight(p.x,p.z)+(p.lift||0)+.5,p.z];
        if(strike.kind==='orbital')blast(room,at,600,18,owner,now,'orbital');
        else {applyDamage(room,p,strike.kind==='nuke'?5000:500,owner,now,{weapon:strike.kind});broadcast(room,{type:'explosion',position:at,weapon:'rpg'});}
      }
      if(strike.kind==='nuke'){for(const w of room.walls)w.hp=0;for(const t of room.targets){t.hp=0;t.resetAt=now+4500;}}
      broadcast(room,{type:'cataclysm',kind:strike.kind});
    }
    room.strikes=room.strikes.filter(s=>s.at>now);
    updateRockets(room,now,dt);updateGrenades(room,now,dt);room.walls=room.walls.filter(w=>w.hp>0&&w.until>now);room.smokes=room.smokes.filter(s=>s.until>now);
    for(const t of room.targets)if(t.hp<=0&&now>=t.resetAt)t.hp=100;
    broadcast(room,{type:'state',time:now,medkits:room.medkits.map(k=>({...k,active:k.readyAt<=now})),vehicles:room.vehicles,walls:room.walls.map(w=>({...w,left:w.until-now})),rockets:room.rockets.map(r=>({id:r.id,x:r.x,y:r.y,z:r.z,direction:r.direction})),smokes:room.smokes.map(s=>({...s,left:s.until-now})),grenades:room.grenades.map(g=>({id:g.id,x:g.x,y:g.y,z:g.z})),targets:room.targets.map(t=>t.hp),players:[...room.players.values()].map(p=>({id:p.id,name:p.name,weapon:p.weapon,primary:p.primary,secondary:p.secondary,character:p.character,skills:p.skills,vehicle:p.vehicle,slideLeft:Math.max(0,p.slideUntil-now),slideX:p.slideX||0,slideZ:p.slideZ||0,shieldLeft:Math.max(0,p.spawnUntil-now),perks:p.perks,rollLeft:Math.max(0,p.rollUntil-now),slow:p.slowUntil>now,grenades:p.grenades,ultCharge:p.ultCharge,ultLeft:Math.max(0,p.ultUntil-now),lift:p.lift,vy:p.vy,healing:p.healUntil>now,cooldowns:Object.fromEntries(Object.entries(p.cooldowns).map(([k,v])=>[k,Math.max(0,v-now)])),x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,hp:p.hp,maxHp:p.maxHp,ammo:p.ammo,reloading:!!p.reloadUntil,reloadLeft:Math.max(0,p.reloadUntil-now),respawnLeft:Math.max(0,p.deadUntil-now),kills:p.kills,deaths:p.deaths,crouch:!!p.input.crouch,protected:p.spawnUntil>now}))});
  }
  lastTick=now;
},50);
const port=Number(process.env.PORT)||3000;
server.listen(port,'0.0.0.0',()=>console.log(`RED EARTH ready at http://localhost:${port}`));
process.on('SIGTERM',()=>{clearInterval(timer);wss.close();server.close();vite?.close();});
