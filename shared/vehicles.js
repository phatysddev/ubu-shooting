import {movePlayer} from './world.js';
export const VEHICLE_SPAWNS=[[-3,28],[21,24],[-29,-36],[24,-42]];
export const createVehicles=()=>VEHICLE_SPAWNS.map(([x,z],i)=>({id:'jeep-'+i,x,z,yaw:0,speed:0,hp:600,driver:null,resetAt:0}));
export function stepVehicle(v,input,dt,cover){
 const throttle=Number(!!input.w)-Number(!!input.s),steer=Number(!!input.a)-Number(!!input.d),target=throttle*(input.sprint?28:21);
 v.speed+=(target-v.speed)*(1-Math.exp(-dt*(throttle?2.4:3.5)));v.steering=(v.steering||0)+(steer-(v.steering||0))*(1-Math.exp(-dt*7));
 v.yaw+=v.steering*dt*1.5*Math.min(1,Math.abs(v.speed)/4)*Math.sign(v.speed||1);
 const before={x:v.x,z:v.z};movePlayer(v,-Math.sin(v.yaw)*v.speed*dt,-Math.cos(v.yaw)*v.speed*dt,cover.map(b=>({...b,w:b.w+.45,d:b.d+.45})));
 if(Math.hypot(v.x-before.x,v.z-before.z)<Math.abs(v.speed*dt)*.2)v.speed*=.4;return v;
}
