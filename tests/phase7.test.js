import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, resolveLineup } from '../src/characters.js';
import { Match, MAPS, MAP_TYPES, GAME_MODES, BANK_BOUNDS } from '../src/model.js';

test('six distinct characters contain three women and three men', () => {
  assert.equal(CHARACTERS.length, 6);
  assert.equal(new Set(CHARACTERS.map(character => character.id)).size, 6);
  assert.equal(CHARACTERS.filter(character => character.gender === 'woman').length, 3);
  assert.equal(CHARACTERS.filter(character => character.gender === 'man').length, 3);
  assert.ok(CHARACTERS.every(character => !character.name.includes(' ')));
});

test('lineup resolution keeps manual choices and assigns distinct random fighters', () => {
  const lineup = resolveLineup(() => .1, 'mara', '2v2', { teammate: 'nadia', opponent: 'random', opponent2: 'random' });
  assert.equal(lineup.player, 'mara');
  assert.equal(lineup.teammate, 'nadia');
  assert.equal(new Set(Object.values(lineup)).size, 4);
  assert.throws(() => resolveLineup(() => .5, 'mara', '2v2', { teammate: 'nadia', opponent: 'nadia' }), RangeError);
});

test('2v2 spawns equal teams with independent fighter identities and two weapon drops per bank', () => {
  const m = new Match(() => .5, { format: '2v2', lineup: { player: 'mara', teammate: 'imani', opponent: 'elias', opponent2: 'tomas' } });
  assert.deepEqual(m.players.map(fighter => fighter.team), [0, 1, 0, 1]);
  assert.deepEqual(m.players.map(fighter => fighter.controller), ['human', 'computer', 'computer', 'computer']);
  assert.ok(m.players.every(fighter => fighter.hp === 100));
  m.launch();
  const weapons = m.pickups.filter(item => item.type !== 'syringe');
  assert.equal(weapons.length, 4);
  assert.equal(weapons.filter(item => item.owner === 0).length, 2);
  assert.equal(weapons.filter(item => item.owner === 1).length, 2);
});

test('friendly weapon blasts are harmless but the hostile team takes damage', () => {
  const m = new Match(() => .5, { format: '2v2' });
  const [player, enemy, ally] = m.players;
  player.x = 200; player.y = 760;
  ally.x = 200; ally.y = 720;
  enemy.x = 200; enemy.y = 240;
  m.explode({ owner: player.id, type: 'nuclear', x: ally.x, y: ally.y, damage: 16, life: 1 });
  assert.equal(ally.hp, 100);
  assert.equal(player.hp, 100);
  m.explode({ owner: player.id, type: 'missile', x: enemy.x, y: enemy.y, damage: 28, life: 1 });
  assert.ok(enemy.hp < 100);
});

test('first fighter death leaves a 2v2 round running until one team falls', () => {
  const m = new Match(() => .5, { format: '2v2' });
  m.nextDrop = Infinity;
  m.players[0].hp = 0;
  m.update(1/120);
  assert.equal(m.ending, 0);
  assert.equal(m.players[0].deathRecorded, true);
  m.players[2].hp = 0;
  m.update(1/120);
  assert.ok(m.ending > 0);
  assert.equal(m.winner, 1);
});

test('computer cannot see a fighter concealed by a sandstorm', () => {
  const m = new Match(() => .5, { map: MAPS.DESERT, format: '2v2' });
  m.obstacles.forEach(obstacle => { obstacle.destroyed = true; });
  const observer = m.players[1], target = m.players[0];
  assert.equal(m.canSee(observer, target), true);
  m.sandstorm = { y: target.y, direction: 1, age: 2, life: 8 };
  assert.equal(m.canSee(observer, target), false);
});

test('each map and weapon mode runs a four-fighter round with valid bank positions', () => {
  for (const map of MAP_TYPES) for (const mode of Object.values(GAME_MODES)) {
    const match = new Match(() => .41, { map, mode, format: '2v2', weapon: 'rifle' });
    match.nextDrop = 1;
    for (let frame = 0; frame < 420 && !match.finished; frame++) match.update(1 / 30);
    assert.equal(match.players.length, 4, `${map}/${mode}: fighter count`);
    for (const fighter of match.players) {
      assert.ok(Number.isFinite(fighter.x) && Number.isFinite(fighter.y), `${map}/${mode}: finite position`);
      assert.ok(fighter.x >= 0 && fighter.x <= 480, `${map}/${mode}: horizontal bank boundary`);
      assert.ok(fighter.y >= BANK_BOUNDS[fighter.bank].minY - 1 && fighter.y <= BANK_BOUNDS[fighter.bank].maxY + 1,
        `${map}/${mode}: vertical bank boundary`);
    }
  }
});

test('opponent concealment also hides the second enemy from the player', () => {
  const match = new Match(() => .5, { map: MAPS.DESERT, format: '2v2' });
  match.obstacles.forEach(obstacle => { obstacle.destroyed = true; });
  const player = match.players[0], secondEnemy = match.players[3];
  assert.equal(match.canSee(player, secondEnemy), true);
  match.sandstorm = { y: secondEnemy.y, direction: 1, age: 2, life: 8 };
  assert.equal(match.canSee(player, secondEnemy), false);
});

test('2v2 ends in a draw when both teams lose their final fighter together', () => {
  const match = new Match(() => .5, { format: '2v2' });
  for (const fighter of match.players) fighter.hp = 0;
  match.update(1 / 30);
  assert.equal(match.winner, 'draw');
  assert.ok(match.ending > 0);
});
