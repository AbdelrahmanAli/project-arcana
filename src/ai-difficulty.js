export const DEFAULT_DIFFICULTY='normal';
export const AI_DIFFICULTIES=Object.freeze({
  easy:Object.freeze({name:'Easy',description:'Slower attacks, fewer dodges, more openings.',decision:.5,jitter:.2,reaction:.7,aimError:32,firePause:.55,dodgeChance:.3,dodgeReaction:.18,dodgeRetry:1.25,combatAwareness:.45}),
  normal:Object.freeze({name:'Normal',description:'Steady pressure with room to counterattack.',decision:.34,jitter:.12,reaction:.45,aimError:18,firePause:.28,dodgeChance:.5,dodgeReaction:.15,dodgeRetry:.8,combatAwareness:.7}),
  hard:Object.freeze({name:'Hard',description:'Fast pressure. Narrower openings.',decision:.26,jitter:.10,reaction:.32,aimError:10,firePause:.14,dodgeChance:.7,dodgeReaction:.11,dodgeRetry:.5,combatAwareness:.88}),
});
export function validDifficulty(value){return typeof value==='string'&&Object.hasOwn(AI_DIFFICULTIES,value);}
