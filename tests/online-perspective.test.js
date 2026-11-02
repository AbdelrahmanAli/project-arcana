import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, BANK_BOUNDS, H, MAP_TYPES, RIVER, W } from '../src/model.js';
import { inputForSeat, mirrorY, projectOnlineState } from '../src/online-perspective.js';
import { snapshot } from '../server/room-protocol.js';

test('opposing banks project onto the same lower-bank bounds', () => {
  assert.equal(mirrorY(BANK_BOUNDS[1].minY), BANK_BOUNDS[0].maxY);
  assert.equal(mirrorY(BANK_BOUNDS[1].maxY), BANK_BOUNDS[0].minY);
  assert.equal(mirrorY(RIVER.y), RIVER.y);
  for (let y = 0; y <= H; y += 5) assert.ok(Math.abs(mirrorY(mirrorY(y)) - y) < .00001);
});

test('the invited fighter appears below the channel with mirrored controls and world objects', () => {
  const match = new Match(() => .5, { controllers: ['human', 'human'] });
  const state = snapshot(match);
  state.pickups = [{ owner: 1, type: 'rifle', x: 110, y: 220, sx: 220, sy: 469 }];
  state.platformAttacks = [{ owner: 1, sourceX: 308, sourceY: 495, dx: 0, dy: -1, x: 110, y: 220 }];
  state.bullets = [{ owner: 1, x: 110, y: 220, vx: 0, vy: 600, tx: 190, ty: 760 }];
  state.winner = 1;
  const view = projectOnlineState(state, 1);
  assert.equal(view.players[1].bank, 0);
  assert.ok(view.players[1].y >= BANK_BOUNDS[0].minY);
  assert.equal(view.players[0].bank, 1);
  assert.equal(view.pickups[0].owner, 0);
  assert.equal(view.pickups[0].x, W - 110);
  assert.equal(view.platformAttacks[0].sourceX, W - 308);
  assert.equal(view.platformAttacks[0].dy, 1);
  assert.equal(view.bullets[0].owner, 1, 'projectile shooter IDs stay authoritative');
  assert.equal(view.bullets[0].vy, -600);
  assert.equal(view.winner, 0);
  assert.deepEqual(inputForSeat({ x: 1, y: -1, pistol: true }, 1), { x: -1, y: 1, pistol: true });
  assert.equal(state.players[1].bank, 1, 'projection does not mutate the server state');
});

test('every 2v2 online seat sees their own bank below the river',()=>{
  const match=new Match(()=>.5,{format:'2v2',controllers:['human','human','human','human']});
  const state=snapshot(match);
  for(let seat=0;seat<4;seat++){
    const view=projectOnlineState(state,seat);
    assert.equal(view.players[seat].bank,0);
    assert.ok(view.players[seat].y>=BANK_BOUNDS[0].minY);
    assert.equal(view.players[(seat+1)%4].bank,1);
    assert.equal(inputForSeat({x:1,y:-1},seat).x,seat%2?-1:1);
  }
});

for (const map of MAP_TYPES) test(`${map} online perspective puts the invited fighter on the lower bank`, () => {
  const match = new Match(() => .5, { map, controllers: ['human', 'human'] });
  for (let tick = 0; tick < 480; tick++) match.update(1 / 60, [{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const view = projectOnlineState(snapshot(match), 1);
  for (const player of view.players) {
    const bounds = BANK_BOUNDS[player.bank];
    assert.ok(player.y >= bounds.minY && player.y <= bounds.maxY,
      `${player.characterId} at ${player.y} outside bank ${player.bank}`);
  }
  for (const collection of ['obstacles', 'pickups', 'mud', 'lightning', 'tornadoes', 'quicksand', 'mirages', 'icePatches', 'hail']) {
    for (const item of view[collection]) if (item.owner === 0 || item.owner === 1) {
      const bounds = BANK_BOUNDS[item.owner];
      assert.ok(item.y >= bounds.minY - 30 && item.y <= bounds.maxY + 30,
        `${collection} at ${item.y} outside bank ${item.owner}`);
    }
  }
});
