export const ULTIMATE_KILLS=5;
export const ULTIMATES={
  ranger:{name:'ORBITAL JUDGMENT',description:'ดาวเทียมถล่มศัตรูทุกตำแหน่ง · ดาเมจ ×4',duration:15000,damage:4,strike:'orbital'},
  nova:{name:'OVERDRIVE',description:'ยิงเร็ว ×4 · วิ่งเร็ว ×1.6 · ดาเมจ ×3',duration:15000,fire:.25,speed:1.6,damage:3},
  sable:{name:'DEAD EYE',description:'ดาเมจ ×8 · ศูนย์นิ่ง · มองเห็นชื่อศัตรูทั้งแมพ',duration:15000,damage:8,recoil:0,reveal:true},
  valkyrie:{name:'WORLD BREAKER',description:'นับถอยหลัง 3 วินาที · ระเบิดล้างแมพ ยกเว้นผู้ใช้',duration:15000,damage:3,radius:2,strike:'nuke'},
  bastion:{name:'IRON FORTRESS',description:'ฟื้นเลือดเต็ม · กันดาเมจ 95% · คลื่นกระแทกทั่วแมพ',duration:15000,incoming:.05,strike:'shock'}
};
export const getUltimate=id=>ULTIMATES[id]||ULTIMATES.ranger;
export function awardUltimate(p){p.ultCharge=Math.min(ULTIMATE_KILLS,(p.ultCharge||0)+1);}
export function activateUltimate(p,now){if(p.hp<=0||(p.ultCharge||0)<ULTIMATE_KILLS||(p.ultUntil||0)>now)return false;p.ultCharge=0;p.ultUntil=now+getUltimate(p.character).duration;if(['bastion','ranger'].includes(p.character))p.hp=p.maxHp;return true;}
export const ultimateModifiers=(p,now)=>p&&p.ultUntil>now?getUltimate(p.character):{};

// Shared for server targeting and deterministic tests. Never selects the caster.
export function ultimateVictims(players,casterId){return [...players].filter(p=>p.id!==casterId&&p.hp>0);}
