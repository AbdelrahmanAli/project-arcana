import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, WEAPONS, DROP_TYPES, GAME_MODES, H, RIVER, BANK_BOUNDS, TOWER_TIMING, TOWER_ACTIVE_HEIGHT, TOWER_GEOMETRY, TOWER_BASE_Y, DEATH_DURATION, FLAME_SPEED, FLAME_DAMAGE_PER_SECOND, BLAST_RADIUS, GRENADE_STUN_DURATION, LASER_CHARGE_TIME, LASER_BONUS_DAMAGE, DODGE_DURATION, DODGE_DISTANCE, DODGE_COOLDOWN, WASTE_RADIUS, WASTE_DAMAGE_PER_SECOND, BARREL_BLAST_RADIUS, obstacleBounds, towerShieldBounds, towerBodyBounds, towerArmExtension, segmentTowerHit, segmentRectHit, segmentDistance } from '../src/model.js';

test('pickups respect ownership, landing, and one-weapon capacity',()=>{
  const m=new Match(()=>.5),p=m.players[0];
  const item={owner:0,type:'rifle',x:p.x,y:p.y,flight:0,ttl:12};
  assert.equal(m.collect(p,{...item,owner:1}),false);
  assert.equal(m.collect(p,{...item,flight:.1}),false);
  assert.equal(m.collect(p,{...item}),true);
  const before=structuredClone(p.slot);
  assert.equal(m.collect(p,{...item,type:'laser'}),false);
  assert.deepEqual(p.slot,before);
  assert.deepEqual(m.events[0],{type:'pickup',player:0,weapon:'rifle'});
});

test('matching pickups add their full ammo without a cap for either fighter',()=>{
  const m=new Match(()=>.5);
  for(const p of m.players)for(const [type,def] of Object.entries(WEAPONS)){
    if(type==='pistol')continue;
    p.slot={type,ammo:1};
    const item={owner:p.id,type,x:p.x,y:p.y,flight:0,ttl:12};
    for(let pickup=1;pickup<=3;pickup++){
      const copy={...item};
      assert.equal(m.collect(p,copy),true);
      assert.equal(copy.ttl,0);
      assert.equal(p.slot.ammo,1+pickup*def.ammo);
      assert.equal(p.slot.ammoReceived,1+pickup*def.ammo);
      assert.deepEqual(m.events.at(-1),{type:'pickup',player:p.id,weapon:type,ammoAdded:def.ammo});
    }
  }
});

test('ammo meter basis grows with pickups and stays fixed while firing',()=>{
  const m=new Match(()=>.5),p=m.players[0];
  const item={owner:0,type:'rifle',x:p.x,y:p.y,flight:0,ttl:12};
  assert.equal(m.collect(p,{...item}),true);
  assert.equal(m.fire(p,0,'special'),true);
  assert.equal(p.slot.ammo,9);
  assert.equal(p.slot.ammoReceived,10);
  assert.equal(m.collect(p,{...item}),true);
  assert.equal(p.slot.ammo,19);
  assert.equal(p.slot.ammoReceived,20);
});

test('opponent pursues a matching drop while carrying its weapon',()=>{
  const m=new Match(()=>.5),p=m.players[1];
  m.obstacles.forEach(o=>o.destroyed=true);
  p.slot={type:'missile',ammo:2};
  const target={x:p.x+60,y:p.y+20};
  m.pickups=[
    {owner:1,type:'rifle',x:p.x,y:p.y+10,flight:0,ttl:12},
    {owner:1,type:'missile',...target,flight:0,ttl:12},
  ];
  m.think(1/120);
  assert.deepEqual(m.aiTarget,target);
});

test('pistol remains available with a special weapon and final ammo frees the slot',()=>{
  const m=new Match(),p=m.players[0];p.slot={type:'shotgun',ammo:1};
  assert.equal(m.fire(p,0,'pistol'),true);assert.equal(p.slot.ammo,1);
  assert.equal(m.fire(p,0,'special'),true);assert.equal(p.slot,null);assert.equal(m.weapon(p),'pistol');
  p.pistolCooldown=0;m.fire(p,0,'pistol');assert.equal(p.slot,null);
  assert.equal(m.bullets.length,7);
  assert.equal(m.collect(p,{owner:0,type:'rifle',x:p.x,y:p.y,flight:0,ttl:12}),true);
  assert.equal(p.slot.type,'rifle');
});

test('separate fire actions keep independent cooldowns and an empty special button cannot shoot',()=>{
  const m=new Match(()=>.5),p=m.players[0];m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  assert.equal(m.fire(p,0,'special'),false);
  p.slot={type:'rifle',ammo:2};
  m.update(1/120,{pistol:true,special:true});
  assert.equal(p.shots,2);
  assert.equal(p.slot.ammo,1);
  assert.ok(p.pistolCooldown>0&&p.specialCooldown>0);
  p.pistolCooldown=0;
  assert.equal(m.fire(p,0,'pistol'),true);
  assert.equal(p.slot.ammo,1,'pistol never spends the Tower weapon');
});

test('holding the special button launches only one grenade until the next press',()=>{
  for(const type of ['grenade','nuclear']){
    const m=new Match(()=>.5),p=m.players[0];m.think=()=>{};m.nextDrop=Infinity;
    m.obstacles.forEach(o=>o.destroyed=true);
    p.slot={type,ammo:2};
    for(let i=0;i<240;i++)m.update(1/120,{special:true});
    assert.equal(p.shots,1,`${type} must fire once during a hold`);
    assert.equal(p.slot.ammo,1);
    m.update(1/120,{special:false});
    m.update(1/120,{special:true});
    assert.equal(p.shots,2,`${type} can fire again after release and press`);
    assert.equal(p.slot,null);
  }
});

test('each launch creates a pair with independent rolls and valid bank positions',()=>{
  let i=0;const values=[.01,.1,.2,.99,.8,.9];const m=new Match();m.obstacles.forEach(o=>o.destroyed=true);m.random=()=>values[i++%values.length];m.launch();
  assert.equal(m.pickups.length,2);assert.equal(m.pickups[0].type,'rifle');assert.equal(m.pickups[1].type,'nuclear');
  assert.ok(m.pickups[0].y>RIVER.bottom);assert.ok(m.pickups[1].y<RIVER.top);
  for(const item of m.pickups)assert.ok(item.y>=BANK_BOUNDS[item.owner].minY+20&&item.y<=BANK_BOUNDS[item.owner].maxY-20);
  assert.equal(m.pickups[0].sx,RIVER.x-51);assert.equal(m.pickups[1].sx,RIVER.x+51);
  assert.equal(m.pickups[0].sy,RIVER.y-78);assert.equal(m.pickups[1].sy,RIVER.y-78);
  assert.equal(m.pickups[0].flight,m.pickups[1].flight);
});

test('fixed modes deal one weapon to both banks while random mode remains independent',()=>{
  const randomFixed=new Match(()=>.5,{mode:GAME_MODES.RANDOM_FIXED});
  assert.equal(randomFixed.fixedWeapon,'missile');
  randomFixed.launch();randomFixed.launch();
  assert.ok(randomFixed.pickups.every(item=>item.type==='missile'));
  const chosen=new Match(()=>.5,{mode:GAME_MODES.CHOOSE_FIXED,weapon:'nuclear'});
  chosen.launch();assert.deepEqual(chosen.pickups.map(item=>item.type),['nuclear','nuclear']);
  assert.throws(()=>new Match(()=>.5,{mode:GAME_MODES.CHOOSE_FIXED,weapon:'pistol'}),RangeError);
  const random=new Match(()=>.5);
  const draws=[0,.999];random.random=()=>draws.shift()??.5;
  random.obstacles.forEach(o=>o.destroyed=true);
  random.launch();
  assert.equal(random.pickups[0].type,'rifle');
  assert.notEqual(random.pickups[1].type,random.pickups[0].type);
});

test('Random Same Weapon draws once per Tower launch and gives both banks that type',()=>{
  const m=new Match(()=>.5,{mode:GAME_MODES.RANDOM_SAME});
  m.obstacles.forEach(o=>o.destroyed=true);
  assert.equal(m.fixedWeapon,null);
  const positions=[.2,.3,.8,.7,.4,.6,.9,.2];let positionDraw=0;
  m.random=()=>positions[positionDraw++%positions.length];
  const types=['rifle','nuclear'];let draws=0;
  m.dropWeaponType=()=>types[draws++];
  m.launch();m.launch();
  assert.equal(draws,2);
  assert.deepEqual(m.pickups.map(item=>item.type),['rifle','rifle','nuclear','nuclear']);
  assert.deepEqual(m.pickups.map(item=>item.owner),[0,1,0,1]);
  assert.notEqual(m.pickups[0].x,m.pickups[1].x,'landing positions still roll separately');
});

test('only a fully broken crate rolls once for nothing, a weapon, or a syringe',()=>{
  for(const [roll,expected] of [[.1,null],[.6,'missile'],[.9,'syringe']]){
    const m=new Match(()=>.5),crate=m.obstacles.find(o=>o.owner===0&&o.type==='crate');
    m.obstacles.filter(o=>o!==crate).forEach(o=>o.destroyed=true);
    m.random=()=>roll;
    assert.equal(m.hitObstacle(crate,101),true);
    assert.equal(m.pickups.length,0,'first shot only cracks the crate');
    assert.equal(m.hitObstacle(crate,102),true);
    assert.equal(m.pickups.length,expected?1:0);
    if(expected){
      const item=m.pickups[0];
      assert.equal(item.type,expected);assert.equal(item.owner,0);
      assert.ok(item.flight>0&&item.ttl===12);
      assert.ok(item.x>=38&&item.x<=442&&item.y>=BANK_BOUNDS[0].minY&&item.y<=BANK_BOUNDS[0].maxY);
      assert.equal(m.events.filter(e=>e.type==='crateLoot').length,1);
    }
    assert.equal(m.destroyObstacle(crate),false);
    assert.equal(m.pickups.length,expected?1:0,'destroying twice never repeats loot');
  }
});

test('fixed-mode crate weapons match the Tower weapon and syringes heal independently',()=>{
  const m=new Match(()=>.5,{mode:GAME_MODES.CHOOSE_FIXED,weapon:'laser'});
  const crate=m.obstacles.find(o=>o.owner===0&&o.type==='crate');
  m.obstacles.filter(o=>o!==crate).forEach(o=>o.destroyed=true);
  m.random=()=>.6;m.destroyObstacle(crate);
  assert.equal(m.pickups[0].type,'laser');
  const p=m.players[0];p.slot={type:'rifle',ammo:2};
  const syringe={id:900,owner:0,type:'syringe',x:p.x,y:p.y,flight:0,ttl:12};
  assert.equal(m.collect(p,syringe),false,'full health leaves the syringe');
  assert.equal(syringe.ttl,12);
  p.hp=93;
  assert.equal(m.collect(p,syringe),true);
  assert.equal(p.hp,100);assert.equal(p.slot.type,'rifle');
  assert.deepEqual(m.events.at(-1),{type:'heal',player:0,amount:7,x:p.x});
  const enemy=m.players[1];enemy.hp=60;
  const enemySyringe={id:901,owner:1,type:'syringe',x:enemy.x,y:enemy.y,flight:0,ttl:12};
  assert.equal(m.collect(enemy,enemySyringe),true);
  assert.equal(enemy.hp,80);
});

test('one explosion releases separate reachable loot from each destroyed crate',()=>{
  const m=new Match(()=>.5);
  m.obstacles.filter(o=>o.type==='barrel').forEach(o=>o.destroyed=true);
  m.random=()=>.9;
  const near=m.obstacles.filter(o=>o.owner===0&&o.type==='crate'&&o.x<150);
  m.explode({owner:1,type:'missile',x:80,y:670,damage:0,life:1});
  const broken=near.filter(o=>o.destroyed);
  const loot=m.pickups.filter(i=>i.source==='crate');
  assert.equal(loot.length,broken.length);
  assert.ok(loot.every(i=>i.type==='syringe'&&i.owner===0));
  for(const item of loot){
    assert.ok(m.obstacles.every(o=>o.destroyed||o.type!=='crate'||Math.abs(item.x-o.x)>=35||Math.abs(item.y-o.y)>=30));
    assert.ok(loot.every(other=>other===item||Math.hypot(item.x-other.x,item.y-other.y)>=32));
  }
});

test('injured computer seeks a syringe and ignores it at full health',()=>{
  const m=new Match(()=>.5),enemy=m.players[1];
  m.obstacles.forEach(o=>o.destroyed=true);m.nextDrop=Infinity;
  const syringe={id:900,owner:1,type:'syringe',x:enemy.x+58,y:enemy.y+10,flight:0,ttl:12};
  m.pickups=[syringe];enemy.hp=60;
  m.think(1/120);assert.deepEqual(m.aiTarget,{x:syringe.x,y:syringe.y});
  enemy.hp=100;m.aiClock=0;m.think(1/120);
  assert.notDeepEqual(m.aiTarget,{x:syringe.x,y:syringe.y});
});

test('a thrown weapon lands with one visible and audible impact',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.pickups=[{id:1,owner:0,type:'rifle',x:50,y:600,flight:.02,ttl:12}];
  for(let i=0;i<10;i++)m.update(1/120);
  assert.equal(m.events.filter(e=>e.type==='landing').length,1);
  assert.equal(m.effects.filter(e=>e.type==='landing').length,1);
  assert.equal(m.pickups[0].ttl<12,true);
});

test('weapons expire twelve seconds after landing, not during flight',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.pickups=[{id:1,owner:0,type:'rifle',x:50,y:600,flight:.75,ttl:12}];
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
  assert.equal(segmentRectHit({x:RIVER.x,y:590},{x:RIVER.x,y:0},body).y,body.bottom);
  assert.equal(segmentRectHit({x:RIVER.x,y:590},{x:RIVER.x,y:body.bottom+10},body),null);
  assert.equal(towerBodyBounds({height:.1}),null);
  assert.ok(TOWER_ACTIVE_HEIGHT<(TOWER_GEOMETRY.shaftBaseY-TOWER_GEOMETRY.apertureTop)/TOWER_GEOMETRY.shaftHeight);
  assert.equal(towerBodyBounds({height:TOWER_ACTIVE_HEIGHT}),null);
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  m.tower.phase='deliver';m.tower.height=1;m.players[0].x=RIVER.x;
  m.fire(m.players[0]);for(let i=0;i<65;i++)m.update(1/120);
  const impact=m.effects.find(e=>e.type==='towerImpact');
  assert.ok(impact&&impact.y<=body.bottom&&impact.y>=body.top);
  assert.equal(m.effects.filter(e=>e.type==='towerImpact').length,1);
});

test('visible launcher arms absorb shots only while they are extended',()=>{
  const tower={phase:'deliver',height:1,progress:0};
  const start={x:RIVER.x+65,y:580},end={x:start.x,y:0};
  assert.equal(towerArmExtension(tower),1);
  const impact=segmentTowerHit(start,end,tower);
  assert.ok(impact&&impact.y<TOWER_GEOMETRY.apertureTop);
  tower.progress=TOWER_TIMING.deliver-.1;
  assert.equal(towerArmExtension(tower),0);
  assert.equal(segmentTowerHit(start,end,tower),null);
  assert.ok(segmentTowerHit({x:RIVER.x,y:580},{x:RIVER.x,y:0},tower));
});

test('opposing rounds cancel before either can damage a player on the crossing frame',()=>{
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  const shot=(owner,y,vy)=>({id:owner,owner,type:'pistol',x:RIVER.x,y,vx:0,vy,damage:5,color:0xffdc80,life:1,travel:0});
  m.players[1].x=RIVER.x;m.players[1].y=60;
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
  m.obstacles.forEach(o=>o.destroyed=true);
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
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  m.tower.phase='deliver';m.tower.height=1;
  assert.equal(m.hitTower(0),true);assert.equal(m.tower.shield,true);assert.equal(m.flames.length,2);
  assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
  const p=m.players[0],enemy=m.players[1];p.x=enemy.x=320;p.y=570;
  assert.equal(m.fire(p),true);
  for(let i=0;i<30;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);assert.equal(enemy.hp,100);
  assert.equal(m.flames.length,2);
  assert.equal(m.events.filter(e=>e.type==='retaliation').length,1);
  assert.ok(m.effects.some(e=>e.type==='shieldHit'&&e.x>300&&e.y>350));
  p.slot={type:'laser',ammo:1};p.specialCooldown=0;
  m.fire(p,1);
  assert.ok(m.beams.at(-1).endY>RIVER.y&&m.beams.at(-1).endY<TOWER_BASE_Y+56);
  assert.equal(enemy.hp,100);
  m.flames=[]; // Isolate the submerged-cap check from the firing hold.
  m.tower.phase='lower';m.tower.progress=TOWER_TIMING.lower-.4;m.tower.height=TOWER_ACTIVE_HEIGHT+.01;
  m.tower.shield=true;m.updateTower(1/120);
  assert.ok(m.tower.height<TOWER_ACTIVE_HEIGHT);
  assert.equal(m.tower.shield,false,'shield disappears once the tower head is submerged');
  assert.equal(m.hitTower(0),false);
  p.x=enemy.x=RIVER.x+65;p.pistolCooldown=0;
  assert.equal(m.fire(p,0,'pistol'),true);
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
  const m=new Match(),p=m.players[0],enemy=m.players[1];p.slot={type:'grenade',ammo:3};m.fire(p);
  assert.ok(m.events.some(e=>e.type==='shot'&&e.weapon==='grenade'),'grenade launch emits its audible shot event');
  const target={x:enemy.x,y:enemy.y};enemy.x+=100;assert.equal(m.bullets[0].tx,target.x);assert.equal(m.bullets[0].ty,target.y);
  p.slot={type:'missile',ammo:2};p.specialCooldown=0;m.fire(p);const b=m.bullets.at(-1),vx=b.vx,vy=b.vy;
  enemy.x-=200;m.think=()=>{};m.update(1/120);assert.equal(b.vx,vx);assert.equal(b.vy,vy);
});

test('larger blasts reach fighters farther from the impact point',()=>{
  for(const [type,offset] of [['grenade',55],['missile',50]]){
    const m=new Match(()=>.5),enemy=m.players[1];
    m.explode({owner:0,type,x:enemy.x-offset,y:enemy.y,damage:WEAPONS[type].damage,life:1});
    assert.ok(offset<BLAST_RADIUS[type]);
    assert.ok(enemy.hp<100,`${type} reaches a fighter ${offset} units away`);
    assert.equal(enemy.stun>0,type==='grenade');
  }
});

test('stun grenade deals light damage and holds either fighter in place for 2.2 seconds',()=>{
  const m=new Match(()=>.5),victim=m.players[0];m.think=()=>{};m.nextDrop=Infinity;
  m.explode({owner:1,type:'grenade',x:victim.x,y:victim.y,damage:WEAPONS.grenade.damage,life:1});
  assert.equal(victim.hp,100-WEAPONS.grenade.damage);
  assert.equal(victim.stun,GRENADE_STUN_DURATION);
  assert.ok(m.effects.some(e=>e.type==='stunBlast'));
  assert.ok(m.events.some(e=>e.type==='stunBlast'));
  assert.ok(m.events.some(e=>e.type==='stun'&&e.player===0));
  const startX=victim.x;
  m.update(1/120,{x:1,y:0,pistol:true});
  assert.equal(victim.x,startX);
  assert.equal(victim.shots,0);
  assert.equal(m.fire(victim),false);
  for(let i=0;i<Math.ceil(GRENADE_STUN_DURATION*120);i++)m.update(1/120);
  assert.equal(victim.stun,0);
  m.update(1/120,{x:1,y:0,pistol:true});
  assert.ok(victim.x>startX);
  assert.equal(victim.shots,1);
  const ai=m.players[1];ai.stun=1;
  const aiX=ai.x;m.aiFire=true;m.think(1/120);
  assert.equal(ai.x,aiX);
  assert.equal(ai.shots,0);
});

test('a second grenade hit damages but does not extend an active stun',()=>{
  const m=new Match(()=>.5),victim=m.players[0];m.think=()=>{};m.nextDrop=Infinity;
  const blast=()=>m.explode({owner:1,type:'grenade',x:victim.x,y:victim.y,damage:WEAPONS.grenade.damage,life:1});
  blast();for(let i=0;i<120;i++)m.update(1/120);
  const remaining=victim.stun,hp=victim.hp;
  blast();
  assert.equal(victim.stun,remaining);
  assert.equal(victim.hp,hp-WEAPONS.grenade.damage);
});

test('grenade dodge or a hit outside its radius avoids the stun',()=>{
  const m=new Match(()=>.5),enemy=m.players[1];
  m.explode({owner:0,type:'grenade',x:enemy.x-BLAST_RADIUS.grenade-1,y:enemy.y,damage:WEAPONS.grenade.damage,life:1});
  assert.equal(enemy.hp,100);
  assert.equal(enemy.stun,0);
});

test('smart missiles clear the raised tower and shield before striking their marked target',()=>{
  const m=new Match(),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  p.x=enemy.x=RIVER.x;m.tower.phase='deliver';m.tower.height=1;m.tower.shield=true;
  p.slot={type:'missile',ammo:1};m.fire(p);
  for(let i=0;i<150;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);
  assert.equal(enemy.hp,100-WEAPONS.missile.damage);
  assert.equal(m.effects.some(e=>e.type==='shieldHit'),false);
});

test('grenades arc over the raised tower and shield before landing',()=>{
  const m=new Match(),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  p.x=enemy.x=RIVER.x;m.tower.phase='deliver';m.tower.height=1;m.tower.shield=true;
  p.slot={type:'grenade',ammo:1};m.fire(p);
  for(let i=0;i<120;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);
  assert.equal(enemy.hp,100-WEAPONS.grenade.damage);
  assert.ok(enemy.stun>GRENADE_STUN_DURATION-.15&&enemy.stun<GRENADE_STUN_DURATION,'stun begins at impact and counts down after landing');
  assert.equal(m.effects.some(e=>e.type==='shieldHit'),false);
});

test('charged laser creates a straight sustained beam and spends its only round',()=>{
  const m=new Match(),p=m.players[0];m.obstacles.forEach(o=>o.destroyed=true);p.slot={type:'laser',ammo:WEAPONS.laser.ammo};m.fire(p,1);
  assert.equal(m.beams.length,1);assert.equal(m.beams[0].x,p.x);assert.equal(m.beams[0].endY,0);
  assert.equal(p.slot,null,'one laser shot empties the pickup');
  assert.equal(m.weapon(p),'pistol');
  assert.equal(p.charge,0);
});

test('laser reaches full charge in 1.1 seconds and visibly stronger beams deal more damage',()=>{
  const m=new Match(()=>.5),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;m.obstacles.forEach(o=>o.destroyed=true);
  p.x=enemy.x=240;p.slot={type:'laser',ammo:WEAPONS.laser.ammo};
  for(let i=0;i<Math.ceil(LASER_CHARGE_TIME*120)+1;i++)m.update(1/120,{special:true});
  assert.equal(p.charge,1);assert.equal(p.shots,0,'holding charges without firing');
  m.fire(p,p.charge);
  assert.equal(enemy.hp,100-WEAPONS.laser.damage-LASER_BONUS_DAMAGE);
  assert.equal(m.beams.at(-1).power,1);assert.equal(p.charge,0);
  const partial=new Match(()=>.5),shooter=partial.players[0],target=partial.players[1];partial.obstacles.forEach(o=>o.destroyed=true);
  shooter.x=target.x=240;shooter.slot={type:'laser',ammo:WEAPONS.laser.ammo};
  partial.fire(shooter,.5);
  assert.equal(partial.beams.at(-1).power,.5);
  assert.equal(target.hp,100-WEAPONS.laser.damage-LASER_BONUS_DAMAGE*.5);
});

test('shotgun rewards moving to the river while remaining weak from the back of the bank',()=>{
  const fireAtRange=(playerY,enemyY)=>{
    const m=new Match(()=>.5),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
    m.obstacles.forEach(o=>o.destroyed=true);
    p.x=enemy.x=240;p.y=playerY;enemy.y=enemyY;
    p.slot={type:'shotgun',ammo:1};m.fire(p);
    for(let i=0;i<150;i++)m.update(1/120);
    return 100-enemy.hp;
  };
  assert.equal(fireAtRange(BANK_BOUNDS[0].minY,BANK_BOUNDS[1].maxY),WEAPONS.shotgun.damage*3);
  assert.equal(fireAtRange(760,240),WEAPONS.shotgun.damage);
});

test('movement stays on each bank and diagonal speed is normalized',()=>{
  const m=new Match(),p=m.players[0],start={x:p.x,y:p.y};m.move(p,1,1,.1);
  m.obstacles.forEach(o=>o.destroyed=true);
  assert.ok(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-17)<1e-8);
  assert.equal(BANK_BOUNDS[0].minY,590,'southern fighter reaches the foot of the river wall');
  assert.equal(BANK_BOUNDS[1].maxY,350,'northern fighter stops on the sand before the upper river wall');
  assert.equal(BANK_BOUNDS[0].minY-RIVER.bottom,9);
  assert.equal(RIVER.top-BANK_BOUNDS[1].maxY,69);
  assert.equal(BANK_BOUNDS[0].maxY,870,'southern fighter stops at the visible back wall');
  assert.equal(BANK_BOUNDS[1].minY,70,'northern fighter stops at the visible back wall');
  assert.equal(BANK_BOUNDS[0].maxY-BANK_BOUNDS[0].minY,280);
  assert.equal(BANK_BOUNDS[0].maxY-BANK_BOUNDS[0].minY,BANK_BOUNDS[1].maxY-BANK_BOUNDS[1].minY,'both fighters have equal movement depth');
  assert.equal(BANK_BOUNDS[0].maxY+BANK_BOUNDS[1].minY,H,'the outer margins mirror each other');
  m.move(p,-100,-100,100);assert.equal(p.y,BANK_BOUNDS[0].minY);assert.ok(p.x>=38);
  m.move(p,0,-1,.1);assert.equal(p.moving,false,'fighter does not animate walking into the river wall');
  m.move(p,100,100,100);assert.equal(p.y,BANK_BOUNDS[0].maxY);
  m.move(m.players[1],-100,-100,100);assert.equal(m.players[1].y,BANK_BOUNDS[1].minY);
  m.move(m.players[1],100,100,100);assert.equal(m.players[1].y,BANK_BOUNDS[1].maxY);
});

test('dive roll selects all eight directions and travels a fixed distance before cooldown',()=>{
  const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  directions.forEach(([x,y],direction)=>{
    const m=new Match(()=>.5),p=m.players[0];m.think=()=>{};m.nextDrop=Infinity;m.obstacles.forEach(o=>o.destroyed=true);
    const start={x:p.x,y:p.y};
    assert.equal(m.dodge(p,x,y),true);assert.equal(p.dodgeDir,direction);
    assert.equal(m.dodge(p,x,y),false,'roll cannot restart while active');
    for(let i=0;i<60;i++)m.update(1/120);
    assert.equal(p.dodgeTime,0);
    assert.ok(Math.hypot(p.x-start.x,p.y-start.y)<=DODGE_DISTANCE+.01);
    assert.ok(Math.hypot(p.x-start.x,p.y-start.y)>DODGE_DISTANCE-3);
    assert.equal(m.dodge(p,x,y),false,'cooldown prevents an immediate second roll');
    for(let i=0;i<300;i++)m.update(1/120);
    assert.equal(p.dodgeCooldown,0);assert.equal(m.dodge(p,x,y),true);
  });
  assert.ok(DODGE_COOLDOWN>DODGE_DURATION);
});

test('a roll stays inside the bank and cannot pass solid cover',()=>{
  const m=new Match(()=>.5),p=m.players[0];m.think=()=>{};m.nextDrop=Infinity;
  const crate=m.obstacles.find(o=>o.owner===0&&o.type==='crate');
  m.obstacles.filter(o=>o!==crate).forEach(o=>o.destroyed=true);
  crate.x=p.x+50;crate.y=p.y;
  m.dodge(p,1,0);
  for(let i=0;i<60;i++)m.update(1/120);
  assert.ok(p.x<crate.x-14,'crate interrupts the roll');
  const edge=new Match(()=>.5),fighter=edge.players[0];edge.think=()=>{};edge.nextDrop=Infinity;edge.obstacles.forEach(o=>o.destroyed=true);
  fighter.y=BANK_BOUNDS[0].minY+10;edge.dodge(fighter,0,-1);
  for(let i=0;i<60;i++)edge.update(1/120);
  assert.equal(fighter.y,BANK_BOUNDS[0].minY);
});

test('rolling ignores direct, blast, stun, and ground damage until animation ends',()=>{
  const m=new Match(()=>.5),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;m.obstacles.forEach(o=>o.destroyed=true);
  assert.equal(m.dodge(p,1,0),true);
  assert.equal(m.damage(p,20),0);
  enemy.x=p.x;enemy.slot={type:'laser',ammo:1};
  m.fire(enemy,1,'special');
  assert.equal(p.hp,100,'a laser beam passes over a rolling fighter');
  m.explode({owner:1,type:'grenade',x:p.x,y:p.y,damage:7,life:1});
  assert.equal(p.stun,0);
  m.bullets.push({id:1001,owner:1,type:'pistol',x:p.x,y:p.y,vx:0,vy:0,damage:5,life:1,travel:0});
  m.waste.push({id:999,x:p.x,y:p.y});
  m.flames.push({id:1000,x:p.x-20,y:p.y,dx:1,dy:0,age:0,reach:40,maxReach:40,endAge:null,marked:0,life:1});
  m.update(1/120);
  assert.equal(p.hp,100);assert.equal(p.radiated,0);assert.equal(p.burning,0);
  assert.ok(m.bullets.some(b=>b.id===1001),'the pistol round is not consumed by the invulnerable fighter');
  m.waste=[];m.flames=[];
  for(let i=0;i<60;i++)m.update(1/120);
  assert.equal(p.dodgeTime,0);
  assert.equal(m.damage(p,20),20);assert.equal(p.hp,80);
});

test('the opponent rolls away from a locked explosive shortly before impact',()=>{
  const m=new Match(()=>.5),enemy=m.players[1];m.nextDrop=Infinity;m.obstacles.forEach(o=>o.destroyed=true);
  m.bullets.push({owner:0,type:'grenade',t:.7,duration:.9,tx:enemy.x,ty:enemy.y});
  m.think(1/120);
  assert.ok(enemy.dodgeTime>0);
  assert.ok(enemy.dodgeCooldown>0);
});

test('opponent navigates around grouped crates near a wall and does not detour around barrels',()=>{
  const m=new Match(()=>.5),opponent=m.players[1];m.nextDrop=Infinity;m.fire=()=>false;
  m.players[0].x=190;opponent.x=442;opponent.y=185;
  m.obstacles=[
    {id:1,owner:1,type:'crate',x:400,y:180,destroyed:false,hits:0},
    {id:2,owner:1,type:'crate',x:367,y:180,destroyed:false,hits:0},
    {id:3,owner:1,type:'barrel',x:420,y:130,destroyed:false},
  ];
  for(let i=0;i<480;i++)m.update(1/120);
  assert.ok(opponent.x<345,`opponent escaped the right wall and cover at x=${opponent.x}`);
  assert.ok(opponent.y>=BANK_BOUNDS[1].minY&&opponent.y<=BANK_BOUNDS[1].maxY);
});

test('opponent patrol reaches the river-facing edge of its bank',()=>{
  const m=new Match(()=>.5),opponent=m.players[1];m.nextDrop=Infinity;m.fire=()=>false;
  m.obstacles.forEach(o=>o.destroyed=true);
  let farthestY=opponent.y;
  for(let i=0;i<600;i++){
    m.update(1/120);
    farthestY=Math.max(farthestY,opponent.y);
  }
  assert.ok(farthestY>=BANK_BOUNDS[1].maxY-8,`opponent stopped ${Math.round(BANK_BOUNDS[1].maxY-farthestY)} pixels short of the front limit`);
  assert.ok(opponent.y<=BANK_BOUNDS[1].maxY,'opponent stays on the sand');
});

test('fast projectiles use swept collision rather than skipping targets',()=>{
  assert.equal(segmentDistance({x:10,y:15},{x:10,y:0},{x:10,y:30}),0);
  const m=new Match();m.think=()=>{};m.nextDrop=Infinity;const enemy=m.players[1];
  m.bullets=[{id:1,x:enemy.x,y:enemy.y+20,vx:0,vy:-5000,owner:0,type:'rifle',damage:30,color:0,life:1,travel:0,targetDistance:Infinity}];
  m.update(1/120);assert.equal(enemy.hp,70);assert.equal(m.bullets.length,0);
});

test('opposing conventional rounds cancel when their swept paths cross',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
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
  const next=new Match();assert.equal(next.finished,false);assert.equal(next.players[0].slot,null);assert.equal(next.flames.length,0);assert.equal(next.players[0].hp,100);
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

test('arena cover is mirrored, leaves spawn lanes open, and supply drops avoid solid objects',()=>{
  let seed=71;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const layouts=new Set();
  for(let round=0;round<40;round++){
    const m=new Match(random);
    const southObjects=m.obstacles.filter(o=>o.owner===0),northObjects=m.obstacles.filter(o=>o.owner===1);
    assert.ok(southObjects.length>=7&&southObjects.length<=10);
    assert.equal(southObjects.length,northObjects.length);
    const southCrates=southObjects.filter(o=>o.type==='crate'),southBarrels=southObjects.filter(o=>o.type==='barrel');
    assert.ok(southCrates.length>=6&&southCrates.length<=8&&southBarrels.length>=1&&southBarrels.length<=2);
    const offsets={T:[[-33,0],[0,0],[33,0],[0,17]],L:[[0,0],[33,0],[0,17]],square:[[0,0],[33,0],[0,17],[33,17]]};
    for(const originX of [80,400]){
      const group=southCrates.filter(o=>originX===80?o.x<240:o.x>240);
      const origin=group.find(o=>o.x===originX&&o.y===670);
      assert.ok(origin,`crate formation starts at ${originX}`);
      const shape=origin.formation;layouts.add(shape);
      assert.ok(['T','L','square'].includes(shape));
      assert.ok(group.every(o=>o.formation===shape&&o.y>=670&&o.y<=687));
      assert.deepEqual(group.map(o=>`${o.x},${o.y}`).sort(),offsets[shape].map(([x,y])=>`${originX+x},${670+y}`).sort());
    }
    for(const [index,south] of southObjects.entries()){
      const north=northObjects[index];assert.equal(south.type,north.type);
      assert.equal(south.x+north.x,480);assert.equal(south.y+north.y,2*RIVER.y);
    }
    for(const player of m.players)for(const obstacle of m.obstacles)assert.ok(Math.hypot(player.x-obstacle.x,player.y-obstacle.y)>55);
    for(const barrel of southBarrels){
      assert.ok(barrel.x>=55&&barrel.x<=425&&barrel.y>=650&&barrel.y<=870);
      for(const other of southObjects)if(other!==barrel)assert.ok(Math.hypot(barrel.x-other.x,barrel.y-other.y)>51);
    }
    for(let launch=0;launch<6;launch++)m.launch();
    for(const item of m.pickups)for(const obstacle of m.obstacles)assert.ok(Math.hypot(item.x-obstacle.x,item.y-obstacle.y)>=57);
  }
  assert.equal(layouts.size,3,'rounds include T, L, and square formations');
});

test('crates stop movement and shots, then leave passable debris',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  const p=m.players[0],enemy=m.players[1],crate=m.obstacles.find(o=>o.type==='crate'&&o.owner===0);
  crate.x=p.x+45;crate.y=p.y;
  m.move(p,1,0,.3);assert.equal(p.x,190,'solid crate blocks walking');
  crate.x=p.x;crate.y=p.y-70;enemy.x=p.x;
  m.fire(p);for(let i=0;i<90;i++)m.update(1/120);
  assert.equal(crate.hits,1);assert.equal(crate.destroyed,false);assert.equal(enemy.hp,100,'first round is absorbed');
  assert.ok(m.events.some(e=>e.type==='crateHit'));
  p.specialCooldown=0;m.fire(p);for(let i=0;i<110;i++)m.update(1/120);
  assert.equal(crate.hits,2);assert.equal(crate.destroyed,true);assert.equal(enemy.hp,100,'second round breaks the crate but remains blocked');
  assert.ok(m.events.some(e=>e.type==='crateBreak'));
  p.specialCooldown=0;m.fire(p);for(let i=0;i<110;i++)m.update(1/120);
  assert.equal(enemy.hp,95,'third round passes through debris');
  crate.x=p.x+45;crate.y=p.y;m.move(p,1,0,.3);assert.ok(p.x>190,'debris does not block walking');
});

test('crate footprints are solid while barrels do not block movement',()=>{
  for(const type of ['barrel','crate']){
    const m=new Match(()=>.5),p=m.players[0],obstacle=m.obstacles.find(o=>o.type===type&&o.owner===0);
    m.obstacles.filter(o=>o!==obstacle).forEach(o=>o.destroyed=true);
    obstacle.x=p.x+45;obstacle.y=p.y+15;
    m.move(p,1,0,.3);assert.ok(p.x>190,`upper side of ${type} is passable`);
    p.x=190;obstacle.y=p.y-10;
    m.move(p,1,0,.3);assert.equal(p.x,type==='crate'?190:241,`${type} has the expected walking collision`);
  }
});

test('one shotgun blast cracks a crate once and an explosion destroys it immediately',()=>{
  const m=new Match(()=>.5),p=m.players[0],crate=m.obstacles.find(o=>o.type==='crate'&&o.owner===0);
  m.think=()=>{};m.nextDrop=Infinity;m.obstacles.filter(o=>o!==crate).forEach(o=>o.destroyed=true);
  crate.x=p.x;crate.y=p.y-70;p.slot={type:'shotgun',ammo:2};
  m.fire(p);for(let i=0;i<90;i++)m.update(1/120);
  assert.equal(crate.hits,1);assert.equal(crate.destroyed,false,'pellets from one trigger pull count as one shot');
  m.explode({owner:0,type:'missile',x:crate.x,y:crate.y,damage:0,life:1});
  assert.equal(crate.destroyed,true,'blast skips the cracked state');
});

test('barrels explode once, hurt either fighter, and chain into nearby objects',()=>{
  const m=new Match(()=>.5),barrel=m.obstacles.find(o=>o.type==='barrel'&&o.owner===0);
  const other=m.obstacles.find(o=>o.type==='barrel'&&o.owner===1),crate=m.obstacles.find(o=>o.type==='crate'&&o.owner===0);
  m.obstacles.filter(o=>o!==barrel&&o!==other&&o!==crate).forEach(o=>o.destroyed=true);
  barrel.x=210;barrel.y=520;other.x=240;other.y=520;crate.x=220;crate.y=545;
  m.players[0].x=195;m.players[0].y=520;m.players[1].x=245;m.players[1].y=520;
  assert.equal(m.destroyObstacle(barrel),true);
  assert.equal(barrel.destroyed,true);assert.equal(other.destroyed,true);assert.equal(crate.destroyed,true);
  assert.ok(m.players.every(p=>p.hp<100));
  assert.equal(m.events.filter(e=>e.type==='barrelBlast').length,2);
  assert.equal(m.destroyObstacle(barrel),false);
  assert.equal(m.events.filter(e=>e.type==='barrelBlast').length,2);
  assert.equal(BARREL_BLAST_RADIUS,65);
});

test('barrel blast reaches a fighter near the edge of the wider red zone',()=>{
  const m=new Match(()=>.5),barrel=m.obstacles.find(o=>o.type==='barrel'&&o.owner===0);
  m.obstacles.filter(o=>o!==barrel).forEach(o=>o.destroyed=true);
  m.players[0].x=barrel.x+60;m.players[0].y=barrel.y;
  m.players[1].x=barrel.x+70;m.players[1].y=barrel.y;
  m.destroyObstacle(barrel);
  assert.ok(m.players[0].hp<100);
  assert.equal(m.players[1].hp,100);
});

test('blast areas and laser destroy cover at the first intersection',()=>{
  const m=new Match(()=>.5),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  const crate=m.obstacles.find(o=>o.type==='crate'&&o.owner===1);crate.x=p.x;crate.y=enemy.y+10;enemy.x=p.x;
  p.slot={type:'laser',ammo:2};m.fire(p,1);
  assert.equal(crate.hits,1);assert.equal(crate.destroyed,false);assert.equal(enemy.hp,100);
  assert.ok(m.beams.at(-1).endY>enemy.y);
  p.specialCooldown=0;m.fire(p,1);assert.equal(crate.destroyed,true);
  const barrel=m.obstacles.find(o=>o.type==='barrel'&&o.owner===1);barrel.x=260;barrel.y=130;
  m.explode({owner:0,type:'grenade',x:260,y:130,damage:0,life:1});
  assert.equal(barrel.destroyed,true,'grenade blast ignites barrel');
});

test('nuclear grenade arcs over the tower, then permanent waste harms either fighter',()=>{
  const m=new Match(()=>.5),p=m.players[0],enemy=m.players[1];m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  p.x=enemy.x=RIVER.x;m.tower.phase='deliver';m.tower.height=1;m.tower.shield=true;
  p.slot={type:'nuclear',ammo:2};m.fire(p);
  assert.equal(p.slot.ammo,1);assert.equal(m.bullets[0].type,'nuclear');
  for(let i=0;i<130;i++)m.update(1/120);
  assert.equal(m.bullets.length,0);assert.ok(enemy.hp<90&&enemy.hp>80);
  assert.ok(m.effects.some(e=>e.type==='nuclearBlast'&&e.life>=.9&&e.life<=1),'mushroom animation resolves promptly after impact');
  assert.equal(m.effects.some(e=>e.type==='shieldHit'),false);
  assert.equal(m.waste.length,1);assert.ok(m.events.some(e=>e.type==='nuclearBlast'));
  const hp=enemy.hp;for(let i=0;i<120;i++)m.update(1/120);
  assert.ok(enemy.hp<=hp-WASTE_DAMAGE_PER_SECOND*.9);
  m.waste.push({id:999,x:p.x,y:p.y});
  const ownHp=p.hp;for(let i=0;i<120;i++)m.update(1/120);
  assert.ok(p.hp<=ownHp-WASTE_DAMAGE_PER_SECOND*.9,'own fighter is not exempt');
  p.x+=100;enemy.x+=100;
  for(let i=0;i<1200;i++)m.update(1/120);
  assert.equal(m.waste.length,2,'waste remains after ten more seconds');
  const before=p.hp;p.x=m.waste[1].x;m.update(1/120);assert.ok(p.hp<before,'old waste still hurts on reentry');
  assert.equal(WASTE_RADIUS,24);assert.ok(DROP_TYPES.includes('nuclear'));
});

test('waste and fire expose separate short-lived damage states for each fighter',()=>{
  const m=new Match(()=>.5);m.think=()=>{};m.nextDrop=Infinity;
  m.obstacles.forEach(o=>o.destroyed=true);
  const p=m.players[0],enemy=m.players[1];
  m.waste.push({id:999,x:p.x,y:p.y});
  m.update(1/120);
  assert.ok(p.radiated>0&&p.burning===0&&p.hp<100);
  p.x+=80;m.waste=[];
  for(let i=0;i<25;i++)m.update(1/120);
  assert.equal(p.radiated,0);
  m.flames.push({id:1000,x:enemy.x,y:enemy.y,dx:1,dy:0,age:0,reach:40,maxReach:40,endAge:null,marked:0,life:.5});
  m.update(1/120);
  assert.ok(enemy.burning>0&&enemy.radiated===0&&enemy.hp<100);
  m.flames=[];
  for(let i=0;i<25;i++)m.update(1/120);
  assert.equal(enemy.burning,0);
});

test('standing in waste or tower fire applies the intended damage per second',()=>{
  const wasteMatch=new Match(()=>.5);wasteMatch.think=()=>{};wasteMatch.nextDrop=Infinity;
  wasteMatch.waste.push({id:999,x:wasteMatch.players[0].x,y:wasteMatch.players[0].y});
  for(let i=0;i<120;i++)wasteMatch.update(1/120);
  assert.ok(Math.abs(wasteMatch.players[0].hp-(100-WASTE_DAMAGE_PER_SECOND))<.01);
  wasteMatch.waste=[];
  for(let i=0;i<60;i++)wasteMatch.update(1/120);
  assert.equal(wasteMatch.events.filter(e=>e.type==='damage'&&e.player===0).reduce((total,e)=>total+e.amount,0),WASTE_DAMAGE_PER_SECOND);
  const fireMatch=new Match(()=>.5);fireMatch.think=()=>{};fireMatch.nextDrop=Infinity;fireMatch.obstacles.forEach(o=>o.destroyed=true);
  const target=fireMatch.players[1];
  fireMatch.flames.push({id:999,x:target.x-20,y:target.y,dx:1,dy:0,age:0,reach:40,maxReach:40,endAge:null,marked:0,life:2});
  for(let i=0;i<120;i++)fireMatch.update(1/120);
  assert.ok(Math.abs(target.hp-(100-FLAME_DAMAGE_PER_SECOND))<.01);
  fireMatch.flames=[];
  for(let i=0;i<60;i++)fireMatch.update(1/120);
  assert.equal(fireMatch.events.filter(e=>e.type==='damage'&&e.player===1).reduce((total,e)=>total+e.amount,0),FLAME_DAMAGE_PER_SECOND);
});

test('a hit reports the actual damage on either fighter, including a lethal hit',()=>{
  const m=new Match(()=>.5);
  m.damage(m.players[0],7);
  m.damage(m.players[1],150);
  assert.deepEqual(m.events.filter(e=>e.type==='damage'),[
    {type:'damage',player:0,amount:7},
    {type:'damage',player:1,amount:100},
  ]);
});

test('nearby nuclear impacts each leave waste beneath their own cloud',()=>{
  const m=new Match(()=>.5);
  for(const [x,y] of [[100,120],[112,132]])m.explode({type:'nuclear',x,y,owner:0,damage:0,life:1});
  assert.deepEqual(m.waste.map(({x,y})=>[x,y]),[[100,120],[112,132]]);
  assert.deepEqual(m.effects.filter(e=>e.type==='nuclearBlast').map(({x,y})=>[x,y]),[[100,120],[112,132]]);
});

test('seeded autonomous match runs to a result without invalid positions or unbounded entities',()=>{
  let seed=83;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const m=new Match(random);
  for(let frame=0;frame<120*240&&!m.finished;frame++){
    m.update(1/120,{x:Math.sin(m.time),y:Math.cos(m.time)*.3,pistol:true,special:true});
    for(const p of m.players){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.hp));assert.ok(p.hp>=0&&p.hp<=100);}
    assert.ok(m.bullets.length<100);assert.ok(m.pickups.length<10);m.events=[];
  }
  assert.equal(m.finished,true);
});
