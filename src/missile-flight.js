// Smooth altitude and tangent shared by the missile body and exhaust.
const clamp=value=>Math.max(0,Math.min(1,value));
export function missileAltitude(progress, distance, verticalDirection) {
  const p=clamp(progress),height=Math.min(72,Math.abs(verticalDirection)*distance*.1);
  const t=p<.25?p/.25:p>.7?(1-p)/.3:1;
  return height*t*t*(3-2*t);
}
export function missilePitch(progress,distance,ux,uy) {
  const from=clamp(progress-.001),to=clamp(progress+.001);
  const slope=(missileAltitude(to,distance,uy)-missileAltitude(from,distance,uy))/Math.max(.0001,(to-from)*distance);
  return Math.atan2(uy-slope,ux);
}
