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

test('each bank has horizontal, vertical, and diagonal smoke routes',()=>{
  const earlier=ashCloudVisuals({age:3,life:8.5}),later=ashCloudVisuals({age:5,life:8.5});
  for(const owner of [0,1]){
    const at=(clouds,index)=>clouds.find(cloud=>cloud.owner===owner&&cloud.index===index);
    const horizontal=[at(earlier,0),at(later,0)];
    const vertical=[at(earlier,1),at(later,1)];
    const diagonal=[at(earlier,2),at(later,2)];
    assert.ok(Math.abs(horizontal[1].x-horizontal[0].x)>80&&Math.abs(horizontal[1].y-horizontal[0].y)<1);
    assert.ok(Math.abs(vertical[1].x-vertical[0].x)<1&&Math.abs(vertical[1].y-vertical[0].y)>80);
    assert.ok(Math.abs(diagonal[1].x-diagonal[0].x)>80&&Math.abs(diagonal[1].y-diagonal[0].y)>80);
    assert.ok(later.filter(cloud=>cloud.owner===owner).every(cloud=>cloud.width>200&&cloud.alpha>.8));
  }
});
