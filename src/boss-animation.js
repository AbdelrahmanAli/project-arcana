// The motion atlas is four animation rows by eight compass columns:
// N, NE, E, SE, S, SW, W, NW. Keep the last facing while a boss pauses.
export function bossDirection(vx,vy,previous=4){
  if(Math.hypot(vx,vy)<13)return previous;
  return (Math.round(Math.atan2(vx,-vy)/(Math.PI/4))+8)%8;
}

export function bossMotionFrame(direction,elapsed,speed){
  const cadence=4.2+Math.min(2.3,speed/55);
  return (Math.floor(elapsed*cadence)%4)*8+direction;
}

export function bossAttackFrame(age,life){
  if(life<=0)return 5;
  return Math.min(5,Math.max(0,Math.floor(age/life*6)));
}

// Frame art is deliberately given different silhouettes at the point of
// impact. These proportions preserve those shapes at gameplay scale.
export const BOSS_ATTACK_VISUALS=Object.freeze({
  cannon:{width:2.5,height:2.7,anchor:.72,delivery:'ballistic'},
  ricochet:{width:3.5,height:2.2,anchor:.65,delivery:'ballistic'},
  broadside:{width:4.1,height:2.3,anchor:.67,delivery:'ballistic'},
  turretSweep:{width:3.3,height:1.7,anchor:.65,delivery:'beam'},
  chain:{width:3.5,height:2.3,anchor:.66,delivery:'beam'},
  spectralArc:{width:3.8,height:2.9,anchor:.76,delivery:'beam'},
  decoys:{width:3.4,height:3.7,anchor:.85,delivery:'ground'},
  thunderPulse:{width:3.5,height:3.5,anchor:.6,delivery:'ground'},
  moltenFist:{width:3.4,height:3.3,anchor:.78,delivery:'ground'},
  fissure:{width:2.4,height:3.4,anchor:.55,delivery:'ground'},
  boulder:{width:3.4,height:3.4,anchor:.72,delivery:'ballistic'},
  fragments:{width:3.1,height:2.8,anchor:.68,delivery:'ballistic'},
  sandBlade:{width:3.7,height:3.1,anchor:.7,delivery:'beam'},
  burrow:{width:3.7,height:3.4,anchor:.76,delivery:'ground'},
  vortex:{width:4,height:4.4,anchor:.82,delivery:'ground'},
  sandTeeth:{width:3.6,height:2.8,anchor:.72,delivery:'ground'},
  icicles:{width:3.1,height:3.7,anchor:.84,delivery:'ballistic'},
  iceBeam:{width:3.2,height:1.8,anchor:.62,delivery:'beam'},
  iceBoulder:{width:3.5,height:3.5,anchor:.74,delivery:'ballistic'},
  frostWave:{width:4,height:2.5,anchor:.74,delivery:'ground'},
});
