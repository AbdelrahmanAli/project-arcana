export const DEFAULT_DIFFICULTY='normal';
export const AI_DIFFICULTIES=Object.freeze({
  easy:Object.freeze({name:'Easy',description:'Slower attacks, fewer dodges, more openings.',decision:.5,jitter:.2,reaction:.7,aimError:32,firePause:.55,dodgeChance:.3,dodgeReaction:.18,dodgeRetry:1.25,combatAwareness:.45}),
  normal:Object.freeze({name:'Normal',description:'Balanced reactions and steady pressure.',decision:.27,jitter:.10,reaction:.32,aimError:12,firePause:.12,dodgeChance:.75,dodgeReaction:.10,dodgeRetry:.3,combatAwareness:1}),
  hard:Object.freeze({name:'Hard',description:'Quick reactions and accurate counterattacks.',decision:.22,jitter:.12,reaction:.24,aimError:6,firePause:0,dodgeChance:.9,dodgeReaction:.07,dodgeRetry:.3,combatAwareness:1}),
});
export function validDifficulty(value){return typeof value==='string'&&Object.hasOwn(AI_DIFFICULTIES,value);}
