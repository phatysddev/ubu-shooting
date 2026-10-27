// Fictional weapons. Values describe game balance only.
export const WEAPONS = [
  {id:'ar4',name:'AR-4',kind:'rifle',label:'ปืนจู่โจม',caliber:'5.56',mag:30,fire:120,reload:2200,damage:34,range:150,recoil:.026,auto:true,color:'#626c54'},
  {id:'ak47',name:'AK-47',kind:'rifle',label:'ปืนจู่โจมหนัก',caliber:'7.62',mag:30,fire:150,reload:2500,damage:42,range:140,recoil:.04,auto:true,color:'#886343'},
  {id:'viper',name:'VIPER-9',kind:'smg',label:'ปืนกลมือ',caliber:'9mm',mag:32,fire:75,reload:1700,damage:23,range:65,recoil:.016,auto:true,color:'#4b6264'},
  {id:'spectre',name:'SPECTRE',kind:'smg',label:'ปืนกลมือเก็บเสียง',caliber:'.45',mag:25,fire:95,reload:1800,damage:28,range:75,recoil:.019,auto:true,color:'#393d40'},
  {id:'breacher',name:'BREACHER-12',kind:'shotgun',label:'ลูกซองปั๊ม',caliber:'12 GA',mag:8,fire:780,reload:2800,damage:18,pellets:8,spread:.075,range:38,recoil:.075,auto:false,color:'#6d654c'},
  {id:'jackal',name:'JACKAL AUTO',kind:'shotgun',label:'ลูกซองอัตโนมัติ',caliber:'12 GA',mag:10,fire:370,reload:3000,damage:13,pellets:7,spread:.095,range:30,recoil:.055,auto:true,color:'#665b46'},
  {id:'longbow',name:'LONGBOW .308',kind:'sniper',label:'สไนเปอร์',caliber:'.308',mag:5,fire:1150,reload:3000,damage:110,range:220,recoil:.07,auto:false,color:'#738064',zoom:34},
  {id:'scout',name:'SCOUT DMR',kind:'dmr',label:'ไรเฟิลแม่นยำ',caliber:'7.62',mag:12,fire:310,reload:2400,damage:58,range:190,recoil:.04,auto:false,color:'#756c57',zoom:42},
  {id:'rhino',name:'RHINO LMG',kind:'lmg',label:'ปืนกลเบา',caliber:'5.56',mag:80,fire:110,reload:4600,damage:30,range:130,recoil:.035,auto:true,color:'#666c48'},
  {id:'falcon',name:'FALCON-9',kind:'pistol',label:'ปืนพก',caliber:'9mm',mag:15,fire:220,reload:1400,damage:32,range:75,recoil:.022,auto:false,color:'#717579'},
  {id:'magnum',name:'MAGNUM .50',kind:'pistol',label:'ปืนพกหนัก',caliber:'.50',mag:7,fire:420,reload:1900,damage:68,range:100,recoil:.065,auto:false,color:'#9a9589'},
  {id:'rpg',name:'RPG-7',kind:'launcher',label:'เครื่องยิงจรวด',caliber:'ROCKET',mag:1,fire:1200,reload:6500,damage:420,range:280,recoil:.09,auto:false,color:'#67764d'},
  {id:'knife',name:'TALON',kind:'knife',label:'มีดต่อสู้',caliber:'MELEE',mag:0,fire:600,reload:0,damage:65,range:2.6,recoil:0,auto:false,color:'#b6bbb5'}
];
// All conventional guns receive a direct damage, handling and range buff.
for(const w of WEAPONS)if(w.mag&&w.kind!=='launcher'){w.damage=Math.round(w.damage*1.3);w.fire=Math.round(w.fire*.85);w.reload=Math.round(w.reload*.8);w.range=Math.round(w.range*1.25);w.recoil*=.65;}
export const getWeapon=id=>WEAPONS.find(w=>w.id===id)||WEAPONS[0];
export const CHARACTERS=[
  {id:'bastion',name:'BASTION',age:38,label:'สายถึก · 175 HP',outfit:'เกราะหนัก 175 HP · ความเร็ว 78% ของตัวปกติ',female:false,skin:'#a98468',cloth:'#4d5657',hair:'#282928',accent:'#9bb4b6',maxHp:175,speed:.78},
  {id:'ranger',name:'RANGER',age:32,label:'ทหารลาดตระเวน',outfit:'เสื้อสนามและเกราะเต็มตัว',female:false,skin:'#a28163',cloth:'#747955',hair:'#30291f',accent:'#b19a68'},
  {id:'nova',name:'NOVA',age:28,label:'หน่วยจู่โจม',outfit:'เสื้อครอปเข้ารูป กางเกงเอวสูง และบูตสูง',female:true,skin:'#c69876',cloth:'#303a32',hair:'#30251e',accent:'#c9955a'},
  {id:'sable',name:'SABLE',age:30,label:'นักแม่นปืน',outfit:'ชุดบอดี้สูทคัตเอาต์ พร้อมสายรัดและบูตสูง',female:true,skin:'#8f6046',cloth:'#4f3b37',hair:'#201b19',accent:'#c58c62'},
  {id:'valkyrie',name:'VALKYRIE',age:29,label:'ผู้เชี่ยวชาญอาวุธหนัก',outfit:'แจ็กเก็ตสั้น เสื้อครอป และกางเกงขาสั้นรัดรูป',female:true,skin:'#d3ad8f',cloth:'#686344',hair:'#c9b47c',accent:'#d5a35e'}
];
export const getCharacter=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS.find(c=>c.id==='ranger');
export const GRENADE={count:2,fuse:2800,radius:9,damage:135,cooldown:900};
export function blastDamage(distance,blocked=false){return blocked||distance>=GRENADE.radius?0:Math.round(GRENADE.damage*(1-distance/GRENADE.radius));}
