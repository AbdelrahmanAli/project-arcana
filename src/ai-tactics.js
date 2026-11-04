import { W } from './arena-geometry.js';

// Tactics operate on observations supplied by Match. No private player input is read.
export const AI_TIMING={decision:.22,jitter:.12,reaction:.24,memory:2.5};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function lineDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}

export function hazardZones(match,p,rules){
  const zones=[];
  const perceived=point=>match.canSee(p,{...point,hp:1},true)||distance(p,point)<60;
  const circle=(object,radius,weight,urgent=false)=>{
    if(object.owner!==undefined&&object.owner!==p.bank)return;
    if(perceived(object))zones.push({x:object.x,y:object.y,radius,weight,urgent});
  };
  const lane=(source,dx,dy,length,width,weight,urgent=false)=>{
    const end={x:source.x+dx*length,y:source.y+dy*length};
    // A visible strip on this bank is enough to notice it even if its source is obscured.
    if(perceived(source)||perceived(end)||lineDistance(p,source,end)<60)zones.push({a:source,b:end,radius:width,weight,urgent});
  };
  for(const waste of match.waste)circle(waste,rules.wasteRadius+16,14);
  for(const flame of match.flames)lane(flame,flame.dx,flame.dy,flame.maxReach,42,22,true);
  for(const a of match.platformAttacks)if(a.owner===p.bank&&a.age>=0&&(!a.hit||a.type!=='fire'))
    lane({x:a.sourceX,y:a.sourceY},a.dx,a.dy,a.maxReach,40,18,a.age>a.warning-.28);
  for(const o of match.obstacles)if(!o.destroyed){
    if(o.type==='barrel')circle(o,rules.barrelRadius+8,2.5);
    if(o.type==='rock'&&o.burning>0)circle(o,rules.burningRockRadius+14,16,true);
  }
  for(const mud of match.mud)circle(mud,mud.radius+8,1.8);
  for(const patch of match.icePatches)circle(patch,patch.radius+8,1.2);
  for(const sand of match.quicksand)circle(sand,sand.radius+17,12,distance(p,sand)<sand.radius*.6);
  for(const strike of match.lightning)if(!strike.hit&&strike.age>=strike.start)circle(strike,56,18,strike.age>strike.warning-.35);
  for(const rock of match.rocksInFlight)if(!rock.hit&&rock.age>=0)circle(rock,48,17,rock.age>rock.warning-.35);
  for(const fire of match.volcanicFire)if(fire.age>=0)circle(fire,55,18,fire.hit||fire.age>fire.warning-.35);
  for(const vortex of match.tornadoes)if(vortex.age>=vortex.warning*.5)circle(vortex,rules.tornadoRadius+15,12,distance(p,vortex)<65);
  for(const pellet of match.hail)if(!pellet.hit&&pellet.age>=pellet.warning-rules.hailFall)circle(pellet,48,14,pellet.age>pellet.warning-.22);
  for(const front of match.avalanches)if(front.age>=front.warning){
    if(front.evaded?.has(p.id))continue;
    lane({x:front.x-rules.avalancheWidth,y:front.y},1,0,rules.avalancheWidth*2,65,25,Math.abs(front.y-p.y)<90);
  }
  for(const eagle of match.eagles)if(eagle.target&&(!eagle.firstDone||eagle.target===eagle.target2&&!eagle.secondDone))
    circle({...eagle.target,owner:eagle.owner},50,15,true);
  for(const lure of match.mirages)if(lure.state==='strike'&&lure.strikeAge>=.12)circle(lure,40,12,true);
  for(const bullet of match.bullets){
    if(match.ownerOf(bullet.owner)?.team===p.team||bullet.life<=0)continue;
    if(['grenade','nuclear','missile'].includes(bullet.type)){
      const remaining=bullet.type==='missile'?(bullet.targetDistance-bullet.travel)/Math.hypot(bullet.vx,bullet.vy):bullet.duration-bullet.t;
      circle({x:bullet.tx,y:bullet.ty},rules.blastRadius[bullet.type]+14,16,remaining<.45);
    }else if(perceived(bullet)){
      const vy=bullet.vy||0,time=vy?(p.y-bullet.y)/vy:-1;
      const speed=Math.hypot(bullet.vx||0,vy);
      if(time>.06&&time<.65&&speed>0)lane(bullet,(bullet.vx||0)/speed,vy/speed,speed*.65,30,9,time<.25);
    }
  }
  return zones;
}

export function dangerAt(point,zones){
  return zones.reduce((sum,z)=>{
    const d=z.a?lineDistance(point,z.a,z.b):distance(point,z);
    return sum+z.weight*Math.max(0,1-d/z.radius);
  },0);
}
export function pathDanger(a,b,zones){
  let cost=0;
  for(let i=1;i<=5;i++)cost+=dangerAt({x:a.x+(b.x-a.x)*i/5,y:a.y+(b.y-a.y)*i/5},zones);
  return cost/5;
}
export function safeDestination(p,desired,bank,zones,free){
  const bound=point=>({x:clamp(point.x,38,W-38),y:clamp(point.y,bank.minY,bank.maxY)});
  const candidates=[bound(desired),bound(p)];
  for(const radius of [70,125])for(let i=0;i<12;i++)candidates.push(bound({x:p.x+Math.cos(i*Math.PI/6)*radius,y:p.y+Math.sin(i*Math.PI/6)*radius}));
  let best=candidates[0],score=Infinity;
  for(const point of candidates){
    if(!free(point))continue;
    const next=distance(point,desired)*.025+dangerAt(point,zones)*5+pathDanger(p,point,zones)*.8;
    if(next<score){best=point;score=next;}
  }
  return best;
}

export function advantageousBarrel(match,p,enemy,radius){
  return match.obstacles.find(o=>o.type==='barrel'&&!o.destroyed&&distance(o,enemy)<radius*.8&&
    match.canSee(p,{...o,hp:1},true)&&!match.players.some(ally=>ally.team===p.team&&ally.hp>0&&distance(ally,o)<radius+10))||null;
}

export function shotPlan(match,p,enemy,type,radius,preserveOwnCover=p.hp<=40){
  if(!enemy)return {special:false,pistol:false};
  const dir=p.bank===0?-1:1,origin={x:p.x,y:p.y+dir*24};
  const arcing=['grenade','missile','nuclear'].includes(type)&&!(type==='grenade'&&enemy.stun>.4);
  const spread=type==='shotgun'?Math.min(85,Math.abs(enemy.y-p.y)*.085):20;
  if(Math.abs(enemy.x-p.x)>spread)return {special:arcing,pistol:false};
  const end={x:p.x,y:enemy.y+dir*16},block=match.nearestObstacleHit(origin,end)?.obstacle;
  if(block){
    const unsafe=block.type==='barrel'&&match.players.some(ally=>ally.team===p.team&&ally.hp>0&&distance(ally,block)<radius+10);
    const cooling=block.type==='rock'&&(block.burning>0||block.cooling>0);
    const preserveCover=block.type==='crate'&&block.owner===p.bank&&preserveOwnCover;
    // Open cover with unlimited pistol ammunition; save the special for a clear shot.
    return {special:arcing,pistol:!unsafe&&!cooling&&!preserveCover,blocked:true};
  }
  return {special:type!=='pistol'&&!(type==='grenade'&&enemy.stun>.4)&&!(enemy.hp>0&&enemy.hp<=5),pistol:Math.abs(enemy.x-p.x)<20};
}

export function coverPosition(match,p,enemy,bank,free){
  if(!enemy||p.hp>40||['grenade','missile','nuclear'].includes(enemy.weapon))return null;
  return match.obstacles.filter(o=>o.owner===p.bank&&o.type==='crate'&&!o.destroyed)
    .map(o=>({x:o.x,y:clamp(o.y+(p.bank===0?45:-45),bank.minY,bank.maxY)}))
    .filter(free).sort((a,b)=>distance(p,a)-distance(p,b))[0]||null;
}
