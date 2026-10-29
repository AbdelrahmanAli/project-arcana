import {RIVER} from './arena-geometry.js';

// Lower-bank muzzles sit just inside the river in screen space. Keep the first
// part of a shot behind the shooter until it has cleared the head and shoulders.
export const LOWER_FIGHTER_CLEARANCE_Y = RIVER.bottom - 40;

export function projectileDepth(y) {
  if (y >= LOWER_FIGHTER_CLEARANCE_Y) return 'rear';
  if (y <= RIVER.top) return 'between';
  return 'front';
}

export function directShotDepth(shot, ownerBank) {
  if (ownerBank === 0 && shot.travel < 40) return 'rear';
  return projectileDepth(shot.y);
}

export function laserDepthSegments(startY, endY) {
  const low = Math.min(startY, endY), high = Math.max(startY, endY);
  const cuts = [low, high, RIVER.top, LOWER_FIGHTER_CLEARANCE_Y]
    .filter(y => y >= low && y <= high).sort((a, b) => a - b);
  const segments = [];
  for (let index = 1; index < cuts.length; index++) {
    const from = cuts[index - 1], to = cuts[index];
    if (to > from) segments.push({from, to, depth: projectileDepth((from + to) / 2)});
  }
  return segments;
}
