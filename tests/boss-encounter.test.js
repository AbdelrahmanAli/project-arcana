import test from 'node:test';
import assert from 'node:assert/strict';
import { BossEncounter, BOSS_DEFINITIONS } from '../src/boss-encounter.js';

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
