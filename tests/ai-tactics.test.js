import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MAPS,BANK_BOUNDS,BARREL_BLAST_RADIUS,DEATH_DURATION,hailCloudVisual,HAIL_CLUSTER} from '../src/model.js';
import {shotPlan,advantageousBarrel,laserThreat} from '../src/ai-tactics.js';

function arena(map=MAPS.RIVERSIDE){
  const match=new Match(()=>.5,{map});match.obstacles=[];match.nextDrop=Infinity;match.nextEnvironmentEvent=Infinity;
  const [target,bot]=match.players;target.x=bot.x=240;target.y=760;bot.y=240;
  return {match,target,bot,state:match.aiState.get(bot.id)};
}
function think(match,seconds){for(let t=0;t<seconds;t+=1/120){match.time+=1/120;match.think(1/120);}}

test('computer reacts after observation and aims from samples rather than live coordinates',()=>{
  const {match,target,bot,state}=arena();match.move=()=>{};bot.slot={type:'missile',ammo:2};
  think(match,.15);assert.equal(bot.shots,0);
  const observedX=state.aim.x;target.x=340;think(match,.04);assert.equal(state.aim.x,observedX);
  think(match,.2);assert.ok(bot.shots>0);assert.equal(state.aim.x,340);
});

test('sandstorm cancels laser lock and hidden movement never updates remembered coordinates',()=>{
  const {match,target,bot,state}=arena(MAPS.DESERT);match.move=()=>{};bot.slot={type:'laser',ammo:1};
  think(match,.6);assert.ok(bot.charge>0);
  const remembered=state.lastSeen.x;
  match.sandstorm={y:target.y,direction:1};target.x=330;
  think(match,1.5);assert.equal(state.lastSeen.x,remembered);assert.equal(bot.charge,0);assert.equal(bot.slot.ammo,1);
  assert.equal(state.aim,null);
  match.sandstorm=null;state.clock=0;think(match,.12);assert.equal(bot.charge,0,'reacquisition needs a new reaction window');
});

test('ash and avalanche conceal either the observer or the target',()=>{
  for(const map of [MAPS.MAGMA,MAPS.SNOW])for(const covered of ['bot','target']){
    const context=arena(map),{match,target,bot}=context,point=context[covered];
    if(map===MAPS.MAGMA)match.ash={clouds:[{...point,width:180,height:120,alpha:1}]};
    else match.avalanches=[{...point,age:2,warning:1}];
    assert.equal(match.canSee(bot,target,true),false,`${map}/${covered}`);
  }
});

test('hail visibility uses the same moving cloud footprint as the renderer',()=>{
  const {match,target,bot}=arena(MAPS.SNOW);
  const pellet={id:1,start:0,cloudStart:0,life:10,cloudLife:10,age:5,direction:1,cloudY:bot.y+105};
  const cloud=hailCloudVisual(pellet);assert.equal(cloud.x,240);assert.equal(cloud.y,bot.y-20);
  match.hail=[pellet];assert.equal(match.canSee(bot,target,true),false);
  pellet.age=9.8;assert.equal(match.canSee(bot,target,true),true);
});

test('computer ignores concealed pickups but can be fooled by a visible mirage',()=>{
  const {match,bot,state}=arena(MAPS.DESERT);bot.hp=60;
  const item={id:901,owner:bot.bank,x:330,y:300,type:'syringe',flight:0,ttl:12};
  match.pickups=[item];match.sandstorm={y:item.y,direction:1};match.think(1/120);assert.equal(state.pickupId,null);
  match.sandstorm=null;state.clock=0;match.think(1/120);assert.equal(state.pickupId,item.id);
  match.pickups=[];match.mirages=[{...item,state:'lure'}];state.clock=0;match.think(1/120);
  assert.equal(state.pickupId,item.id);assert.deepEqual(state.target,{x:item.x,y:item.y});
});

test('arcing weapons clear crates while direct specials conserve ammo',()=>{
  const {match,target,bot}=arena();match.obstacles=[{id:9,type:'crate',owner:1,x:240,y:310,hits:0,destroyed:false}];
  assert.deepEqual(shotPlan(match,bot,target,'laser',BARREL_BLAST_RADIUS),{special:false,pistol:true,blocked:true});
  assert.equal(shotPlan(match,bot,target,'missile',BARREL_BLAST_RADIUS).special,true);
  bot.hp=25;assert.equal(shotPlan(match,bot,target,'rifle',BARREL_BLAST_RADIUS).pistol,false,'preserve own cover at low health');
});

test('barrels are tactical targets only when their blast cannot hurt a teammate',()=>{
  const {match,target,bot}=arena();
  const barrel={id:3,type:'barrel',owner:0,x:target.x+20,y:target.y,destroyed:false};match.obstacles=[barrel];
  assert.equal(advantageousBarrel(match,bot,target,BARREL_BLAST_RADIUS),barrel);
  match.players.push({id:2,team:bot.team,hp:100,x:barrel.x,y:barrel.y});
  assert.equal(advantageousBarrel(match,bot,target,BARREL_BLAST_RADIUS),null);
  match.obstacles=[{...barrel,owner:1,x:bot.x,y:bot.y+38}];
  assert.equal(shotPlan(match,bot,target,'pistol',BARREL_BLAST_RADIUS).pistol,false);
});

test('hurt computer briefly uses cover then resumes fighting instead of camping forever',()=>{
  const {match,bot,state}=arena();match.move=()=>{};bot.hp=25;
  match.obstacles=[{id:9,type:'crate',owner:1,x:240,y:310,hits:0,destroyed:false}];
  think(match,.4);assert.equal(state.covering,true);
  think(match,2.5);assert.equal(state.covering,false);
  assert.ok(state.coverRetryAt>match.time);
  think(match,3.5);assert.equal(state.covering,true);
});

test('stun ammunition is saved while the observed target is already stunned',()=>{
  const {match,target,bot}=arena();target.stun=1.5;
  assert.equal(shotPlan(match,bot,target,'grenade',BARREL_BLAST_RADIUS).special,false);
  target.stun=0;
  assert.equal(shotPlan(match,bot,target,'grenade',BARREL_BLAST_RADIUS).special,true);
});

test('computer refuses loot standing in nuclear waste and routes around a contaminated corridor',()=>{
  const {match,bot,state}=arena();bot.x=90;bot.y=180;
  const item={id:99,owner:1,type:'rifle',x:370,y:180,flight:0,ttl:12};match.pickups=[item];
  match.waste=[{x:item.x,y:item.y}];match.think(1/120);assert.equal(state.pickupId,null);
  match.waste=[{x:230,y:180}];state.clock=0;match.think(1/120);assert.equal(state.pickupId,item.id);
  assert.ok(Math.abs(state.waypoint.y-180)>20,'route bends around the waste');
  assert.ok(state.waypoint.y>=BANK_BOUNDS[1].minY&&state.waypoint.y<=BANK_BOUNDS[1].maxY);
});

test('hail avoidance starts with the visible falling-icicle cue, not a future salvo',()=>{
  const {match,bot,state}=arena(MAPS.SNOW);match.icePatches=[];bot.y=240;
  const pellet={id:99,owner:1,x:bot.x,y:bot.y,cloudY:800,age:0,warning:5,start:0,cloudStart:0,life:10,cloudLife:10,hit:false};
  match.hail=[pellet];match.think(1/120);assert.equal(bot.dodgeTime,0);
  const first={...state.target};
  pellet.age=pellet.warning-HAIL_CLUSTER.fall+.1;state.clock=0;match.think(1/120);
  assert.ok(Math.hypot(state.target.x-bot.x,state.target.y-bot.y)>40);
  assert.notDeepEqual(state.target,first);
});

test('both banks sidestep bullets approaching along their actual velocity',()=>{
  for(const bank of [0,1]){
    const {match,bot,state}=arena();bot.bank=bank;bot.team=bank;bot.x=240;bot.y=bank===0?720:220;
    const shooter=match.players[0];shooter.team=1-bank;
    const vy=bank===0?540:-540;
    match.bullets=[{owner:shooter.id,type:'pistol',x:bot.x,y:bot.y-vy*.35,vx:0,vy,life:1}];
    match.think(1/120);assert.ok(Math.abs(state.target.x-bot.x)>25,`bank ${bank} sidesteps`);
  }
});

test('visible near-ready laser prompts a sidestep while a concealed charge does not',()=>{
  const {match,target,bot,state}=arena(MAPS.DESERT);target.slot={type:'laser',ammo:1};target.charge=.8;
  match.think(1/120);assert.ok(Math.abs(state.target.x-target.x)>30);
  const hidden=arena(MAPS.DESERT);hidden.target.slot={type:'laser',ammo:1};hidden.target.charge=.95;
  hidden.match.sandstorm={y:hidden.target.y,direction:1};hidden.match.think(1/120);
  assert.equal(hidden.state.observed,null);assert.equal(hidden.bot.dodgeTime,0);
});

test('laser charges during strafing and retains charge when the target changes lanes',()=>{
  const {match,target,bot,state}=arena();bot.x=100;target.x=350;bot.slot={type:'laser',ammo:2};
  think(match,.6);
  assert.ok(bot.charge>.2);assert.ok(bot.x>110);assert.equal(bot.moving,true);assert.equal(bot.shots,0);
  const charge=bot.charge;target.x=55;state.clock=0;
  think(match,.2);assert.ok(bot.charge>charge,'changing lanes must not drain the charge');
  match.move=()=>{};bot.x=target.x;state.clock=0;think(match,.7);
  assert.equal(bot.slot.ammo,1);assert.equal(match.beams.length,1);assert.equal(match.beams[0].power,1);
});

test('computer can charge and fire at a target that keeps moving',()=>{
  const {match,target,bot}=arena();bot.x=120;target.x=260;bot.slot={type:'laser',ammo:1};
  let walkedWhileCharging=false;
  for(let i=0;i<360&&!match.beams.length;i++){
    target.x=260+Math.sin(i/60*1.5)*65;
    match.update(1/60);
    walkedWhileCharging ||= bot.moving&&bot.charge>0;
  }
  assert.ok(walkedWhileCharging);assert.equal(bot.slot,null,'fires without waiting for the target to stop');
});

test('laser evasion leaves counterattack windows and covers either bank',()=>{
  for(const bank of [0,1]){
    const state={},enemy={id:7,x:240,y:bank===0?200:740,weapon:'laser',charge:1};
    const bounds=BANK_BOUNDS[bank];
    const zone=laserThreat(enemy,state,10,bounds);assert.ok(zone);
    assert.equal(zone.b.y,bank===0?bounds.maxY:bounds.minY);
    assert.equal(laserThreat(enemy,state,10.6,bounds),null);
    assert.equal(laserThreat(enemy,state,11.3,bounds),null);
    assert.ok(laserThreat(enemy,state,11.6,bounds));
    assert.equal(laserThreat(null,state,11.7,bounds),null);
  }
});

test('charging opponents still receive pistol and arcing attacks',()=>{
  const early=arena();early.match.move=()=>{};early.target.slot={type:'laser',ammo:1};early.target.charge=.5;
  think(early.match,.5);assert.ok(early.bot.shots>0,'pistol pressure during early charge');
  const arc=arena();arc.match.move=()=>{};arc.bot.x=340;arc.bot.slot={type:'missile',ammo:2};arc.target.slot={type:'laser',ammo:1};arc.target.charge=1;
  think(arc.match,.5);assert.ok(arc.bot.shots>0,'missiles can fire while off the laser lane');
  const held=arena();held.target.slot={type:'laser',ammo:1};held.target.charge=1;held.bot.dodgeCooldown=10;
  think(held.match,4);assert.ok(held.bot.shots>0,'holding charge does not suppress all counterfire');
});

test('death completes its fall before results but does not hold the arena for several seconds',()=>{
  const {match,target}=arena();target.hp=0;match.update(1/120);
  assert.equal(DEATH_DURATION,1.4);
  for(let i=0;i<90;i++)match.update(1/120);
  assert.equal(match.finished,false);assert.ok(target.deathAge>.65);
  for(let i=0;i<90;i++)match.update(1/120);
  assert.equal(match.finished,true);
});
