import test from 'node:test';
import assert from 'node:assert/strict';
import { BossEncounter, BOSS_DEFINITIONS, bossAttackZones } from '../src/boss-encounter.js';
import {BANK_BOUNDS} from '../src/arena-geometry.js';

const fighter = (id, x) => ({ id, x, y: 760, bank: 0, hp: 100 });

test('every map creates an attackable boss with four attacks and no match timer', () => {
  for (const map of Object.keys(BOSS_DEFINITIONS)) {
    const solo = new BossEncounter(map, 1, () => 0);
    const duo = new BossEncounter(map, 2, () => 0);
    assert.equal(BOSS_DEFINITIONS[map].attacks.length, 4);
    assert.equal(solo.hp, 500);
    assert.equal(duo.hp, 800);
    assert.equal('timeLimit' in solo, false);
    assert.equal(solo.damage(10), 10);
    solo.weakPoint = 1;
    assert.equal(solo.damage(10, true), 15);
  }
});

test('boss windup, release, recovery and team targeting remain deterministic', () => {
  const boss = new BossEncounter('riverside', 2, () => 0);
  const fighters = [fighter(0, 120), fighter(2, 350)];
  const events = [];
  for (let tick = 0; tick < 360; tick++) events.push(...boss.update(1 / 60, fighters));
  assert.ok(events.some(event => event.type === 'bossWindup'));
  assert.ok(events.some(event => event.type === 'bossAttack'));
  assert.deepEqual(events.filter(event => event.type === 'bossWindup').slice(0, 2).map(event => event.targetId), [0, 2]);
  assert.equal(boss.snapshot().random, undefined);
  const remaining = boss.hp;
  assert.equal(boss.damage(1000), remaining);
  assert.equal(boss.defeated, true);
  assert.equal(boss.damage(20), 0);
});

test('every boss attack marks a bounded player-bank pattern with a dodge route',()=>{
  for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
    const boss=new BossEncounter(map,1,()=>.5);
    for(const type of definition.attacks){
      const zones=bossAttackZones(type,240,760);
      assert.ok(zones.length>0&&zones.length<=4,`${map} ${type} zone count`);
      assert.ok(zones.every(zone=>zone.x>=30&&zone.x<=450&&zone.y>=BANK_BOUNDS[0].minY&&zone.y<=BANK_BOUNDS[0].maxY),`${map} ${type} outside bank`);
      assert.ok(zones.every(zone=>zone.delay>=0&&zone.delay<.7),`${map} ${type} impact timing`);
    }
    for(let tick=0;tick<900;tick++)boss.update(1/60,[fighter(0,200)]);
    assert.ok(boss.x>=70&&boss.x<=410&&boss.y>=BANK_BOUNDS[1].minY&&boss.y<=BANK_BOUNDS[1].maxY);
  }
});
