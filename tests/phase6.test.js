import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MAPS,MAP_TYPES,GAME_MODES,BANK_BOUNDS,RIVER,PHASE6_RULES,EAGLE_FLIGHT,AVALANCHE,HAIL_CLUSTER,SANDSTORM_WAVE_GAP,sandstormCovers} from '../src/model.js';

test('Desert and Snow keep equal bank depth and an impassable channel',()=>{
  assert.equal(BANK_BOUNDS[0].maxY-BANK_BOUNDS[0].minY,BANK_BOUNDS[1].maxY-BANK_BOUNDS[1].minY);
  assert.ok(MAP_TYPES.includes(MAPS.DESERT)&&MAP_TYPES.includes(MAPS.SNOW));
  for(const map of [MAPS.DESERT,MAPS.SNOW])for(const p of new Match(()=>.5,{map}).players){
    const m=new Match(()=>.5,{map}),fighter=m.players[p.id];
    m.obstacles.forEach(o=>o.destroyed=true);
    m.move(fighter,0,p.id===0?-1:1,3);
    assert.equal(fighter.y,BANK_BOUNDS[p.id].minY*(p.id===0?1:0)+BANK_BOUNDS[p.id].maxY*(p.id===1?1:0));
    assert.ok(fighter.y<RIVER.top||fighter.y>RIVER.bottom);
  }
});

test('Desert cycle pairs each hazard and fixed mirages use the match weapon',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT,mode:GAME_MODES.CHOOSE_FIXED,weapon:'nuclear'});
  m.obstacles.forEach(o=>o.destroyed=true);
  m.startEnvironmentEvent();assert.ok(m.sandstorm&&(m.sandstorm.y<0||m.sandstorm.y>940));
  m.startEnvironmentEvent();assert.deepEqual(m.eagles.map(e=>e.owner),[0,1]);
  m.startEnvironmentEvent();assert.deepEqual(m.quicksand.map(e=>e.owner),[0,1]);
  m.startEnvironmentEvent();assert.deepEqual(m.mirages.map(e=>e.owner),[0,1]);
  for(const lure of m.mirages)if(lure.type!=='syringe')assert.equal(lure.type,'nuclear');
});

test('both sandstorm waves obscure visibility and leave the arena together',()=>{
  for(const direction of [-1,1]){
    const storm={y:470,direction};
    assert.ok(sandstormCovers(storm,470));
    assert.ok(sandstormCovers(storm,470-direction*SANDSTORM_WAVE_GAP));
    assert.equal(sandstormCovers(storm,470+direction*250),false);
  }
  const m=new Match(()=>.25,{map:MAPS.DESERT});m.startEnvironmentEvent();
  m.updateEnvironment(m.sandstorm.life);
  assert.equal(m.sandstorm,null);
});

test('quicksand reaches farther and pulls a fighter toward its center',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];
  m.obstacles.forEach(o=>o.destroyed=true);
  m.environmentCycle=2;m.startEnvironmentEvent();
  assert.ok(m.quicksand.every(patch=>patch.radius===PHASE6_RULES.quicksandRadius));
  m.quicksand=[{id:99,owner:0,x:p.x+45,y:p.y,age:0,open:0,occupied:false,radius:PHASE6_RULES.quicksandRadius}];
  const x=p.x;m.updateEnvironment(.2);
  assert.ok(p.x>x+5);
  assert.equal(m.quicksand[0].occupied,true);
});

test('quicksand slows but dodge still moves and eagle contact respects invincibility',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.quicksand=[{id:99,owner:0,x:p.x,y:p.y,age:1.5,open:0,occupied:false,radius:38}];
  const x=p.x;m.move(p,1,0,.1);assert.ok(p.x-x<12);
  assert.equal(m.dodge(p,1,0),true);const next=p.x;m.move(p,1,0,.1);assert.ok(p.x-next>12);
  m.environmentCycle=1;m.startEnvironmentEvent();
  const eagle=m.eagles[0];eagle.target1={x:p.x,y:p.y};eagle.target=eagle.target1;
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.005;
  const hp=p.hp;m.updateEnvironment(1/120);assert.equal(p.hp,hp);
});

test('eagle dives at a locked shadow circle and hits only once',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.environmentCycle=1;m.startEnvironmentEvent();
  const eagle=m.eagles[0];eagle.target1={x:p.x,y:p.y};eagle.target=eagle.target1;
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.01;
  m.updateEnvironment(.02);assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
  m.updateEnvironment(.02);assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
});

test('second eagle pass retargets the fighter after the first pass',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const eagle=m.eagles[0],p=m.players[0];
  assert.equal(eagle.target2,null);
  eagle.target1={x:p.x,y:p.y};eagle.firstDone=true;
  p.x=300;eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive+EAGLE_FLIGHT.recover-.01;
  m.updateEnvironment(.02);
  assert.ok(Math.abs(eagle.target2.x-300)<21);
});

test('each eagle dive emits an attack cue even when its first strike misses',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const eagle=m.eagles[0];
  eagle.age=EAGLE_FLIGHT.approach-.01;m.updateEnvironment(.02);
  assert.equal(m.events.filter(event=>event.type==='eagleAttack'&&event.player===0).length,1);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.01;m.updateEnvironment(.02);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive+EAGLE_FLIGHT.recover-.01;m.updateEnvironment(.02);
  assert.equal(m.events.filter(event=>event.type==='eagleAttack'&&event.player===0).length,2);
});

test('both eagle passes can strike the same fighter after separate warnings',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const p=m.players[0],eagle=m.eagles[0];
  eagle.target1={x:p.x,y:p.y};eagle.target=eagle.target1;
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive+EAGLE_FLIGHT.recover-.01;m.updateEnvironment(.02);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive*2+EAGLE_FLIGHT.recover-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100-2*PHASE6_RULES.eagleDamage);
});

test('the eagle still makes its second dive when the first misses',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const p=m.players[0],eagle=m.eagles[0];
  eagle.target1={x:p.x+100,y:p.y};eagle.target=eagle.target1;
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100);assert.equal(m.eagles.length,2);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive+EAGLE_FLIGHT.recover-.01;m.updateEnvironment(.02);
  assert.ok(Math.abs(eagle.target2.x-p.x)<21);
  eagle.age=EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive*2+EAGLE_FLIGHT.recover-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
});

test('quicksand remains after the fighter leaves and closes without cycling',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.quicksand=[{id:1,owner:0,x:p.x,y:p.y,age:0,open:0,occupied:false,radius:38}];
  for(let i=0;i<65;i++)m.updateEnvironment(1/120);
  assert.ok(m.quicksand[0].open>.9);
  p.x+=90;
  for(let i=0;i<120;i++)m.updateEnvironment(1/120);
  assert.equal(m.quicksand.length,1);assert.equal(m.quicksand[0].open,0);
  for(let i=0;i<600;i++)m.updateEnvironment(1/120);
  assert.equal(m.quicksand[0].open,0);
});

test('scorpion bite has a windup and can be dodged',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.mirages=[{id:1,owner:0,x:p.x,y:p.y,type:'rifle',age:2,warning:2,life:12,state:'lure',strikeAge:0}];
  m.updateEnvironment(1/120);assert.equal(m.mirages[0].state,'strike');assert.equal(p.hp,100);
  assert.equal(m.dodge(p,1,0),true);
  m.updateEnvironment(PHASE6_RULES.scorpionWindup+.01);assert.equal(p.hp,100);
});

test('a mirage bites and briefly staggers an armed fighter',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];p.slot={type:'rifle',ammo:4};
  m.mirages=[{id:1,owner:0,x:p.x+34,y:p.y,type:'missile',age:2,warning:2,life:12,state:'lure',strikeAge:0}];
  m.updateEnvironment(1/120);assert.equal(m.mirages[0].state,'strike');assert.equal(p.slot.ammo,4);
  m.updateEnvironment(PHASE6_RULES.scorpionWindup+.01);
  assert.equal(p.hp,100-PHASE6_RULES.scorpionDamage);
  assert.equal(p.stun,PHASE6_RULES.scorpionStagger);
  assert.equal(m.mirages[0].state,'retreat');
  assert.equal(m.events.filter(event=>event.type==='scorpionBite').length,1);
});

test('the armed computer can still pursue a mirage',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[1];m.obstacles.forEach(o=>o.destroyed=true);
  p.slot={type:'rifle',ammo:4};
  const lure={id:1,owner:1,x:p.x+40,y:p.y+30,type:'missile',state:'lure',age:3,warning:2,life:12,aiInterested:true};
  m.mirages=[lure];m.think(1/120);
  assert.deepEqual(m.aiTarget,{x:lure.x,y:lure.y});
});

test('Snow starts with two ice patches per bank and pairs avalanche and hail',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW});
  assert.deepEqual([0,1].map(owner=>m.icePatches.filter(p=>p.owner===owner).length),[2,2]);
  m.startEnvironmentEvent();assert.deepEqual(m.avalanches.map(a=>a.owner),[0,1]);
  assert.deepEqual(m.avalanches.map(a=>a.direction),[-1,1]);
  assert.ok(m.avalanches.every(a=>a.y<BANK_BOUNDS[a.owner].minY||a.y>BANK_BOUNDS[a.owner].maxY));
  m.startEnvironmentEvent();assert.deepEqual([0,1].map(owner=>m.hail.filter(h=>h.owner===owner).length),[6,6]);
  assert.ok(m.hail.every(h=>Math.abs(h.direction)===1));
  for(const owner of [0,1]){
    const groups=Map.groupBy(m.hail.filter(h=>h.owner===owner),h=>h.cloudId);
    assert.equal(groups.size,2,'each bank has two passing clouds');
    for(const strikes of groups.values()){
      assert.equal(strikes.length,3,'each cloud drops three separate icicle clusters');
      assert.ok(strikes.every(h=>h.cloudLife-h.cloudStart===HAIL_CLUSTER.cloudDuration));
      assert.ok(strikes[0].warning<strikes[1].warning&&strikes[1].warning<strikes[2].warning,'the strikes follow the cloud across the bank');
    }
  }
  for(const item of [...m.icePatches,...m.hail])assert.ok(item.y>=BANK_BOUNDS[item.owner].minY&&item.y<=BANK_BOUNDS[item.owner].maxY);
});

test('ice preserves a short steerable slide and does not leave its bank',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.icePatches=[{id:1,owner:0,x:p.x,y:p.y,radius:39}];
  for(let i=0;i<25;i++)m.move(p,1,0,1/120);
  assert.ok(p.iceSpray>0,'entering the slick snow triggers a short spray');
  const edge=m.icePatches[0].x+m.icePatches[0].radius*1.18+2;
  while(p.x<edge)m.move(p,1,0,1/120);
  const x=p.x;m.move(p,0,0,1/120);
  assert.ok(p.x>x);
  const start=p.x;for(let i=0;i<18;i++)m.move(p,0,0,1/120);
  assert.ok(p.x-start>10,'ice carries the fighter well beyond the patch');
  for(let i=0;i<100;i++)m.move(p,0,-1,1/120);
  assert.ok(p.y>=BANK_BOUNDS[0].minY);
});

test('three marked icicles land in sequence but deal at most one hit per cluster',()=>{
  assert.equal(HAIL_CLUSTER.offsets.length,3);
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  const target={id:1,owner:0,x:220,y:760,age:.99,start:0,warning:1,life:2,hit:false};
  m.hail=[target];p.x=236;p.y=760;
  m.updateEnvironment(.02);
  assert.equal(p.hp,100,'the first icicle misses the fighter at the second landing point');
  m.updateEnvironment(.1);
  assert.equal(p.hp,100-PHASE6_RULES.hailDamage,'the second icicle hits inside its marked area');
  m.updateEnvironment(.12);
  assert.equal(p.hp,100-PHASE6_RULES.hailDamage,'the third icicle cannot repeat the cluster damage');
  assert.equal(target.hit,true);
});

test('snow hazard sounds follow the avalanche front and each falling icicle cluster',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW});
  m.environmentCycle=0;m.startEnvironmentEvent();
  assert.equal(m.events.filter(e=>e.type==='avalanche').length,1);
  m.events=[];
  m.updateEnvironment(AVALANCHE.warning-.01);
  assert.equal(m.events.filter(e=>e.type==='avalancheRush').length,0);
  m.updateEnvironment(.02);
  assert.equal(m.events.filter(e=>e.type==='avalancheRush').length,1,'the paired front gets one sweep cue');
  m.updateEnvironment(.1);
  assert.equal(m.events.filter(e=>e.type==='avalancheRush').length,1);

  m.avalanches=[];m.hail=[];m.environmentCycle=1;m.startEnvironmentEvent();m.events=[];
  const first=m.hail.reduce((a,b)=>a.warning<b.warning?a:b);
  m.updateEnvironment(first.warning-HAIL_CLUSTER.fall-.01);
  assert.equal(m.events.filter(e=>e.type==='hailFall').length,0);
  m.updateEnvironment(.02);
  assert.ok(m.events.some(e=>e.type==='hailFall'&&e.x===first.x));
  m.updateEnvironment(HAIL_CLUSTER.fall);
  assert.ok(m.events.some(e=>e.type==='hailImpact'&&e.x===first.x+HAIL_CLUSTER.offsets[0][0]));
});

test('ice locks the entry direction on both axes until the fighter leaves the patch',()=>{
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
    p.x=220;p.y=760;p.iceVX=0;p.iceVY=0;p.iceSlip=0;
    m.icePatches=[{id:1,owner:0,x:p.x,y:p.y,radius:100}];
    for(let i=0;i<18;i++)m.move(p,dx,dy,1/120);
    assert.ok((p.x-220)*dx+(p.y-760)*dy>5,`ice movement follows ${dx},${dy}`);
    if(dx&&dy)assert.ok(Math.abs(Math.abs(p.x-220)-Math.abs(p.y-760))<2,'diagonal slide keeps its heading');
  }
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  p.x=220;p.y=760;p.iceVX=0;p.iceVY=0;p.iceSlip=0;
  m.icePatches=[{id:1,owner:0,x:p.x,y:p.y,radius:100}];
  for(let i=0;i<18;i++)m.move(p,1,0,1/120);
  const entryX=p.x;
  for(let i=0;i<25;i++)m.move(p,-1,0,1/120);
  assert.ok(p.x>entryX+20,'opposite input cannot reverse an active ice slide');
  for(let i=0;i<90&&p.onIce;i++)m.move(p,-1,0,1/120);
  assert.equal(p.onIce,false,'the fighter slides off the patch');
  const exitX=p.x;
  for(let i=0;i<32;i++)m.move(p,-1,0,1/120);
  assert.ok(p.x<exitX-3,'steering returns after leaving the ice');
  p.x=220;p.y=760;p.onIce=false;p.iceSlip=0;p.moving=true;
  p.lastMoveX=0;p.lastMoveY=-1;
  m.move(p,1,0,1/120);
  assert.ok(p.y<760&&Math.abs(p.x-220)<1,'entry follows actual travel even if the joystick changes on contact');
});

test('avalanche keeps pushing toward the river, damages once, and a dodge escapes its front',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  const bank=BANK_BOUNDS[0],start=bank.maxY+AVALANCHE.edge,end=bank.minY-AVALANCHE.edge;
  const age=AVALANCHE.warning+(p.y-start)/(end-start)*(AVALANCHE.life-AVALANCHE.warning);
  m.avalanches=[{id:1,owner:0,x:p.x,y:p.y,direction:-1,age,warning:AVALANCHE.warning,life:AVALANCHE.life,hit:false}];
  const beforeY=p.y;
  m.updateEnvironment(1/120);
  assert.equal(p.hp,100-PHASE6_RULES.avalancheDamage);
  assert.ok(p.y<beforeY&&p.y>=bank.minY,'avalanche pushes the southern fighter toward the river');
  const after=p.hp,firstPush=p.y;m.updateEnvironment(1/120);assert.equal(p.hp,after);
  assert.ok(p.y<firstPush,'the wave continues to push while overlapping');
  const evasion=new Match(()=>.5,{map:MAPS.SNOW}),dodger=evasion.players[0];evasion.obstacles.forEach(o=>o.destroyed=true);
  const dodgeAge=AVALANCHE.warning+(dodger.y-start)/(end-start)*(AVALANCHE.life-AVALANCHE.warning);
  evasion.avalanches=[{id:3,owner:0,x:dodger.x,y:dodger.y,direction:-1,age:dodgeAge,warning:AVALANCHE.warning,life:AVALANCHE.life,hit:false}];
  assert.equal(evasion.dodge(dodger,1,0),true);
  const dodgeY=dodger.y;evasion.updateEnvironment(1/120);
  assert.equal(dodger.hp,100);assert.equal(dodger.y,dodgeY);
  dodger.dodgeTime=0;evasion.updateEnvironment(.05);
  assert.equal(dodger.hp,100);assert.equal(dodger.y,dodgeY,'dodging the front avoids its later push');
  const north=new Match(()=>.5,{map:MAPS.SNOW}),opponent=north.players[1];north.obstacles.forEach(o=>o.destroyed=true);
  const northBank=BANK_BOUNDS[1],northStart=northBank.minY-AVALANCHE.edge,northEnd=northBank.maxY+AVALANCHE.edge;
  const northAge=AVALANCHE.warning+(opponent.y-northStart)/(northEnd-northStart)*(AVALANCHE.life-AVALANCHE.warning);
  north.avalanches=[{id:4,owner:1,x:opponent.x,y:opponent.y,direction:1,age:northAge,warning:AVALANCHE.warning,life:AVALANCHE.life,hit:false}];
  const northY=opponent.y;north.updateEnvironment(1/120);
  assert.ok(opponent.y>northY&&opponent.y<=northBank.maxY,'the northern wave also pushes toward the river');
  m.hail=[{id:2,owner:0,x:p.x,y:p.y,age:1.14,start:0,warning:1.15,life:1.7,hit:false}];
  m.updateEnvironment(.02);assert.equal(p.hp,after-PHASE6_RULES.hailDamage);
  m.updateEnvironment(.02);assert.equal(p.hp,after-PHASE6_RULES.hailDamage);
});
