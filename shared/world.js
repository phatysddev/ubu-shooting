export const WORLD_LIMIT = 220;
export const EYE_HEIGHT = 1.72;
export const MAGAZINE = 30;
export const RELOAD_MS = 2200;
export const FIRE_MS = 120;
export const SPAWNS = [[0, 30], [-25, 8], [25, -25], [-26, -26], [27, 24], [0, -36]];
export const TARGETS = [[-13, -15], [2, -25], [18, -19], [-22, -33], [30, -40]];
// Centers and half extents. Both simulation and renderer consume this level.
export const COVER = [
  {x:-12,z:-3,w:5,d:3,h:2.3,type:'container'},
  {x:15,z:-12,w:3,d:6,h:2.3,type:'container'},
  {x:-19,z:-22,w:4.5,d:3.5,h:2.8,type:'house'},
  {x:8,z:-34,w:6,d:3.5,h:3.1,type:'house'},
  {x:-5,z:7,w:3.5,d:.6,h:1.15,type:'sandbag'},
  {x:8,z:2,w:.6,d:3.5,h:1.15,type:'sandbag'},
  {x:-27,z:17,w:2.5,d:1.2,h:1.4,type:'crate'},
  {x:25,z:10,w:1.7,d:1.7,h:1.5,type:'crate'},
  {x:-5,z:-39,w:3,d:.6,h:1.3,type:'sandbag'},
  {x:25,z:-29,w:1.5,d:1.5,h:1.7,type:'crate'},
  {x:-32,z:-8,w:3,d:2,h:2,type:'rock'},
  {x:34,z:-6,w:3,d:2,h:2.4,type:'rock'}
];
for(const [x,z] of [[-125,-120],[125,-120],[-125,125],[125,125]]){
  COVER.push({x,z,w:6,d:4,h:3,type:'house'},{x:x+14,z:z+3,w:5,d:3,h:2.3,type:'container'},{x:x-10,z:z+10,w:3,d:.6,h:1.15,type:'sandbag'});
}
export const MEDKIT_SPAWNS=[[2,26],[-16,-12],[18,18],[0,-45],[-35,28],[36,-26],[-120,-105],[130,-100],[-120,140],[130,140],[80,60],[-80,-60]];
export function groundHeight(x,z) {
  return Math.sin(x*.037)*.38 + Math.sin(z*.05)*.27 + Math.sin(x*.09+z*.065)*.12;
}
export function canStand(x,z,r=.38,cover=COVER) {
  return Math.abs(x)<WORLD_LIMIT && Math.abs(z)<WORLD_LIMIT && !cover.some(b=>Math.abs(x-b.x)<b.w+r && Math.abs(z-b.z)<b.d+r);
}
export function movePlayer(p,dx,dz,cover=COVER) {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
  for(let i=0;i<steps;i++){
    if(canStand(p.x+dx/steps,p.z,.38,cover)) p.x+=dx/steps;
    if(canStand(p.x,p.z+dz/steps,.38,cover)) p.z+=dz/steps;
  }
  return p;
}
// Slab ray intersection returns distance in world units, or Infinity.
export function rayBox(o,d,min,max) {
  let near=0,far=Infinity;
  for(let i=0;i<3;i++){
    if(Math.abs(d[i])<1e-8){if(o[i]<min[i] || o[i]>max[i])return Infinity;continue;}
    let a=(min[i]-o[i])/d[i],b=(max[i]-o[i])/d[i];
    if(a>b)[a,b]=[b,a]; near=Math.max(near,a);far=Math.min(far,b);
    if(near>far)return Infinity;
  }
  return near;
}
export function coverDistance(o,d,cover=COVER){
  return cover.reduce((best,b)=>{
    const y=groundHeight(b.x,b.z);
    return Math.min(best,rayBox(o,d,[b.x-b.w,y,b.z-b.d],[b.x+b.w,y+b.h,b.z+b.d]));
  },Infinity);
}
export function direction(yaw,pitch){return [-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];}
