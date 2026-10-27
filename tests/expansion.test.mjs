import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectSkills} from '../shared/loadout.js';
import {PERKS,rollPerk,steerHoming} from '../shared/perks.js';
import {createVehicles,stepVehicle} from '../shared/vehicles.js';
import {ultimateVictims,getUltimate} from '../shared/ultimate.js';
test('skill selection always yields two different permitted abilities',()=>{
  for(const input of [null,['wall','wall'],['dash','smoke','heal'],['invalid']]){const result=selectSkills(input);assert.equal(result.length,2);assert.equal(new Set(result).size,2);}
  assert.deepEqual(selectSkills(['dash','smoke','heal']),['dash','smoke']);
});
test('weapon perk rerolls cannot return the previous perk',()=>{for(const p of PERKS)assert.notEqual(rollPerk(p.id,()=>.5),p.id);});
test('homing turns toward a target while preserving normalized direction',()=>{
  const next=steerHoming([0,0,-1],[0,0,0],[8,0,-10],.1);assert.ok(next[0]>0);assert.ok(Math.abs(Math.hypot(...next)-1)<1e-8);
});
test('vehicle accelerates, steers and respects cover',()=>{
  const v=createVehicles()[0];const z=v.z;for(let i=0;i<20;i++)stepVehicle(v,{w:true},.05,[]);assert.ok(v.z<z-8);const yaw=v.yaw;stepVehicle(v,{w:true,a:true},.1,[]);assert.ok(v.yaw>yaw);
  const block={x:v.x,z:v.z-5,w:20,d:1,h:3};for(let i=0;i<40;i++)stepVehicle(v,{w:true},.05,[block]);assert.ok(v.z>block.z+1);
});
test('map ultimate excludes caster and dead players; character roles are distinct',()=>{
  assert.deepEqual(ultimateVictims([{id:'a',hp:100},{id:'b',hp:100},{id:'c',hp:0}],'a').map(p=>p.id),['b']);assert.equal(getUltimate('valkyrie').strike,'nuke');assert.equal(getUltimate('ranger').strike,'orbital');assert.equal(getUltimate('bastion').strike,'shock');
});
