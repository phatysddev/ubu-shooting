import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getWeapon} from '../shared/arsenal.js';
import {WORLD_LIMIT,MEDKIT_SPAWNS} from '../shared/world.js';
import {beginSlide} from '../shared/tactics.js';
test('RPG is single-shot with long reload and regular guns are buffed',()=>{assert.equal(getWeapon('rpg').mag,1);assert.equal(getWeapon('rpg').reload,6500);assert.ok(getWeapon('ar4').damage>34);assert.ok(getWeapon('ar4').reload<2200);});
test('sprint-crouch initiates a directional slide and rejects spam',()=>{const p={yaw:0,lift:0,input:{w:true,sprint:true}};assert.equal(beginSlide(p,100),true);assert.equal(p.slideUntil,1000);assert.equal(p.slideZ,-1);assert.equal(beginSlide(p,200),false);assert.equal(beginSlide({...p,vehicle:'jeep'},5000),false);});
test('expanded world has distributed medkits within its bounds',()=>{assert.equal(WORLD_LIMIT,220);assert.ok(MEDKIT_SPAWNS.length>=10);assert.ok(MEDKIT_SPAWNS.some(([x])=>Math.abs(x)>100));assert.ok(MEDKIT_SPAWNS.every(([x,z])=>Math.max(Math.abs(x),Math.abs(z))<WORLD_LIMIT));});
