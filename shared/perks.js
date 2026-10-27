export const PERKS=[
  {id:'power',name:'OVERPOWER',description:'ดาเมจ +50%',damage:1.5},
  {id:'rapid',name:'RAPID FIRE',description:'ยิงเร็วขึ้น 35%',fire:.65},
  {id:'vampire',name:'LIFE STEAL',description:'ดูดเลือด 25% จากดาเมจที่ทำ',leech:.25},
  {id:'loader',name:'QUICK LOAD',description:'รีโหลดเร็วขึ้น 40%',reload:.6},
  {id:'frost',name:'FROST BITE',description:'ยิงโดนแล้วศัตรูช้าลง 2 วินาที',slow:true},
  {id:'blast',name:'BLAST ROUND',description:'กระสุนโดนตัวแล้วระเบิดวงเล็ก',blast:true}
];
export const getPerk=id=>PERKS.find(p=>p.id===id)||{};
export function rollPerk(previous,random=Math.random){const pool=PERKS.filter(p=>p.id!==previous);return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))].id;}
export function steerHoming(direction,origin,target,dt,turn=3){const desired=target.map((v,i)=>v-origin[i]),length=Math.hypot(...desired)||1,alpha=1-Math.exp(-dt*turn),next=direction.map((v,i)=>v+(desired[i]/length-v)*alpha),size=Math.hypot(...next)||1;return next.map(v=>v/size);}
