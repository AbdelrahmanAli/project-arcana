import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,MAP_TYPES,WEAPONS,BANK_BOUNDS} from '../src/model.js';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';
import {matchOptions,humanSeats,snapshot} from '../server/room-protocol.js';
import {encodeCheckpoint,decodeCheckpoint} from '../server/checkpoint.js';

const create=(map,format='1v1')=>new Match(()=>.43,{map,format,bossMode:true});

test('each boss map keeps cover, hazards, and platform supplies on the player bank',()=>{
  for(const map of MAP_TYPES){
    const match=create(map,'2v2');
    assert.equal(match.players.length,3);
    assert.equal(match.boss.hp,800);
    assert.equal(match.players[1].boss,true);
    assert.equal(match.players[1].x,match.boss.x);
    assert.equal(match.players[1].y,match.boss.y);
    assert.ok(match.obstacles.every(object=>object.owner===0));
    match.launch();
    assert.equal(match.pickups.filter(item=>item.type!=='syringe').length,2);
    assert.ok(match.pickups.every(item=>item.owner===0));
    match.startPlatformVolley('first');
    assert.equal(match.platformAttacks.length,0);
    match.nextDrop=Infinity;
    for(let n=0;n<1800&&!match.finished;n++)match.update(1/60,{});
    for(const field of ['mud','lightning','tornadoes','volcanicFire','quicksand','mirages','icePatches','avalanches','hail']){
      assert.ok(match[field].every(item=>item.owner===undefined||item.owner===0),`${map} ${field} on boss bank`);
    }
    assert.equal(match.platformAttacks.length,0);
  }
});

test('every weapon family can damage the boss and the fight ends when its health is gone',()=>{
  for(const type of ['pistol','rifle','shotgun','laser','grenade','nuclear','missile']){
    const match=create('riverside');match.obstacles=[];match.nextDrop=Infinity;match.boss.nextAttack=Infinity;
    const player=match.players[0];player.x=match.boss.x;player.y=BANK_BOUNDS[0].minY+34;
    if(type!=='pistol')player.slot={type,ammo:WEAPONS[type].ammo,ammoReceived:WEAPONS[type].ammo};
    assert.equal(match.fire(player,type==='laser'?1:0,type==='pistol'?'pistol':'special'),true,type);
    for(let n=0;n<150;n++)match.update(1/60,{});
    assert.ok(match.boss.hp<500,`${type} missed the boss`);
  }
  const match=create('snow');
  match.damage(match.players[1],500);
  match.update(1/60,{});
  assert.equal(match.winner,0);
  assert.equal(match.boss.defeated,true);
});

test('duo boss online seats share the lower bank and checkpoints retain attack state',()=>{
  const options=matchOptions({format:'2v2',teamMode:'boss',map:'desert',mode:'random'});
  assert.deepEqual(humanSeats(options),[0,2]);
  const match=create('desert','2v2');
  for(let n=0;n<110;n++)match.update(1/60,{});
  const state=snapshot(match);
  assert.equal(state.bossMode,true);
  assert.equal(state.boss.name,BOSS_DEFINITIONS.desert.name);
  assert.equal(state.boss.current?.type,match.boss.current?.type);
  const restored=Object.assign(create('desert','2v2'),decodeCheckpoint(encodeCheckpoint(match)));
  const boss=create('desert','2v2').boss;
  restored.boss=Object.assign(boss,restored.boss);
  assert.equal(typeof restored.boss.update,'function');
  assert.deepEqual(restored.boss.snapshot().current,match.boss.snapshot().current);
});

test('boss attacks respect dodge and create short-lived map-specific aftermath',()=>{
  const magma=create('magma');magma.boss.nextAttack=Infinity;magma.nextEnvironmentEvent=Infinity;
  const fighter=magma.players[0];fighter.dodgeTime=.5;
  magma.bossEffects.push({id:900,x:fighter.x,y:fighter.y,radius:40,damage:20,attack:'moltenFist',age:-.01,life:.55,hit:false});
  magma.update(1/60,{});
  assert.equal(fighter.hp,100);
  assert.equal(magma.bossHazards.length,1);
  assert.equal(magma.bossHazards[0].life,2.4);
  for(let n=0;n<160;n++)magma.update(1/60,{});
  assert.equal(magma.bossHazards.length,0);

  const snow=create('snow');snow.boss.nextAttack=Infinity;
  const initial=snow.icePatches.length;
  snow.bossEffects.push({id:901,x:snow.players[0].x,y:snow.players[0].y,radius:25,damage:17,attack:'iceBeam',age:-.01,life:.55,hit:false});
  snow.update(1/60,{});
  assert.equal(snow.icePatches.length,initial+1);
  for(let n=0;n<190;n++)snow.update(1/60,{});
  assert.equal(snow.icePatches.length,initial);
});
