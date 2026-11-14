import { BANK_BOUNDS, W } from './model.js';

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
    this.current = null;
    this.random = random;
    this.defeated = false;
  }

  damage(amount, hitWeakPoint = false) {
    if (this.defeated || !Number.isFinite(amount) || amount <= 0) return 0;
    const dealt = Math.min(this.hp, amount * (hitWeakPoint && this.weakPoint > 0 ? 1.5 : 1));
    this.hp -= dealt;
    if (this.hp <= 0) this.defeated = true;
    return dealt;
  }

  update(dt, fighters) {
    if (this.defeated) return [];
    const events = [];
    const step = clamp(dt, 0, 1 / 30);
    this.elapsed += step;
    this.weakPoint = Math.max(0, this.weakPoint - step);
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
    this.current = { type, targetId: target.id, x: clamp(target.x, 35, W - 35), y: clamp(target.y, BANK_BOUNDS[0].minY + 25, BANK_BOUNDS[0].maxY - 25), age: 0, fired: false };
    events.push({ type: 'bossWindup', attack: type, targetId: target.id, x: this.current.x, y: this.current.y, duration: ATTACK_RULES[type].windup });
    return events;
  }

  attackRules(type) { return ATTACK_RULES[type]; }

  snapshot() {
    const { random, ...state } = this;
    return structuredClone(state);
  }
}
