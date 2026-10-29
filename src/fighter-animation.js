export const WALK_SEQUENCE = [1, 0, 2, 0];

export function fighterFacing(bank) {
  return bank === 0 ? 'north' : 'south';
}

export function fighterMotion(p) {
  const walking = p.moving && p.dodgeTime <= 0;
  const step = Math.floor(p.walk / 12) % WALK_SEQUENCE.length;
  let pose = 'idle';
  if (p.dodgeTime > 0) pose = 'roll';
  else if (p.stun > 0) pose = 'stun';
  else if (p.flash > 0) pose = 'fire';
  else if (p.hurt > 0) pose = 'hurt';
  else if (walking && p.charge <= 0 && Math.abs(p.lastMoveX) > .62) pose = 'side';
  else if (walking) pose = 'walk';
  else if (p.charge > 0) pose = 'charge';
  return {pose, walking, step};
}
