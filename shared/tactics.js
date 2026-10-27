export const JUMP_SPEED=6.4;
export const GRAVITY=18;
export const SKILLS={
  dash:{key:'Q',name:'พุ่งตัว',cooldown:12000},
  smoke:{key:'E',name:'ม่านควัน',cooldown:18000,duration:8000,radius:5},
  heal:{key:'F',name:'ฟื้นฟู',cooldown:25000,duration:3000},
  wall:{key:'X',name:'ไอซ์วอลล์',cooldown:4000,duration:20000,hp:450}
};
export const canAim=weapon=>weapon.kind!=='knife';
export function stepJump(p,dt){p.lift=Math.max(0,(p.lift||0)+(p.vy||0)*dt);p.vy=p.lift>0?(p.vy||0)-GRAVITY*dt:0;return p;}
export function launchJump(p){if((p.lift||0)>.01||(p.vy||0)>0)return false;p.vy=JUMP_SPEED;return true;}
export function smokeBlocks(a,b,smokes){
  const d=b.map((v,i)=>v-a[i]),lengthSq=d.reduce((s,v)=>s+v*v,0);
  return smokes.some(s=>{const c=[s.x,s.y,s.z],t=Math.max(0,Math.min(1,c.reduce((sum,v,i)=>sum+(v-a[i])*d[i],0)/(lengthSq||1)));return Math.hypot(...c.map((v,i)=>v-a[i]-d[i]*t))<SKILLS.smoke.radius;});
}

export function beginSlide(p,now){if(p.vehicle||(p.lift||0)>.1||now<(p.slideCooldown||0)||!p.input?.sprint||!(p.input.w||p.input.a||p.input.s||p.input.d))return false;p.slideUntil=now+900;p.slideCooldown=now+2100;let x=Number(!!p.input.d)-Number(!!p.input.a),z=Number(!!p.input.s)-Number(!!p.input.w),len=Math.hypot(x,z)||1;p.slideX=(x*Math.cos(p.yaw)+z*Math.sin(p.yaw))/len;p.slideZ=(z*Math.cos(p.yaw)-x*Math.sin(p.yaw))/len;return true;}
