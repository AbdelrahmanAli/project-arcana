import test from 'node:test';
import assert from 'node:assert/strict';
import {fighterFacing, fighterMotion} from '../src/fighter-animation.js';

test('bank-facing fire overrides sideways movement for either fighter',()=>{
  const strafing={moving:true,dodgeTime:0,stun:0,hurt:0,flash:0,charge:0,lastMoveX:1,walk:24};
  assert.equal(fighterMotion(strafing).pose,'side');
  assert.equal(fighterMotion({...strafing,flash:.09}).pose,'fire');
  assert.equal(fighterMotion({...strafing,hurt:.1,flash:.09}).pose,'fire');
  assert.equal(fighterMotion({...strafing,charge:.6}).pose,'walk');
  assert.equal(fighterFacing(0),'north');
  assert.equal(fighterFacing(1),'south');
});
