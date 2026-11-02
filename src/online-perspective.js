import { BANK_BOUNDS, H, HAIL_CLUSTER, RIVER, W } from './model.js';
import { ashCloudVisuals } from './phase5-visuals.js';

const xPositions = new Set(['x', 'sx', 'tx', 'sourceX', 'anchorX', 'startX', 'endX', 'targetX', 'fromX', 'toX', 'originX']);
const yPositions = new Set(['y', 'sy', 'ty', 'sourceY', 'anchorY', 'startY', 'endY', 'targetY', 'fromY', 'toY', 'originY', 'cloudY']);
const xVectors = new Set(['vx', 'dx', 'dodgeX', 'lastMoveX', 'iceVX', 'iceEntryX', 'steerX']);
const yVectors = new Set(['vy', 'dy', 'dodgeY', 'lastMoveY', 'iceVY', 'iceEntryY', 'steerY']);
const bankOwned = ['pickups', 'obstacles', 'platformAttacks', 'mud', 'lightning', 'tornadoes',
  'rocksInFlight', 'volcanicFire', 'eagles', 'quicksand', 'mirages', 'icePatches', 'avalanches', 'hail'];

// The playable banks are exactly mirrored, but the painted channel is offset in
// the source art. This continuous mapping keeps both bank limits and its center fixed.
export function mirrorY(y) {
  const upper = BANK_BOUNDS[1].maxY;
  const lower = BANK_BOUNDS[0].minY;
  const center = RIVER.y;
  if (y <= upper || y >= lower) return H - y;
  if (y <= center) return lower - (y - upper) * (lower - center) / (center - upper);
  return center - (y - center) * (center - upper) / (lower - center);
}

function rotate(value) {
  if (Array.isArray(value)) return value.map(rotate);
  if (!value || typeof value !== 'object') return value;
  const projected = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'number') { projected[key] = rotate(item); continue; }
    if (xPositions.has(key)) projected[key] = W - item;
    else if (yPositions.has(key)) projected[key] = mirrorY(item);
    else if (xVectors.has(key) || yVectors.has(key) || key === 'direction' || key === 'entrySide') projected[key] = -item;
    else if (key === 'bank' || key === 'team') projected[key] = 1 - item;
    else if (key === 'dodgeDir') projected[key] = (item + 4) % 8;
    else projected[key] = item;
  }
  return projected;
}

export function projectOnlineState(state, seat) {
  if (!Number.isInteger(seat) || seat < 0 || seat >= state.players.length) throw new RangeError('Unsupported online perspective');
  if (seat % 2 === 0) return state;
  const view = rotate(state);
  // Ash routes are generated from time, so rotating only the stored age does
  // not rotate their actual coverage. Share projected clouds with visibility checks.
  if(state.ash)view.ash.clouds=ashCloudVisuals(state.ash).map(cloud=>({...rotate(cloud),owner:1-cloud.owner}));
  for(const pellet of view.hail||[])pellet.impactOffsets=HAIL_CLUSTER.offsets.map(([x,y])=>[-x,-y]);
  for (const collection of bankOwned) {
    for (const item of view[collection] || []) if (item.owner === 0 || item.owner === 1) item.owner = 1 - item.owner;
  }
  if (view.winner === 0 || view.winner === 1) view.winner = 1 - view.winner;
  return view;
}

export function inputForSeat(input, seat) {
  if (seat % 2 === 0) return input;
  return { ...input, x: -(input.x || 0), y: -(input.y || 0) };
}
