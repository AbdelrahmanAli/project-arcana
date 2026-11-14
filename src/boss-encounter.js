import { BANK_BOUNDS, W } from './arena-geometry.js';
import {bossDirection} from './boss-animation.js';

// Boss state has no soldier inventory, bank hazards, or controller input. The
// authoritative match owns it; clients only render snapshots of this state.
export const BOSS_DEFINITIONS = Object.freeze({
  riverside: { id: 'siegebreaker', name: 'SIEGEBREAKER', attacks: ['cannon', 'ricochet', 'broadside', 'turretSweep'] },
  storm: { id: 'nightWraith', name: 'NIGHT WRAITH', attacks: ['chain', 'spectralArc', 'decoys', 'thunderPulse'] },
  magma: { id: 'cinderGiant', name: 'CINDER GIANT', attacks: ['moltenFist', 'fissure', 'boulder', 'fragments'] },
  desert: { id: 'duneMaw', name: 'DUNE MAW', attacks: ['sandBlade', 'burrow', 'vortex', 'sandTeeth'] },
  snow: { id: 'frostColossus', name: 'FROST COLOSSUS', attacks: ['icicles', 'iceBeam', 'iceBoulder', 'frostWave'] },
});

const ATTACK_RULES = Object.freeze({
  cannon: { windup: .85, active: .45, recovery: .75, damage: 18, radius: 24 },
  ricochet: { windup: 1.1, active: .65, recovery: .9, damage: 21, radius: 36 },
  broadside: { windup: 1.05, active: .55, recovery: 1, damage: 23, radius: 32 },
  turretSweep: { windup: 1, active: .95, recovery: 1, damage: 13, radius: 22 },
  chain: { windup: .9, active: .55, recovery: .85, damage: 17, radius: 26 },
  spectralArc: { windup: .8, active: .7, recovery: .8, damage: 14, radius: 25 },
  decoys: { windup: .75, active: 1, recovery: .75, damage: 0, radius: 0 },
  thunderPulse: { windup: 1.15, active: .45, recovery: 1, damage: 22, radius: 38 },
  moltenFist: { windup: .9, active: .6, recovery: .9, damage: 19, radius: 32 },
  fissure: { windup: 1.2, active: .75, recovery: 1, damage: 16, radius: 28 },
  boulder: { windup: 1.1, active: .8, recovery: 1, damage: 24, radius: 35 },
  fragments: { windup: .8, active: .75, recovery: .85, damage: 12, radius: 20 },
  sandBlade: { windup: .9, active: .7, recovery: .8, damage: 15, radius: 27 },
  burrow: { windup: 1.2, active: .55, recovery: 1, damage: 22, radius: 32 },
  vortex: { windup: 1, active: 1, recovery: .8, damage: 9, radius: 42 },
  sandTeeth: { windup: .95, active: .5, recovery: .9, damage: 17, radius: 24 },
  icicles: { windup: .9, active: .75, recovery: .85, damage: 14, radius: 20 },
  iceBeam: { windup: 1.05, active: .7, recovery: .9, damage: 17, radius: 25 },
  iceBoulder: { windup: 1.15, active: .85, recovery: 1, damage: 21, radius: 34 },
  frostWave: { windup: .95, active: .65, recovery: .9, damage: 16, radius: 27 },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const BOSS_MOTION=Object.freeze({
  riverside:{patrol:70,evade:175},storm:{patrol:86,evade:190},
  magma:{patrol:54,evade:135},desert:{patrol:91,evade:195},snow:{patrol:58,evade:145},
});
const BOSS_LIMITS=Object.freeze({minX:95,maxX:W-95,minY:BANK_BOUNDS[1].minY+74,maxY:BANK_BOUNDS[1].maxY-74});
const point=(x,y,delay=0,scale=1)=>({x:clamp(x,30,W-30),y:clamp(y,BANK_BOUNDS[0].minY+20,BANK_BOUNDS[0].maxY-20),delay,scale});

// Every attack exposes its landing pattern during the windup. Staggered
// impacts preserve a dodge route instead of filling the entire bank at once.
export function bossAttackZones(type,x,y){
  const row=(count,spacing,delay=.13)=>Array.from({length:count},(_,i)=>point(x+(i-(count-1)/2)*spacing,y,i*delay));
  const column=(count,spacing,delay=.12)=>Array.from({length:count},(_,i)=>point(x,y+(i-(count-1)/2)*spacing,i*delay));
  switch(type){
    case 'cannon':return [point(x-33,y,0,.8),point(x+33,y,.13,.8)];
    case 'ricochet':case 'chain':return [point(x-46,y,0),point(x+52,y+28,.28)];
    case 'broadside':case 'fragments':case 'icicles':return row(3,53);
    case 'turretSweep':case 'fissure':case 'iceBeam':return column(4,58);
    case 'spectralArc':case 'sandBlade':return [point(x-54,y+18),point(x,y,.13),point(x+54,y+18,.26)];
    case 'thunderPulse':case 'moltenFist':case 'burrow':case 'iceBoulder':return [point(x,y,0,1.25)];
    case 'boulder':return [point(x,y,0,1.3),point(x-52,y+25,.22,.65),point(x+52,y+25,.32,.65)];
    case 'vortex':return [point(x,y,0,1.5),point(x,y,.32,1.1),point(x,y,.64,.75)];
    case 'sandTeeth':return [point(x-72,y),point(x+24,y,.12),point(x+72,y,.24)];
    case 'frostWave':return row(4,48,.1);
    case 'decoys':return [point(x-48,y,0,.7),point(x+48,y,.18,.7)];
    default:return [point(x,y)];
  }
}

export class BossEncounter {
  constructor(map, fighterCount = 1, random = Math.random) {
    const definition = BOSS_DEFINITIONS[map];
    if (!definition || ![1, 2].includes(fighterCount)) throw new RangeError('Unknown boss encounter');
    this.map = map;
    this.id = definition.id;
    this.name = definition.name;
    this.maxHp = fighterCount === 1 ? 500 : 800;
    this.hp = this.maxHp;
    this.x = W / 2;
    this.y = (BANK_BOUNDS[1].minY + BANK_BOUNDS[1].maxY) / 2;
    this.phase = 0;
    this.elapsed = 0;
    this.nextAttack = 1.4;
    this.sequence = 0;
    this.lastTargetId = null;
    this.weakPoint = 0;
    this.hitFlash=0;
    this.deathAge=0;
    this.current = null;
    this.patrolX=this.x;
    this.patrolY=this.y;
    this.nextPatrol=0;
    this.evadeX=this.x;
    this.evadeUntil=0;
    this.evadeCooldown=1;
    this.vx=0;
    this.vy=0;
    this.moving=false;
    this.facing=4;
    this.random = random;
    this.defeated = false;
  }

  damage(amount, hitWeakPoint = false) {
    if (this.defeated || !Number.isFinite(amount) || amount <= 0) return 0;
    const dealt = Math.min(this.hp, amount * (hitWeakPoint && this.weakPoint > 0 ? 1.5 : 1));
    this.hp -= dealt;
    this.hitFlash=.16;
    if (this.hp <= 0) this.defeated = true;
    return dealt;
  }

  move(step, fighters, threats) {
    const living=fighters.filter(fighter=>fighter.hp>0&&fighter.bank===0);
    if(!living.length)return;
    this.evadeCooldown=Math.max(0,this.evadeCooldown-step);
    const attack=this.current;
    const rules=attack&&ATTACK_RULES[attack.type];
    // The release pose stays planted; early windup and recovery permit a
    // sidestep without shifting a projectile already in flight.
    const braced=attack&&attack.type!=='decoys'&&attack.age>=rules.windup*.45&&attack.age<rules.windup+rules.active;
    if(!braced&&this.evadeCooldown<=0&&this.elapsed>=this.evadeUntil){
      const incoming=threats.filter(threat=>threat.eta>.16&&threat.eta<1.05&&Math.abs(threat.x-this.x)<95);
      if(incoming.length){
        this.evadeCooldown=.85;
        if(this.random()<.54){
          const choices=[clamp(this.x-95,BOSS_LIMITS.minX,BOSS_LIMITS.maxX),clamp(this.x+95,BOSS_LIMITS.minX,BOSS_LIMITS.maxX)];
          const safety=x=>Math.min(...incoming.map(threat=>Math.abs(x-threat.x)))-Math.abs(x-this.patrolX)*.08;
          this.evadeX=choices[Number(safety(choices[1])>safety(choices[0]))];
          if(Math.abs(this.evadeX-this.x)>25){
            this.evadeUntil=this.elapsed+.65;
            this.evadeCooldown=2.25+this.random()*.8;
            this.nextPatrol=this.evadeUntil+1.1;
          }
        }
      }
    }
    if(this.elapsed>=this.nextPatrol&&this.elapsed>=this.evadeUntil){
      const focus=living[Math.floor(this.random()*living.length)];
      const offset=(this.random()-.5)*190;
      let x=clamp(focus.x+offset,BOSS_LIMITS.minX,BOSS_LIMITS.maxX);
      if(Math.abs(x-this.x)<55)x=clamp(this.x+(this.x<W/2?85:-85),BOSS_LIMITS.minX,BOSS_LIMITS.maxX);
      this.patrolX=x;
      this.patrolY=clamp((BANK_BOUNDS[1].minY+BANK_BOUNDS[1].maxY)/2+(this.random()-.5)*84,BOSS_LIMITS.minY,BOSS_LIMITS.maxY);
      this.nextPatrol=this.elapsed+2.4+this.random()*1.2;
    }
    const evading=this.elapsed<this.evadeUntil;
    const targetX=evading?this.evadeX:this.patrolX;
    const {patrol,evade}=BOSS_MOTION[this.map];
    const speed=evading?evade:patrol;
    const desiredX=braced?0:clamp((targetX-this.x)*2.8,-speed,speed);
    const desiredY=braced||evading?0:clamp((this.patrolY-this.y)*2.5,-patrol*.55,patrol*.55);
    const easing=1-Math.exp(-step*(evading?12:6));
    this.vx+=(desiredX-this.vx)*easing;
    this.vy+=(desiredY-this.vy)*easing;
    this.x=clamp(this.x+this.vx*step,BOSS_LIMITS.minX,BOSS_LIMITS.maxX);
    this.y=clamp(this.y+this.vy*step,BOSS_LIMITS.minY,BOSS_LIMITS.maxY);
    this.moving=Math.hypot(this.vx,this.vy)>13;
    if(this.moving)this.facing=bossDirection(this.vx,this.vy,this.facing);
  }

  update(dt, fighters, threats=[]) {
    if (this.defeated) return [];
    const events = [];
    const step = clamp(dt, 0, 1 / 30);
    this.elapsed += step;
    this.move(step,fighters,threats);
    this.weakPoint = Math.max(0, this.weakPoint - step);
    this.hitFlash=Math.max(0,this.hitFlash-step);
    const nextPhase = this.hp <= this.maxHp * .35 ? 2 : this.hp <= this.maxHp * .7 ? 1 : 0;
    if (nextPhase > this.phase) {
      this.phase = nextPhase;
      this.weakPoint = 1.8;
      events.push({ type: 'bossPhase', phase: this.phase });
    }
    if (this.current) {
      const attack = this.current;
      attack.age += step;
      const rules = ATTACK_RULES[attack.type];
      if (!attack.fired && attack.age >= rules.windup) {
        attack.fired = true;
        events.push({ ...attack, attack: attack.type, type: 'bossAttack' });
      }
      if (attack.age >= rules.windup + rules.active + rules.recovery) {
        this.current = null;
        this.weakPoint = 1.2;
        this.nextAttack = this.elapsed + Math.max(.35, .8 - this.phase * .15);
      }
      return events;
    }
    if (this.elapsed < this.nextAttack) return events;
    const living = fighters.filter(fighter => fighter.hp > 0 && fighter.bank === 0);
    if (!living.length) return events;
    const alternatives = living.filter(fighter => fighter.id !== this.lastTargetId);
    const targets = alternatives.length ? alternatives : living;
    const target = targets[Math.floor(this.random() * targets.length)];
    this.lastTargetId = target.id;
    const types = BOSS_DEFINITIONS[this.map].attacks;
    const type = types[(this.sequence + Math.floor(this.random() * Math.min(2, types.length))) % types.length];
    this.sequence++;
    this.current = { type, targetId: target.id, x: clamp(target.x, 35, W - 35), y: clamp(target.y, BANK_BOUNDS[0].minY + 25, BANK_BOUNDS[0].maxY - 25), age: 0, windup:ATTACK_RULES[type].windup, active:ATTACK_RULES[type].active, radius:ATTACK_RULES[type].radius, fired: false };
    events.push({ type: 'bossWindup', attack: type, targetId: target.id, x: this.current.x, y: this.current.y, zones:bossAttackZones(type,this.current.x,this.current.y), duration: ATTACK_RULES[type].windup });
    return events;
  }

  attackRules(type) { return ATTACK_RULES[type]; }

  snapshot() {
    const { random, ...state } = this;
    return structuredClone(state);
  }
}
