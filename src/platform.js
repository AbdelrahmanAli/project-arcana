import {RIVER} from './arena-geometry.js';

export const PLATFORM_TIMING = Object.freeze({
  prime: 1.7,
  launch: .9,
  secondAttack: 1.7,
  settle: .9,
  idle: 12.2,
  firstAttackAt: .65,
  secondAttackAt: .55,
});

// The painted deck sits slightly below the middle of each transparent frame.
// Offset the sprite anchor so the visible hull, not the empty cell, is centered.
const PLATFORM_CENTER_Y = RIVER.y - 5;

export const PLATFORM_GEOMETRY = Object.freeze({
  x: RIVER.x,
  y: PLATFORM_CENTER_Y,
  width: 190,
  height: 150,
  // Frame art has paired hatch bays on both bank-facing rims.
  supplyPorts: [
    [{x:RIVER.x-24,y:PLATFORM_CENTER_Y+27},{x:RIVER.x+24,y:PLATFORM_CENTER_Y+27}],
    [{x:RIVER.x-24,y:PLATFORM_CENTER_Y-26},{x:RIVER.x+24,y:PLATFORM_CENTER_Y-26}],
  ],
  attackVents: [
    {x:RIVER.x-68,y:PLATFORM_CENTER_Y},
    {x:RIVER.x+68,y:PLATFORM_CENTER_Y},
  ],
});

export const PLATFORM_VOLLEY = Object.freeze({
  warning: .5,
  fighterStagger: .32,
  lightningSpeed: 620,
  lightningWidth: 22,
  lightningDamage: 14,
  icicleSpeed: 440,
  icicleWidth: 20,
  icicleDamage: 10,
});

export const PLATFORM_HEAL_CHANCE = .08;

export function supplyPort(bank, slot=0){return PLATFORM_GEOMETRY.supplyPorts[bank][slot%2];}
export function attackVent(bank){return PLATFORM_GEOMETRY.attackVents[bank];}

// The waterline uses mirrored offsets so the two hull shoulders move together.
export function platformContactEdgeY(time, offset){
  const distance=Math.abs(offset);
  return 40-16*(distance/88)**2+Math.sin(time*3+distance*.11)*1.7;
}
export function platformContactSway(time){return Math.sin(time*2.5)*1.6;}

// Frame order matches public/art/phase8/platform-frames.webp (4 columns, 2 rows).
// Crossfade only between adjacent mechanical poses, keeping the deck aligned.
export function platformPose(phase, progress){
  const sequence={prime:[0,1,2,3],launch:[3,4,3],secondAttack:[3,5],settle:[5,6,7,0]}[phase];
  if(!sequence)return {from:0,to:0,blend:0};
  const duration=PLATFORM_TIMING[phase];
  const position=Math.max(0,Math.min(sequence.length-1,progress/duration*(sequence.length-1)));
  const index=Math.min(sequence.length-2,Math.floor(position));
  return {from:sequence[index],to:sequence[index+1],blend:position-index};
}
