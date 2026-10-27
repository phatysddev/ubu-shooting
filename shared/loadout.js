export const SKILL_IDS=['dash','smoke','heal','wall'];
export function selectSkills(value){const picked=[...new Set((Array.isArray(value)?value:[]).filter(id=>SKILL_IDS.includes(id)))].slice(0,2);for(const id of ['wall','heal',...SKILL_IDS])if(picked.length<2&&!picked.includes(id))picked.push(id);return picked;}
