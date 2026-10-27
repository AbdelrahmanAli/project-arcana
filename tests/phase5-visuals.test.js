import test from 'node:test';
import assert from 'node:assert/strict';
import { W, RIVER } from '../src/model.js';
import { ashCloudVisuals } from '../src/phase5-visuals.js';

test('volcanic smoke rises from both vents, crosses its bank, then leaves the screen',()=>{
  const life=8.5;
  const start=ashCloudVisuals({age:.4,life});
  assert.ok(start.some(c=>c.owner===0&&c.x<70&&c.y>RIVER.y));
  assert.ok(start.some(c=>c.owner===1&&c.x>W-70&&c.y<RIVER.y));
  const middle=ashCloudVisuals({age:4.5,life});
  assert.ok(middle.some(c=>c.owner===0&&c.x>W/2&&c.y>RIVER.bottom));
  assert.ok(middle.some(c=>c.owner===1&&c.x<W/2&&c.y<RIVER.top));
  const end=ashCloudVisuals({age:8.4,life});
  assert.ok(end.some(c=>c.owner===0&&c.x>W));
  assert.ok(end.some(c=>c.owner===1&&c.x<0));
});
