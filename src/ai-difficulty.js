export const DEFAULT_DIFFICULTY='easy';
export const AI_DIFFICULTIES=Object.freeze({
  easy:Object.freeze({name:'Easy',description:'More time to react. Less accurate opponents.',decision:.36,jitter:.14,reaction:.48,aimError:24,firePause:.28,dodgeChance:.55,dodgeReaction:.15}),
  normal:Object.freeze({name:'Normal',description:'Balanced reactions and steady pressure.',decision:.27,jitter:.10,reaction:.32,aimError:12,firePause:.12,dodgeChance:.75,dodgeReaction:.10}),
  hard:Object.freeze({name:'Hard',description:'Quick reactions and accurate counterattacks.',decision:.22,jitter:.12,reaction:.24,aimError:6,firePause:0,dodgeChance:.9,dodgeReaction:.07}),
});
export function validDifficulty(value){return typeof value==='string'&&Object.hasOwn(AI_DIFFICULTIES,value);}
