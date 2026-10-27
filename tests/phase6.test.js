import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MAPS,MAP_TYPES,GAME_MODES,BANK_BOUNDS,RIVER,PHASE6_RULES} from '../src/model.js';

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
  m.startEnvironmentEvent();assert.deepEqual(m.eagles.map(e=>[e.owner,e.pass]),[[0,0],[0,1],[1,0],[1,1]]);
  m.startEnvironmentEvent();assert.deepEqual(m.quicksand.map(e=>e.owner),[0,1]);
  m.startEnvironmentEvent();assert.deepEqual(m.mirages.map(e=>e.owner),[0,1]);
  for(const lure of m.mirages)if(lure.type!=='syringe')assert.equal(lure.type,'nuclear');
});

test('quicksand slows but dodge still moves and eagle contact respects invincibility',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.quicksand=[{id:99,owner:0,x:p.x,y:p.y,age:1.5,open:0,occupied:false,radius:38}];
  const x=p.x;m.move(p,1,0,.1);assert.ok(p.x-x<12);
  assert.equal(m.dodge(p,1,0),true);const next=p.x;m.move(p,1,0,.1);assert.ok(p.x-next>12);
  m.eagles=[{id:100,owner:0,x:p.x,y:p.y,start:0,targeted:true,age:PHASE6_RULES.eagleWarning-.005,warning:PHASE6_RULES.eagleWarning,life:2.5,hit:false}];
  const hp=p.hp;m.updateEnvironment(1/120);assert.equal(p.hp,hp);
});

test('eagle dives at a locked shadow circle and hits only once',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.eagles=[{id:100,owner:0,x:p.x,y:p.y,start:0,targeted:true,age:PHASE6_RULES.eagleWarning-.01,warning:PHASE6_RULES.eagleWarning,life:2.5,hit:false}];
  m.updateEnvironment(.02);assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
  m.updateEnvironment(.02);assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
  const second={id:101,owner:0,x:p.x+100,y:p.y,start:0,targeted:true,age:PHASE6_RULES.eagleWarning-.01,warning:PHASE6_RULES.eagleWarning,life:2.5,hit:false};
  m.eagles=[second];m.updateEnvironment(.02);assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
});

test('second eagle pass retargets the fighter after the first pass',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const second=m.eagles.find(e=>e.owner===0&&e.pass===1),p=m.players[0];
  assert.equal(second.targeted,false);
  p.x=300;second.age=second.start-.01;
  m.updateEnvironment(.02);
  assert.equal(second.targeted,true);assert.ok(Math.abs(second.x-300)<21);
});

test('both eagle passes can strike the same fighter after separate warnings',()=>{
  const m=new Match(()=>.5,{map:MAPS.DESERT});m.environmentCycle=1;m.startEnvironmentEvent();
  const p=m.players[0],dives=m.eagles.filter(e=>e.owner===0);
  dives[0].age=dives[0].warning-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100-PHASE6_RULES.eagleDamage);
  dives[1].age=dives[1].start-.01;m.updateEnvironment(.02);
  dives[1].age=dives[1].start+dives[1].warning-.01;m.updateEnvironment(.02);
  assert.equal(p.hp,100-2*PHASE6_RULES.eagleDamage);
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
  m.startEnvironmentEvent();assert.deepEqual([0,1].map(owner=>m.hail.filter(h=>h.owner===owner).length),[3,3]);
  for(const item of [...m.icePatches,...m.hail])assert.ok(item.y>=BANK_BOUNDS[item.owner].minY&&item.y<=BANK_BOUNDS[item.owner].maxY);
});

test('ice preserves a short steerable slide and does not leave its bank',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.icePatches=[{id:1,owner:0,x:p.x,y:p.y,radius:39}];
  for(let i=0;i<25;i++)m.move(p,1,0,1/120);
  const edge=m.icePatches[0].x+m.icePatches[0].radius*1.18+2;
  while(p.x<edge)m.move(p,1,0,1/120);
  const x=p.x;m.move(p,0,0,1/120);
  assert.ok(p.x>x);
  for(let i=0;i<100;i++)m.move(p,0,-1,1/120);
  assert.ok(p.y>=BANK_BOUNDS[0].minY);
});

test('avalanche damages once and hail has a bounded single impact',()=>{
  const m=new Match(()=>.5,{map:MAPS.SNOW}),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);
  m.avalanches=[{id:1,owner:0,x:p.x,y:p.y,direction:1,age:1.15+(p.x+85)/(480+170)*(4.6-1.15),warning:1.15,life:4.6,hit:false}];
  m.updateEnvironment(1/120);
  assert.equal(p.hp,100-PHASE6_RULES.avalancheDamage);
  const after=p.hp;m.updateEnvironment(1/120);assert.equal(p.hp,after);
  m.hail=[{id:2,owner:0,x:p.x,y:p.y,age:1.14,start:0,warning:1.15,life:1.7,hit:false}];
  m.updateEnvironment(.02);assert.equal(p.hp,after-PHASE6_RULES.hailDamage);
  m.updateEnvironment(.02);assert.equal(p.hp,after-PHASE6_RULES.hailDamage);
});
