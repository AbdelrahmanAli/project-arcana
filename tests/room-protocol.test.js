import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, GAME_MODES } from '../src/model.js';
import { availableSeat, bufferInput, consumeTransientInput, fighterCount, fillComputerSeats, humanSeats, lineupFromSeats, matchOptions, sanitizeInput, snapshot } from '../server/room-protocol.js';

test('online room configuration accepts the existing formats, maps, and weapon rules', () => {
  assert.equal(fighterCount('1v1'), 2);
  assert.equal(fighterCount('2v2'), 4);
  assert.deepEqual(matchOptions({ format: '2v2', mode: GAME_MODES.RANDOM, map: 'storm' }), {
    format: '2v2', teamMode: 'versus', mode: GAME_MODES.RANDOM, map: 'storm', difficulty:'normal',
  });
  assert.equal(matchOptions({ format: '2v2', teamMode: 'coop' }).teamMode, 'coop');
  assert.throws(() => matchOptions({ format: '1v1', teamMode: 'coop' }), /team mode/);
  assert.throws(() => matchOptions({ format: '3v3' }), /format/);
  assert.throws(() => matchOptions({ mode: GAME_MODES.CHOOSE_FIXED }), /weapon/);
});

test('co-op waits for two human teammates and assigns distinct computer opponents', () => {
  const options=matchOptions({format:'2v2',teamMode:'coop'});
  assert.deepEqual(humanSeats(options),[0,2]);
  const seats=Array(4).fill(null);
  assert.equal(availableSeat(seats,options,0),0);
  seats[0]={characterId:'elias'};
  assert.equal(availableSeat(seats,options,0),2);
  seats[2]={characterId:'nadia'};
  assert.equal(availableSeat(seats,options,0),-1);
  const filled=fillComputerSeats(seats,options,()=>0);
  assert.deepEqual(filled.map(seat=>!!seat.computer),[false,true,false,true]);
  assert.equal(new Set(filled.map(seat=>seat.characterId)).size,4);
  const match=new Match(()=>.5,{...options,lineup:lineupFromSeats(filled),controllers:filled.map(seat=>seat.computer?'computer':'human')});
  assert.deepEqual(match.players.map(player=>player.controller),['human','computer','human','computer']);
});

test('versus seats can be chosen by bank without overfilling a team',()=>{
  const options=matchOptions({format:'2v2',teamMode:'versus'});
  const seats=Array(4).fill(null);
  assert.equal(availableSeat(seats,options,0),0);
  seats[0]={characterId:'elias'};
  assert.equal(availableSeat(seats,options,0),2);
  seats[2]={characterId:'nadia'};
  assert.equal(availableSeat(seats,options,0),-1);
  assert.equal(availableSeat(seats,options,1),1);
});

test('online inputs cannot spoof a fighter, exceed movement bounds, or inject arbitrary state', () => {
  assert.equal(sanitizeInput(null), null);
  assert.deepEqual(sanitizeInput({ x: 500, y: -7, pistol: true, special: 'true', player: 3, hp: 999 }), {
    x: 1, y: -1, pistol: true, special: false, specialRelease: false, dodge: false,
  });
});

test('dodge and laser release survive until one tick, then clear before later packets', () => {
  let input = bufferInput(null, { dodge: true, specialRelease: true });
  input = bufferInput(input, { dodge: false, specialRelease: false });
  assert.equal(input.dodge, true);
  assert.equal(input.specialRelease, true);
  consumeTransientInput(input);
  assert.equal(input.dodge, false);
  assert.equal(input.specialRelease, false);
  input = bufferInput(input, { dodge: false, specialRelease: false });
  assert.equal(input.dodge, false);
  assert.equal(input.specialRelease, false);
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
