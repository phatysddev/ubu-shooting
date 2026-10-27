import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movePlayer,canStand,rayBox,coverDistance,direction,groundHeight,COVER} from '../shared/world.js';

test('movement cannot tunnel through a container, including large steps',()=>{
  const p={x:-12,z:6};movePlayer(p,0,-20);assert.ok(p.z>.3);assert.ok(canStand(p.x,p.z));
});
test('diagonal movement slides along the edge of cover',()=>{
  const p={x:-12,z:.6};movePlayer(p,3,-3);assert.ok(p.x>-10);assert.ok(p.z>.3);assert.ok(canStand(p.x,p.z));
});
test('ray parallel to a face misses when outside its bounds',()=>{
  assert.equal(rayBox([3,1,5],[0,0,-1],[-1,0,-1],[1,2,1]),Infinity);
  assert.equal(rayBox([0,1,5],[0,0,-1],[-1,0,-1],[1,2,1]),4);
});
test('solid cover occludes the line of fire',()=>{
  const b=COVER[0],o=[b.x,groundHeight(b.x,b.z)+1.7,b.z+10];assert.ok(coverDistance(o,[0,0,-1])<8);
  assert.equal(coverDistance([b.x,10,b.z+10],[0,0,-1]),Infinity);
});
test('view direction is normalized and positive pitch points upward',()=>{
  const d=direction(.8,.4);assert.ok(Math.abs(Math.hypot(...d)-1)<1e-9);assert.ok(d[1]>0);
});
