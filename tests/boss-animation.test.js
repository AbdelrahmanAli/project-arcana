import test from 'node:test';
import assert from 'node:assert/strict';
import {bossDirection,bossMotionFrame,bossAttackFrame,BOSS_ATTACK_VISUALS} from '../src/boss-animation.js';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';

test('all compass movements select the matching atlas column',()=>{
  const movements=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  for(const [direction,[x,y]] of movements.entries())assert.equal(bossDirection(x*100,y*100),direction);
  assert.equal(bossDirection(0,0,6),6,'a stationary boss keeps facing left');
  assert.ok(bossMotionFrame(3,.7,80)>=3);
});

test('attack animations reach the final frame and every attack has its own visual proportions',()=>{
  assert.deepEqual([0,.1,.2,.3,.4,.5].map(age=>bossAttackFrame(age,.55)),[0,1,2,3,4,5]);
  for(const definition of Object.values(BOSS_DEFINITIONS))for(const attack of definition.attacks){
    const visual=BOSS_ATTACK_VISUALS[attack];
    assert.ok(visual&&visual.width>0&&visual.height>0&&visual.anchor>0&&visual.anchor<1,attack);
    assert.ok(['ballistic','beam','ground'].includes(visual.delivery),`${attack} needs a delivery animation`);
  }
});
