import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,WEAPONS} from '../src/model.js';
import {AI_DIFFICULTIES,DEFAULT_DIFFICULTY} from '../src/ai-difficulty.js';
import {matchOptions,snapshot} from '../server/room-protocol.js';

function arena(difficulty='easy'){
  const match=new Match(()=>.5,{difficulty});match.obstacles=[];match.nextDrop=Infinity;match.nextEnvironmentEvent=Infinity;
  match.players[0].x=match.players[1].x=240;
  return match;
}

test('difficulty defaults to Normal and is validated by both local and online games',()=>{
  assert.equal(DEFAULT_DIFFICULTY,'normal');assert.equal(new Match().difficulty,'normal');
  for(const difficulty of Object.keys(AI_DIFFICULTIES)){
    const options=matchOptions({format:'2v2',teamMode:'coop',difficulty});
    assert.equal(new Match(()=>.5,options).difficulty,difficulty);
    assert.equal(snapshot(new Match(()=>.5,options)).difficulty,difficulty);
  }
  assert.throws(()=>new Match(()=>.5,{difficulty:'impossible'}),/difficulty/);
  assert.throws(()=>matchOptions({difficulty:'impossible'}),/difficulty/);
});

test('easier computers react later, aim less accurately and fire less often without stat changes',()=>{
  const results=[];
  for(const difficulty of ['easy','normal','hard']){
    const match=arena(difficulty),bot=match.players[1];match.move=()=>{};
    let firstShot=null;
    for(let i=0;i<360;i++){
      match.time+=1/120;bot.pistolCooldown=Math.max(0,bot.pistolCooldown-1/120);match.think(1/120);
      if(bot.shots&&firstShot===null)firstShot=match.time;
    }
    results.push({firstShot,shots:bot.shots});
    assert.equal(bot.hp,100);assert.ok(match.bullets.every(b=>b.damage===WEAPONS.pistol.damage));
    match.random=()=>.9;match.aiState.get(bot.id).clock=0;match.think(1/120);
    assert.ok(Math.abs(match.aiState.get(bot.id).aim.x-240-AI_DIFFICULTIES[difficulty].aimError*.8)<.001);
  }
  assert.ok(results[0].firstShot>results[1].firstShot&&results[1].firstShot>results[2].firstShot);
  assert.ok(results[0].shots<results[1].shots&&results[1].shots<results[2].shots);
});

test('computer can dodge an approaching ordinary bullet between strategic decisions on both banks',()=>{
  for(const bank of [0,1]){
    const match=arena('normal'),bot=match.players[1],state=match.aiState.get(bot.id);
    bot.bank=bot.team=bank;bot.y=bank===0?740:220;match.players[0].team=1-bank;
    state.clock=10;state.waypoint={x:bot.x,y:bot.y};state.target={...state.waypoint};
    const vy=bank===0?540:-540;
    match.bullets=[{owner:0,type:'pistol',x:bot.x,y:bot.y-vy*.24,vx:0,vy,life:1}];
    for(let i=0;i<17;i++){
      match.time+=1/120;match.think(1/120);
      match.bullets[0].y+=vy/120;
    }
    assert.ok(bot.dodgeTime>0,`bank ${bank} reacts before impact`);
    assert.ok(Math.abs(bot.dodgeX)>.5,'moves across the bullet lane');
  }
});

test('live navigation does not sidestep every distant bullet before dodging can occur',()=>{
  for(const difficulty of ['normal','hard']){
    let seed=532;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    const match=new Match(random,{difficulty});match.obstacles=[];match.nextDrop=Infinity;match.nextEnvironmentEvent=Infinity;
    let rolls=0;
    for(let i=0;i<1200&&!match.finished;i++){
      // Isolate evasion from bullet cancellation by keeping the defender's pistol idle.
      match.players[1].pistolCooldown=10;match.players[0].x=match.players[1].x;
      match.update(1/60,{pistol:true});
      rolls+=match.events.filter(e=>e.type==='dodge'&&e.player===1).length;match.events=[];
    }
    assert.ok(rolls>0,`${difficulty} uses rolls during real movement`);
  }
});

test('Easy leaves substantially more openings than Normal across repeated shooting scenarios',()=>{
  const totals={};
  for(const difficulty of ['easy','normal']){
    totals[difficulty]={rolls:0,damage:0};
    for(const initial of [532,81,222,1501,93]){
      let seed=initial;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
      const match=new Match(random,{difficulty});match.obstacles=[];match.nextDrop=Infinity;match.nextEnvironmentEvent=Infinity;
      for(let i=0;i<1200&&!match.finished;i++){
        match.players[1].pistolCooldown=10;match.players[0].x=match.players[1].x;
        match.update(1/60,{pistol:true});
        totals[difficulty].rolls+=match.events.filter(e=>e.type==='dodge'&&e.player===1).length;match.events=[];
      }
      totals[difficulty].damage+=100-match.players[1].hp;
    }
  }
  assert.ok(totals.easy.damage>totals.normal.damage+150,'Easy actually takes more hits, not merely fewer dodge animations');
  assert.ok(totals.easy.rolls<totals.normal.rolls/2,'Easy leaves longer openings between evasions');
  assert.ok(totals.easy.rolls>0,'Easy still sometimes rolls');
});

test('Easy missed cues affect walking and rolling without forgetting permanent hazards',()=>{
  const match=arena('easy'),bot=match.players[1],state=match.aiState.get(bot.id);
  match.random=()=>.9;
  match.bullets=[{owner:0,type:'pistol',x:bot.x,y:bot.y+120,vx:0,vy:-540,life:1}];
  match.waste=[{x:bot.x+80,y:bot.y}];
  match.think(1/120);
  assert.equal(state.combatAware,false);
  assert.ok(match.aiHazards(bot).length>0,'ground contamination is still noticed');
  assert.equal(match.aiHazards(bot).some(zone=>zone.combat),false);
  for(let i=0;i<12;i++){match.time+=1/120;match.think(1/120);}
  assert.equal(state.combatAware,false,'fast dodge checks cannot turn a missed cue into perfect awareness');
  assert.equal(bot.dodgeTime,0);
});

test('dodge clears human laser charge and requires release and a fresh press, including online release packets',()=>{
  for(const bank of [0,1]){
    const match=arena(),player=match.players[bank];match.think=()=>{};player.controller='human';
    player.slot={type:'laser',ammo:2};player.charge=.8;player.specialHeld=true;
    const controls=Array.from({length:2},()=>({}));controls[bank]={special:true,dodge:true,x:1};
    match.update(1/120,controls);assert.equal(player.charge,0);assert.equal(player.laserCancelled,true);
    controls[bank].dodge=false;
    for(let i=0;i<90;i++)match.update(1/120,controls);
    assert.equal(player.dodgeTime,0);assert.equal(player.charge,0,'held button must not resume charging');
    assert.equal(match.fire(player,0,'special'),false,'local pointer release cannot shoot the canceled laser');
    controls[bank]={special:false,specialRelease:true};match.update(1/120,controls);
    assert.equal(player.slot.ammo,2);assert.equal(match.beams.length,0);assert.equal(player.laserCancelled,false);
    controls[bank]={special:true};match.update(1/120,controls);assert.ok(player.charge>0&&player.charge<.02);
  }
});

test('a failed dodge does not cancel a laser and a computer roll discards its old charge',()=>{
  const match=arena(),[player,bot]=match.players;
  player.slot={type:'laser',ammo:1};player.charge=.7;player.dodgeCooldown=.5;
  assert.equal(match.dodge(player,1,0),false);assert.equal(player.charge,.7);assert.equal(player.laserCancelled,false);
  bot.slot={type:'laser',ammo:1};bot.charge=.9;
  assert.equal(match.dodge(bot,1,0),true);assert.equal(bot.charge,0);
  match.time=1;match.think(1/120);assert.equal(bot.charge,0);
});
