import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, WEAPONS, RIVER, BANK_BOUNDS, TOWER_TIMING, TOWER_ACTIVE_HEIGHT, TOWER_GEOMETRY, TOWER_BASE_Y, DEATH_DURATION, FLAME_SPEED, towerShieldBounds, towerBodyBounds, towerArmExtension, segmentTowerHit, segmentRectHit, segmentDistance } from '../src/model.js';

test('pickups respect ownership, landing, capacity, and never replace occupied slots',()=>{
  const m=new Match(()=>.5),p=m.players[0];
  const item={owner:0,type:'rifle',x:p.x,y:p.y,flight:0,ttl:12};
  assert.equal(m.collect(p,{...item,owner:1}),false);
  assert.equal(m.collect(p,{...item,flight:.1}),false);
  for(let i=0;i<3;i++)assert.equal(m.collect(p,{...item}),true);
  const before=structuredClone(p.slots);
  assert.equal(m.collect(p,{...item,type:'laser'}),false);
  assert.deepEqual(p.slots,before);
  assert.equal(p.selected,-1,'pickup does not silently select a weapon');
  assert.deepEqual(m.events[0],{type:'pickup',player:0,weapon:'rifle'});
});

test('spending final shot frees the slot and restores unlimited pistol',()=>{
  const m=new Match(),p=m.players[0];p.slots[1]={type:'shotgun',ammo:1};m.select(p,1);
  assert.equal(m.fire(p),true);assert.equal(p.slots[1],null);assert.equal(m.weapon(p),'pistol');
  p.cooldown=0;m.fire(p);assert.equal(p.slots.filter(Boolean).length,0);
  assert.equal(m.bullets.length,6);
});

test('each launch creates a pair with independent rolls and valid bank positions',()=>{
  let i=0;const values=[.01,.1,.2,.99,.8,.9];const m=new Match(()=>values[i++%values.length]);m.launch();
  assert.equal(m.pickups.length,2);assert.equal(m.pickups[0].type,'rifle');assert.equal(m.pickups[1].type,'laser');
  assert.ok(m.pickups[0].y>RIVER.bottom);assert.ok(m.pickups[1].y<RIVER.top);
  for(const item of m.pickups)assert.ok(item.y>=BANK_BOUNDS[item.owner].minY+20&&item.y<=BANK_BOUNDS[item.owner].maxY-20);
  assert.equal(m.pickups[0].sx,RIVER.x-51);assert.equal(m.pickups[1].sx,RIVER.x+51);
  assert.equal(m.pickups[0].sy,RIVER.y-78);assert.equal(m.pickups[1].sy,RIVER.y-78);
  assert.equal(m.pickups[0].flight,m.pickups[1].flight);
});

test('a thrown weapon lands with one visible and audible impact',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.pickups=[{id:1,owner:0,type:'rifle',x:50,y:470,flight:.02,ttl:12}];
  for(let i=0;i<10;i++)m.update(1/120);
  assert.equal(m.events.filter(e=>e.type==='landing').length,1);
  assert.equal(m.effects.filter(e=>e.type==='landing').length,1);
  assert.equal(m.pickups[0].ttl<12,true);
});

test('weapons expire twelve seconds after landing, not during flight',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.pickups=[{id:1,owner:0,type:'rifle',x:50,y:470,flight:.75,ttl:12}];
  for(let i=0;i<60;i++)m.update(1/120);
  assert.equal(m.pickups[0].ttl,12);
  for(let i=0;i<60;i++)m.update(1/120);
  assert.ok(m.pickups[0].ttl>11.7);
  for(let i=0;i<1500;i++)m.update(1/120);
  assert.equal(m.pickups.length,0);
});

test('tower retaliates once, shield absorbs more hits, submerged cap cannot block',()=>{
  const m=new Match();assert.equal(m.hitTower(0),false);
  m.tower.phase='rise';m.tower.height=.6;
  assert.equal(m.hitTower(0),true);assert.equal(m.tower.shield,true);assert.equal(m.flames.length,2);
  assert.ok(Math.abs(m.flames[0].dx+m.flames[1].dx)<1e-8);assert.ok(Math.abs(m.flames[0].dy+m.flames[1].dy)<1e-8);
  m.hitTower(1);m.tower.phase='lower';m.hitTower(1);assert.equal(m.flames.length,2);
  m.tower.progress=TOWER_TIMING.lower-.01;m.updateTower(.02);assert.equal(m.tower.phase,'rest');assert.equal(m.tower.shield,false);assert.equal(m.hitTower(0),false);
});

test('shield geometry encloses the base while active',()=>{
  for(const height of [0,.04,.5,1]){
    const bounds=towerShieldBounds({height});
    assert.equal(bounds.y+bounds.ry,TOWER_BASE_Y+56);
    assert.ok(bounds.rx>=86);
    assert.ok(bounds.y-bounds.ry<TOWER_BASE_Y-50);
  }
});

test('tower impact belongs to the exposed shaft, not its submerged base',()=>{
  const tower={height:1};
  const body=towerBodyBounds(tower);
  assert.ok(body.top<RIVER.top&&body.bottom<TOWER_BASE_Y);
  assert.equal(segmentRectHit({x:RIVER.x,y:500},{x:RIVER.x,y:0},body).y,body.bottom);
  assert.equal(segmentRectHit({x:RIVER.x,y:500},{x:RIVER.x,y:345},body),null);
  assert.equal(towerBodyBounds({height:.1}),null);
  assert.ok(TOWER_ACTIVE_HEIGHT<(TOWER_GEOMETRY.shaftBaseY-TOWER_GEOMETRY.apertureTop)/TOWER_GEOMETRY.shaftHeight);
  assert.equal(towerBodyBounds({height:TOWER_ACTIVE_HEIGHT}),null);
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.tower.phase='deliver';m.tower.height=1;m.players[0].x=RIVER.x;
  m.fire(m.players[0]);for(let i=0;i<65;i++)m.update(1/120);
  const impact=m.effects.find(e=>e.type==='towerImpact');
  assert.ok(impact&&impact.y<=body.bottom&&impact.y>=body.top);
  assert.equal(m.effects.filter(e=>e.type==='towerImpact').length,1);
});

test('visible launcher arms absorb shots only while they are extended',()=>{
  const tower={phase:'deliver',height:1,progress:0};
  const start={x:RIVER.x+65,y:460},end={x:start.x,y:0};
  assert.equal(towerArmExtension(tower),1);
  const impact=segmentTowerHit(start,end,tower);
  assert.ok(impact&&impact.y<TOWER_GEOMETRY.apertureTop);
  tower.progress=TOWER_TIMING.deliver-.1;
  assert.equal(towerArmExtension(tower),0);
  assert.equal(segmentTowerHit(start,end,tower),null);
  assert.ok(segmentTowerHit({x:RIVER.x,y:460},{x:RIVER.x,y:0},tower));
});

test('opposing rounds cancel before either can damage a player on the crossing frame',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;
  const shot=(owner,y,vy)=>({id:owner,owner,type:'pistol',x:RIVER.x,y,vx:0,vy,damage:5,color:0xffdc80,life:1,travel:0});
  m.players[1].x=RIVER.x;
  m.bullets=[shot(0,154,-690),shot(1,122,690)];
  m.update(1/30);
  assert.equal(m.players[1].hp,100);
  assert.equal(m.bullets.length,0);
  assert.ok(m.effects.some(e=>e.type==='spark'));
});

test('blood and blast marks remain after their smoke and sparks fade',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.damage(m.players[0],5);
  m.explode({x:300,y:150,owner:0,type:'grenade',damage:0,life:1});
  assert.ok(m.marks.some(mark=>mark.type==='blood'));
  assert.ok(m.marks.some(mark=>mark.type==='scorch'));
  assert.ok(m.effects.some(e=>e.type==='smoke'));
  for(let i=0;i<320;i++)m.update(1/120);
  assert.equal(m.effects.some(e=>e.type==='smoke'),false);
  assert.ok(m.marks.some(mark=>mark.type==='blood'));
  assert.ok(m.marks.some(mark=>mark.type==='scorch'));
});

test('a shot striking the tower during weapon delivery fires one paired retaliation',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.tower.phase='deliver';m.tower.height=1;m.launch();
  const p=m.players[0];p.x=RIVER.x;
  assert.equal(m.fire(p),true);
  for(let i=0;i<60;i++)m.update(1/120);
  assert.equal(m.tower.phase,'deliver');assert.equal(m.tower.shield,true);
  assert.equal(m.flames.length,2);assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
  assert.equal(m.fire(p),true);
  for(let i=0;i<60;i++)m.update(1/120);
  assert.equal(m.flames.length,2);assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
});

test('delivery hit triggers one fire retaliation, then the shield absorbs later shots',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;
  m.tower.phase='deliver';m.tower.height=1;
  assert.equal(m.hitTower(0),true);assert.equal(m.tower.shield,true);assert.equal(m.flames.length,2);
  assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
  const p=m.players[0],enemy=m.players[1];p.x=enemy.x=320;p.y=470;
  assert.equal(m.fire(p),true);
  for(let i=0;i<30;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);assert.equal(enemy.hp,100);
  assert.equal(m.flames.length,2);
  assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
  assert.ok(m.effects.some(e=>e.type==='shieldHit'&&e.x>300&&e.y>350));
  p.slots[0]={type:'laser',ammo:1};p.selected=0;p.cooldown=0;
  m.fire(p,1);
  assert.ok(m.beams.at(-1).endY>350&&m.beams.at(-1).endY<400);
  assert.equal(enemy.hp,100);
  m.flames=[]; // Isolate the submerged-cap check from the firing hold.
  m.tower.phase='lower';m.tower.progress=TOWER_TIMING.lower-.4;m.tower.height=TOWER_ACTIVE_HEIGHT+.01;
  m.tower.shield=true;m.updateTower(1/120);
  assert.ok(m.tower.height<TOWER_ACTIVE_HEIGHT);
  assert.equal(m.tower.shield,false,'shield disappears once the tower head is submerged');
  assert.equal(m.hitTower(0),false);
  p.x=enemy.x=RIVER.x+65;p.cooldown=0;p.selected=-1;
  m.fire(p);
  for(let i=0;i<90;i++)m.update(1/120);
  assert.equal(enemy.hp,95,'the submerged tower no longer blocks a shot');
});

test('tower moves continuously through a slower cycle and launches exactly once at full height',()=>{
  const m=new Match(()=>.5);m.time=2.5;
  let previous=0,maxStep=0;
  for(let i=0;i<120;i++){m.updateTower(1/120);assert.ok(m.tower.height>=previous);maxStep=Math.max(maxStep,m.tower.height-previous);previous=m.tower.height;}
  assert.equal(m.launches,0);assert.ok(m.tower.height<.4,'tower is still emerging after one second');
  while(m.tower.phase==='rise'){m.updateTower(1/120);maxStep=Math.max(maxStep,m.tower.height-previous);previous=m.tower.height;}
  assert.ok(maxStep<.01,'no discontinuous jumps');assert.equal(m.tower.height,1);assert.equal(m.launches,1);
  m.hitTower(0); // The first delivery hit raises the shield and fires once.
  assert.equal(m.tower.shield,true);assert.equal(m.flames.length,2);
  while(m.tower.phase==='deliver')m.updateTower(1/120);
  m.hitTower(0);assert.equal(m.tower.shield,true);assert.equal(m.flames.length,2);
  previous=1;
  while(m.tower.phase==='lower'){m.updateTower(1/120);assert.ok(m.tower.height<=previous+1e-10);assert.ok(previous-m.tower.height<.01);previous=m.tower.height;}
  assert.equal(m.tower.height,0);assert.equal(m.tower.shield,false);assert.equal(m.launches,1);
});

test('base vents keep firing while the shaft descends',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.tower.phase='lower';m.tower.height=.8;m.tower.progress=1;
  m.hitTower(0);
  const sources=m.flames.map(({x,y})=>({x,y}));
  m.update(1/120);
  assert.ok(m.tower.progress>1);
  assert.ok(m.flames.some(f=>f.endAge===null));
  for(let i=0;i<300&&m.flames.some(f=>f.endAge===null);i++)m.update(1/120);
  assert.deepEqual(m.flames.map(({x,y})=>({x,y})),sources,'fire remains attached to the stationary base');
  assert.ok(m.flames.every(f=>f.endAge!==null),'both fronts reach the arena edge');
  assert.ok(m.tower.height<.8,'shaft descent continues during retaliation');
});

test('retaliation uses the same base ports at every tower height',()=>{
  for(const height of [.35,.7,1]){
    const m=new Match(()=>.5);m.tower.phase='rise';m.tower.height=height;
    assert.equal(m.hitTower(0),true);
    assert.deepEqual(m.flames.map(({x,y})=>({x,y})),[
      {x:RIVER.x+TOWER_GEOMETRY.fireVentOffsetX,y:TOWER_GEOMETRY.fireVentY},
      {x:RIVER.x-TOWER_GEOMETRY.fireVentOffsetX,y:TOWER_GEOMETRY.fireVentY},
    ]);
  }
});

test('tower flames advance through space instead of hitting entire banks instantly',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;m.tower.phase='rise';m.tower.height=.5;
  m.hitTower(0);assert.equal(m.flames[0].reach,0);m.update(1/120);
  assert.ok(m.flames[0].reach>0&&m.flames[0].reach<10);assert.equal(m.players[0].hp,100);
  assert.equal(m.flames[0].reach,FLAME_SPEED/120);
  assert.ok(m.flames.every(f=>f.x!==RIVER.x&&f.y===TOWER_GEOMETRY.fireVentY),'both shots start at fixed base vents');
  for(let i=0;i<60;i++)m.update(1/120);
  assert.ok(m.flames.every(f=>f.endAge===null),'the vents keep firing while the fronts travel');
  for(let i=0;i<460;i++)m.update(1/120);
  assert.equal(m.flames.length,0);
  assert.ok(m.effects.some(e=>e.type==='smoke'),'smoke lingers after the jets expire');
  assert.ok(m.marks.some(mark=>mark.type==='scorch'),'the fire leaves marks on the banks');
});

test('grenades and missiles capture opponent position and do not home after firing',()=>{
  const m=new Match(),p=m.players[0],enemy=m.players[1];p.slots[0]={type:'grenade',ammo:3};p.selected=0;m.fire(p);
  const target={x:enemy.x,y:enemy.y};enemy.x+=100;assert.equal(m.bullets[0].tx,target.x);assert.equal(m.bullets[0].ty,target.y);
  p.slots[0]={type:'missile',ammo:2};p.cooldown=0;m.fire(p);const b=m.bullets.at(-1),vx=b.vx,vy=b.vy;
  enemy.x-=200;m.think=()=>{};m.update(1/120);assert.equal(b.vx,vx);assert.equal(b.vy,vy);
});

test('smart missiles clear the raised tower and shield before striking their marked target',()=>{
  const m=new Match(),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  p.x=enemy.x=RIVER.x;m.tower.phase='deliver';m.tower.height=1;m.tower.shield=true;
  p.slots[0]={type:'missile',ammo:1};p.selected=0;m.fire(p);
  for(let i=0;i<150;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);
  assert.equal(enemy.hp,70);
  assert.equal(m.effects.some(e=>e.type==='shieldHit'),false);
});

test('grenades arc over the raised tower and shield before landing',()=>{
  const m=new Match(),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  p.x=enemy.x=RIVER.x;m.tower.phase='deliver';m.tower.height=1;m.tower.shield=true;
  p.slots[0]={type:'grenade',ammo:1};p.selected=0;m.fire(p);
  for(let i=0;i<120;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);
  assert.equal(enemy.hp,74);
  assert.equal(m.effects.some(e=>e.type==='shieldHit'),false);
});

test('charged laser creates a straight sustained beam and a switch cancels charge',()=>{
  const m=new Match(),p=m.players[0];p.slots[0]={type:'laser',ammo:2};p.selected=0;m.fire(p,1);
  assert.equal(m.beams.length,1);assert.equal(m.beams[0].x,p.x);assert.equal(m.beams[0].endY,0);
  p.charge=.8;m.select(p,0);assert.equal(p.charge,0);assert.equal(m.weapon(p),'pistol');
});

test('movement stays on each bank and diagonal speed is normalized',()=>{
  const m=new Match(),p=m.players[0],start={x:p.x,y:p.y};m.move(p,1,1,.1);
  assert.ok(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-17)<1e-8);
  assert.equal(BANK_BOUNDS[0].maxY-BANK_BOUNDS[0].minY,BANK_BOUNDS[1].maxY-BANK_BOUNDS[1].minY);
  assert.equal(BANK_BOUNDS[0].maxY-BANK_BOUNDS[0].minY+BANK_BOUNDS[1].maxY-BANK_BOUNDS[1].minY,444);
  assert.equal(BANK_BOUNDS[0].minY+BANK_BOUNDS[1].maxY,710);
  assert.equal(BANK_BOUNDS[0].maxY+BANK_BOUNDS[1].minY,710);
  m.move(p,-100,-100,100);assert.equal(p.y,BANK_BOUNDS[0].minY);assert.ok(p.x>=38);
  m.move(p,100,100,100);assert.equal(p.y,BANK_BOUNDS[0].maxY);
  m.move(m.players[1],-100,-100,100);assert.equal(m.players[1].y,BANK_BOUNDS[1].minY);
  m.move(m.players[1],100,100,100);assert.equal(m.players[1].y,BANK_BOUNDS[1].maxY);
});

test('fast projectiles use swept collision rather than skipping targets',()=>{
  assert.equal(segmentDistance({x:10,y:15},{x:10,y:0},{x:10,y:30}),0);
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;const enemy=m.players[1];
  m.bullets=[{id:1,x:enemy.x,y:enemy.y+20,vx:0,vy:-5000,owner:0,type:'rifle',damage:30,color:0,life:1,travel:0,targetDistance:Infinity}];
  m.update(1/120);assert.equal(enemy.hp,70);assert.equal(m.bullets.length,0);
});

test('opposing conventional rounds cancel when their swept paths cross',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;
  m.bullets=[
    {id:1,x:180,y:320,vx:0,vy:900,owner:1,type:'pistol',damage:5,color:0,life:1,travel:0,targetDistance:Infinity},
    {id:2,x:180,y:332,vx:0,vy:-900,owner:0,type:'rifle',damage:7,color:0,life:1,travel:0,targetDistance:Infinity}
  ];
  m.update(1/120);assert.equal(m.bullets.length,0);
  assert.equal(m.effects.some(e=>e.type==='spark'),true);
});

test('one-round death ends simulation and fresh Match resets all inventory and hazards',()=>{
  const m=new Match();m.players[0].hp=0;m.update(1/120);assert.equal(m.finished,false);assert.equal(m.winner,1);
  assert.equal(m.events.filter(e=>e.type==='death').length,1);
  assert.equal(m.effects.some(e=>e.type==='death'),true);
  for(let i=0;i<Math.ceil((DEATH_DURATION+.1)*120);i++)m.update(1/120);
  assert.equal(m.finished,true);const time=m.time;m.update(1/120);assert.equal(m.time,time);
  const next=new Match();assert.equal(next.finished,false);assert.deepEqual(next.players[0].slots,[null,null,null]);assert.equal(next.flames.length,0);assert.equal(next.players[0].hp,100);
});

test('death clears live rounds and fades fire before the result appears',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;
  m.tower.phase='rise';m.tower.height=.6;m.hitTower(0);
  m.bullets.push({id:100,owner:0,type:'pistol',x:100,y:500,vx:0,vy:-100,damage:5,color:0xffdc80,life:1,travel:0});
  m.players[0].hp=0;m.update(1/120);
  assert.ok(m.ending>0);
  assert.equal(m.bullets.length,0);
  assert.ok(m.flames.every(f=>f.endAge!==null&&f.life<=.7));
  assert.equal(m.fire(m.players[1]),false);
  for(let i=0;i<100;i++)m.update(1/120);
  assert.equal(m.flames.length,0);
  assert.equal(m.finished,false,'the result still waits for the death animation');
});

test('seeded autonomous match runs to a result without invalid positions or unbounded entities',()=>{
  let seed=83;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const m=new Match(random);
  for(let frame=0;frame<120*240&&!m.finished;frame++){
    m.update(1/120,{x:Math.sin(m.time),y:Math.cos(m.time)*.3,fire:true});
    for(const p of m.players){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.hp));assert.ok(p.hp>=0&&p.hp<=100);}
    assert.ok(m.bullets.length<100);assert.ok(m.pickups.length<10);m.events=[];
  }
  assert.equal(m.finished,true);
});
