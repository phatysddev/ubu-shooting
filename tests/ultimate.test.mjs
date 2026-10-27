import {test} from 'node:test';
import assert from 'node:assert/strict';
import {awardUltimate,activateUltimate,getUltimate,ultimateModifiers} from '../shared/ultimate.js';
import {SKILLS} from '../shared/tactics.js';
test('ultimate requires five credited kills, is consumed and cannot retrigger',()=>{
  const p={hp:50,maxHp:175,character:'bastion',ultCharge:0};for(let i=0;i<4;i++)awardUltimate(p);assert.equal(activateUltimate(p,100),false);awardUltimate(p);assert.equal(activateUltimate(p,100),true);assert.equal(p.hp,175);assert.equal(p.ultCharge,0);assert.equal(activateUltimate(p,200),false);assert.equal(ultimateModifiers(p,200).incoming,.05);assert.deepEqual(ultimateModifiers(p,16000),{});
});
test('characters have distinct ultimate roles and wall cooldown is four seconds',()=>{
  assert.ok(getUltimate('nova').fire<1);assert.equal(getUltimate('sable').damage,8);assert.equal(getUltimate('valkyrie').damage,3);assert.equal(SKILLS.wall.cooldown,4000);
});
