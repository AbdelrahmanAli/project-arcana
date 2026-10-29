import test from 'node:test';
import assert from 'node:assert/strict';
import {directShotDepth, laserDepthSegments} from '../src/projectile-depth.js';

test('direct shots pass behind lower fighters and in front of upper fighters',()=>{
  assert.equal(directShotDepth({y:566,travel:0},0,0),'rear');
  assert.equal(directShotDepth({y:720,travel:150},1,0),'rear');
  assert.equal(directShotDepth({y:350,travel:0},1,0),'between');
  assert.equal(directShotDepth({y:200,travel:500},0,1),'between');
  assert.equal(directShotDepth({y:450,travel:160},0,1),'between','raised tower still hides a crossing shot');
  assert.equal(directShotDepth({y:450,travel:160},0,0),'front','a retracted tower no longer hides it');
});

test('laser depth changes across the banks without moving over the lower shooter',()=>{
  const lowerToUpper=laserDepthSegments(566,200,1);
  assert.equal(lowerToUpper.at(-1).depth,'rear');
  assert.equal(lowerToUpper[0].depth,'between');
  const upperToLower=laserDepthSegments(350,760,0);
  assert.equal(upperToLower[0].depth,'between');
  assert.equal(upperToLower.at(-1).depth,'rear');
});
