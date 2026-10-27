import {test} from 'node:test';
import assert from 'node:assert/strict';
import {launchJump,stepJump,canAim,smokeBlocks} from '../shared/tactics.js';
import {getWeapon} from '../shared/arsenal.js';
test('jump rises, rejects a midair jump and lands without sinking',()=>{
  const p={lift:0,vy:0};assert.equal(launchJump(p),true);stepJump(p,.05);assert.ok(p.lift>0);assert.equal(launchJump(p),false);
  let peak=p.lift;for(let i=0;i<100;i++){stepJump(p,.02);peak=Math.max(peak,p.lift);}assert.ok(peak>1&&peak<1.4);assert.equal(p.lift,0);assert.equal(p.vy,0);assert.equal(launchJump(p),true);
});
test('knife cannot aim; rifles and scoped weapons can',()=>{
  assert.equal(canAim(getWeapon('knife')),false);assert.equal(canAim(getWeapon('longbow')),true);assert.equal(canAim(getWeapon('ar4')),true);
});
test('smoke masks labels through or within a cloud, not unrelated sightlines',()=>{
  const clouds=[{x:0,y:2,z:0}];assert.equal(smokeBlocks([0,2,10],[0,2,-10],clouds),true);assert.equal(smokeBlocks([0,2,0],[0,2,10],clouds),true);assert.equal(smokeBlocks([10,2,10],[10,2,-10],clouds),false);
});
