import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {setTimeout as delay} from 'node:timers/promises';
import {groundHeight,EYE_HEIGHT} from '../shared/world.js';

const url=process.env.TEST_SERVER||'ws://localhost:3000/socket';
async function client(room,name,loadout={}){
  const ws=new WebSocket(url),messages=[];
  ws.on('message',raw=>messages.push(JSON.parse(raw)));
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  ws.send(JSON.stringify({type:'join',room,name,...loadout}));
  async function until(predicate,timeout=3000){const start=Date.now();while(Date.now()-start<timeout){const m=messages.find(predicate);if(m)return m;await delay(20);}throw new Error('Timed out waiting for server event');}
  const joined=await until(m=>m.type==='joined');
  return {ws,messages,id:joined.id,until,send:m=>ws.send(JSON.stringify(m)),state:()=>[...messages].reverse().find(m=>m.type==='state')};
}
test('two players share a room, independent rooms stay isolated, server owns movement and ammo',async()=>{
  const room='TEST-'+Date.now().toString(36),a=await client(room,'Alpha'),b=await client(room,'Bravo'),c=await client(room+'X','Other');
  try{
    const shared=await a.until(m=>m.type==='state'&&m.players.length===2);assert.ok(shared.players.some(p=>p.id===b.id));
    await c.until(m=>m.type==='state');assert.equal(c.state().players.length,1);
    const initial=shared.players.find(p=>p.id===a.id);
    a.send({type:'input',yaw:0,pitch:0,keys:{w:true},x:9999,z:9999});await delay(300);a.send({type:'input',yaw:0,pitch:0,keys:{}});await delay(120);
    const moved=a.state().players.find(p=>p.id===a.id);assert.ok(moved.z<initial.z);assert.ok(moved.z>initial.z-4);assert.equal(moved.x,initial.x);
    for(let i=0;i<10;i++)a.send({type:'shoot'});await delay(120);
    assert.equal(a.state().players.find(p=>p.id===a.id).ammo,29,'burst spam must consume only one round');
    a.send({type:'reload'});await a.until(m=>m.type==='state'&&m.players.some(p=>p.id===a.id&&p.reloading));await delay(2350);
    assert.equal(a.state().players.find(p=>p.id===a.id).ammo,30);
    b.ws.close();await a.until(m=>m.type==='state'&&m.players.length===1&&m.players[0].id===a.id);
    a.ws.send('{not valid json');await delay(50);assert.equal(a.ws.readyState,WebSocket.OPEN);
  }finally{a.ws.close();b.ws.close();c.ws.close();}
});
test('loadouts are shared, switching preserves ammo and cannot grant unselected guns',async()=>{
  const a=await client('GEAR-'+Date.now().toString(36),'Nova',{primary:'longbow',secondary:'viper',character:'sable'});
  try{
    await a.until(m=>m.type==='state');let p=a.state().players[0];assert.equal(p.weapon,'longbow');assert.equal(p.ammo,5);assert.equal(p.character,'sable');
    a.send({type:'shoot'});await delay(100);assert.equal(a.state().players[0].ammo,4);
    a.send({type:'switch',weapon:'rhino'});await delay(100);assert.equal(a.state().players[0].weapon,'longbow');
    a.send({type:'switch',weapon:'viper'});await delay(350);assert.equal(a.state().players[0].ammo,32);
    a.send({type:'switch',weapon:'longbow'});await delay(350);assert.equal(a.state().players[0].ammo,4);
    a.send({type:'switch',weapon:'knife'});await delay(350);a.send({type:'shoot'});await delay(120);p=a.state().players[0];assert.equal(p.weapon,'knife');assert.equal(p.ammo,0);assert.equal(p.hp,100);
  }finally{a.ws.close();}
});
test('grenades are finite, synchronized and detonate with self-damage',async()=>{
  const a=await client('BOOM-'+Date.now().toString(36),'Grenadier');
  try{
    await a.until(m=>m.type==='state');a.send({type:'input',yaw:0,pitch:-1.4,keys:{}});a.send({type:'grenade'});
    await a.until(m=>m.type==='state'&&m.grenades.length===1);assert.equal(a.state().players[0].grenades,1);
    a.send({type:'grenade'});await delay(100);assert.equal(a.state().players[0].grenades,1,'cooldown must reject duplicate throw');
    await delay(900);a.send({type:'grenade'});await a.until(m=>m.type==='state'&&m.players[0].grenades===0);
    a.send({type:'grenade'});await delay(100);assert.equal(a.state().players[0].grenades,0);
    await a.until(m=>m.type==='explosion',4000);await a.until(m=>m.type==='state'&&m.players[0].hp<100,3000);assert.ok(a.state().players[0].hp<100,'own explosion damages thrower');assert.equal(a.state().players[0].kills,0);
  }finally{a.ws.close();}
});
test('jump and skills are authoritative, cooldowns prevent spam and full-health heal is free',async()=>{
  const a=await client('SKILL-'+Date.now().toString(36),'Agent',{skills:['dash','smoke']});
  try{
    await a.until(m=>m.type==='state');const start=a.state().players[0];a.send({type:'jump'});await a.until(m=>m.type==='state'&&m.players[0].lift>.1);
    const jumpTime=a.state().time;a.send({type:'jump'});await a.until(m=>m.type==='state'&&m.time>jumpTime+500&&m.players[0].lift===0);
    a.send({type:'skill',skill:'dash'});await delay(120);const dashed=a.state().players[0];assert.ok(Math.hypot(dashed.x-start.x,dashed.z-start.z)>6);assert.ok(dashed.cooldowns.dash>11000);
    a.send({type:'skill',skill:'dash'});await delay(100);assert.equal(a.state().players[0].z,dashed.z);
    a.send({type:'skill',skill:'smoke'});await a.until(m=>m.type==='state'&&m.smokes.length===1);a.send({type:'skill',skill:'smoke'});await delay(100);assert.equal(a.state().smokes.length,1);assert.ok(a.state().smokes[0].left<=8000);
    a.send({type:'skill',skill:'heal'});a.send({type:'skill',skill:'invalid'});await delay(100);assert.equal(a.state().players[0].cooldowns.heal,0);
  }finally{a.ws.close();}
});
test('healing recovers damage over time and never exceeds maximum health',async()=>{
  const room='HEAL-'+Date.now().toString(36),a=await client(room,'Patient'),b=await client(room,'Shooter');
  try{
    const state=await a.until(m=>m.type==='state'&&m.players.length===2),target=state.players.find(p=>p.id===a.id),shooter=state.players.find(p=>p.id===b.id);
    const dx=target.x-shooter.x,dz=target.z-shooter.z,dy=groundHeight(target.x,target.z)+1.2-groundHeight(shooter.x,shooter.z)-EYE_HEIGHT;
    b.send({type:'input',yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),keys:{}});await delay(3150);b.send({type:'shoot'});
    await a.until(m=>m.type==='state'&&m.players.some(p=>p.id===a.id&&p.hp<100));const beforeHeal=a.state().players.find(p=>p.id===a.id).hp;a.send({type:'skill',skill:'heal'});
    await a.until(m=>m.type==='state'&&m.players.some(p=>p.id===a.id&&p.healing));await delay(3300);
    assert.ok(Math.abs(a.state().players.find(p=>p.id===a.id).hp-Math.min(100,beforeHeal+36))<1);assert.ok(a.state().players.find(p=>p.id===a.id).cooldowns.heal>20000);
  }finally{a.ws.close();b.ws.close();}
});
test('ice walls block movement, take bullet damage and reject repeated casts',async()=>{
  const a=await client('ICE-'+Date.now().toString(36),'Builder',{skills:['wall','dash']});
  try{
    await a.until(m=>m.type==='state');a.send({type:'skill',skill:'wall'});await a.until(m=>m.type==='state'&&m.walls.length===1);
    a.send({type:'skill',skill:'wall'});a.send({type:'shoot'});await a.until(m=>m.type==='state'&&m.walls[0]?.hp<450);
    assert.equal(a.state().walls.length,1);assert.equal(a.state().walls[0].hp,406);
    a.send({type:'input',yaw:0,pitch:0,keys:{w:true}});await delay(1500);a.send({type:'input',yaw:0,pitch:0,keys:{}});await delay(100);
    assert.ok(a.state().players[0].z>a.state().walls[0].z+.7,'movement must stop in front of wall');
    a.send({type:'skill',skill:'dash'});await delay(100);assert.ok(a.state().players[0].z>a.state().walls[0].z+.7,'dash must also stop at wall');
  }finally{a.ws.close();}
});
test('single-shot RPG destroys ice wall and requires a long reload',async()=>{
  const a=await client('RPG-'+Date.now().toString(36),'Heavy',{primary:'rpg',character:'bastion'});
  try{
    await a.until(m=>m.type==='state');assert.equal(a.state().players[0].hp,175);
    a.send({type:'skill',skill:'wall'});await a.until(m=>m.type==='state'&&m.walls.length===1);a.send({type:'shoot'});
    await a.until(m=>m.type==='explosion');await a.until(m=>m.type==='state'&&m.walls.length===0);
    assert.equal(a.state().players[0].ammo,0);assert.ok(a.state().players[0].hp>0,'reduced self splash should let nearby heavy survive');
  }finally{a.ws.close();}
});

test('server applies hits, deaths and automatic respawn consistently to both clients',async()=>{
  const room='HIT-'+Date.now().toString(36),a=await client(room,'Shooter'),b=await client(room,'Target');
  try{
    const state=await a.until(m=>m.type==='state'&&m.players.length===2);
    const p=state.players.find(p=>p.id===a.id),q=state.players.find(p=>p.id===b.id);
    const dx=q.x-p.x,dz=q.z-p.z,dy=groundHeight(q.x,q.z)+1.2-groundHeight(p.x,p.z)-EYE_HEIGHT;
    a.send({type:'input',yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),keys:{}});
    await delay(3150);
    for(let i=0;i<3;i++){a.send({type:'shoot'});await delay(160);}
    const dead=await a.until(m=>m.type==='state'&&m.players.some(p=>p.id===b.id&&p.hp===0));
    assert.equal(dead.players.find(p=>p.id===a.id).kills,1);
    assert.equal(dead.players.find(p=>p.id===b.id).deaths,1);
    const kill=await a.until(m=>m.type==='kill');assert.equal(kill.killerId,a.id);assert.equal(kill.victimId,b.id);assert.equal(kill.weapon,'ar4');
    await b.until(m=>m.type==='damage');
    await a.until(m=>m.type==='state'&&m.time>dead.time&&m.players.some(p=>p.id===b.id&&p.hp===100),5000);
  }finally{a.ws.close();b.ws.close();}
});

test('only five real player kills unlock an ultimate and activation consumes the charge',async()=>{
  const room='ULT-'+Date.now().toString(36),a=await client(room,'Ultimate tester',{primary:'longbow',character:'valkyrie'});
  try{
    await a.until(m=>m.type==='state');a.send({type:'ultimate'});await delay(80);assert.equal(a.state().players[0].ultLeft,0);
    for(let i=0;i<5;i++){
      const b=await client(room,'Rival '+i);
      try{
        const state=await a.until(m=>m.type==='state'&&m.players.some(p=>p.id===b.id)),p=state.players.find(p=>p.id===a.id),q=state.players.find(p=>p.id===b.id);
        const dx=q.x-p.x,dz=q.z-p.z,dy=groundHeight(q.x,q.z)+1.2-groundHeight(p.x,p.z)-EYE_HEIGHT;
        a.send({type:'input',yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz)),keys:{}});await delay(3150);a.send({type:'shoot'});
        await a.until(m=>m.type==='kill'&&m.victimId===b.id);await a.until(m=>m.type==='state'&&m.players.find(p=>p.id===a.id)?.ultCharge===i+1);
      }finally{b.ws.close();}
    }
    a.send({type:'ultimate'});await a.until(m=>m.type==='state'&&m.players.find(p=>p.id===a.id)?.ultLeft>11000);
    assert.equal(a.state().players.find(p=>p.id===a.id).ultCharge,0);a.send({type:'ultimate'});await delay(100);assert.equal(a.state().players.find(p=>p.id===a.id).ultCharge,0);
    const c=await client(room,'Map victim A'),d=await client(room,'Map victim B');
    try{await a.until(m=>m.type==='cataclysm'&&m.kind==='nuke',5000);await delay(100);assert.equal(a.state().players.find(p=>p.id===c.id).hp,100);assert.equal(a.state().players.find(p=>p.id===d.id).hp,100);assert.ok(a.state().players.find(p=>p.id===a.id).hp>0);}finally{c.ws.close();d.ws.close();}

  }finally{a.ws.close();}
});

test('server enforces two skills, limits perk rerolls and synchronizes driving',async()=>{
 const a=await client('NEW-'+Date.now().toString(36),'Driver',{skills:['wall','heal','dash']});
 try{
  await a.until(m=>m.type==='state');let p=a.state().players[0];assert.deepEqual(p.skills,['wall','heal']);const z=p.z;a.send({type:'skill',skill:'dash'});await delay(100);assert.equal(a.state().players[0].z,z);assert.equal(a.state().players[0].cooldowns.dash,0);
  const perk=p.perks[p.weapon];a.send({type:'roll'});await a.until(m=>m.type==='perk');await delay(100);p=a.state().players[0];assert.notEqual(p.perks[p.weapon],perk);const next=p.perks[p.weapon];a.send({type:'roll'});await delay(100);assert.equal(a.state().players[0].perks[p.weapon],next);
  a.send({type:'vehicle'});await a.until(m=>m.type==='state'&&m.players[0].vehicle);const before=a.state().players[0].z;a.send({type:'input',yaw:0,pitch:0,keys:{w:true}});await delay(700);a.send({type:'input',yaw:0,pitch:0,keys:{}});await delay(100);assert.ok(a.state().players[0].z<before-3);a.send({type:'vehicle'});await a.until(m=>m.type==='state'&&!m.players[0].vehicle);
 }finally{a.ws.close();}
});
