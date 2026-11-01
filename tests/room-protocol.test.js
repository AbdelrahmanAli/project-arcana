import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, GAME_MODES } from '../src/model.js';
import { fighterCount, lineupFromSeats, matchOptions, sanitizeInput, snapshot } from '../server/room-protocol.js';

test('online room configuration accepts the existing formats, maps, and weapon rules', () => {
  assert.equal(fighterCount('1v1'), 2);
  assert.equal(fighterCount('2v2'), 4);
  assert.deepEqual(matchOptions({ format: '2v2', mode: GAME_MODES.RANDOM, map: 'storm' }), {
    format: '2v2', mode: GAME_MODES.RANDOM, map: 'storm',
  });
  assert.throws(() => matchOptions({ format: '3v3' }), /format/);
  assert.throws(() => matchOptions({ mode: GAME_MODES.CHOOSE_FIXED }), /weapon/);
});

test('online inputs cannot spoof a fighter, exceed movement bounds, or inject arbitrary state', () => {
  assert.equal(sanitizeInput(null), null);
  assert.deepEqual(sanitizeInput({ x: 500, y: -7, pistol: true, special: 'true', player: 3, hp: 999 }), {
    x: 1, y: -1, pistol: true, special: false, specialRelease: false, dodge: false,
  });
});

test('room seats map to the same distinct 2v2 lineup used by local matches', () => {
  const seats = ['elias', 'dorian', 'nadia', 'imani'].map(characterId => ({ characterId }));
  assert.deepEqual(lineupFromSeats(seats), {
    player: 'elias', opponent: 'dorian', teammate: 'nadia', opponent2: 'imani',
  });
  assert.throws(() => lineupFromSeats([seats[0], seats[0]]), /distinct/);
});

test('server snapshots expose match state without its random function or AI internals', () => {
  const match = new Match(() => .5, { controllers: ['human', 'human'] });
  const state = snapshot(match);
  assert.equal(state.players.length, 2);
  assert.equal(state.format, '1v1');
  assert.equal('random' in state, false);
  assert.equal('aiState' in state, false);
  assert.doesNotThrow(() => JSON.stringify(state));
});
