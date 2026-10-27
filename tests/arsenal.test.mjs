import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,CHARACTERS,getWeapon,blastDamage} from '../shared/arsenal.js';
test('arsenal has 12 guns and a close-range knife with distinct mechanics',()=>{
  assert.equal(WEAPONS.filter(w=>w.mag>0).length,12);assert.equal(new Set(WEAPONS.map(w=>w.id)).size,WEAPONS.length);
  assert.ok(getWeapon('longbow').zoom<getWeapon('scout').zoom);assert.ok(getWeapon('breacher').pellets>1);assert.ok(getWeapon('rhino').mag>getWeapon('ar4').mag);assert.ok(getWeapon('knife').range<3);
});
test('cover completely blocks blast damage and blast falls off to zero',()=>{
  assert.equal(blastDamage(1,true),0);assert.equal(blastDamage(10),0);assert.ok(blastDamage(2)>blastDamage(6));assert.ok(blastDamage(0)>=100);
});
test('all selectable characters have explicit adult ages and unique IDs',()=>{
  assert.equal(CHARACTERS.filter(c=>c.female).length,3);assert.ok(CHARACTERS.every(c=>c.age>=25));assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,CHARACTERS.length);
});
