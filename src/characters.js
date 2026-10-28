export const CHARACTERS = Object.freeze([
  { id: 'elias', name: 'Elias', gender: 'man', color: '#31a9d2', gear: 'Cobalt armor and cyan visor' },
  { id: 'dorian', name: 'Dorian', gender: 'man', color: '#d94b3f', gear: 'Scarlet armor and charcoal gear' },
  { id: 'tomas', name: 'Tomas', gender: 'man', color: '#d99a32', gear: 'Amber shoulder armor and utility rig' },
  { id: 'nadia', name: 'Nadia', gender: 'woman', color: '#8e68cd', gear: 'Violet armor and compact field pack' },
  { id: 'imani', name: 'Imani', gender: 'woman', color: '#56b778', gear: 'Emerald vest and lime tabs' },
  { id: 'mara', name: 'Mara', gender: 'woman', color: '#d85aa2', gear: 'Magenta helmet and navy combat gear' },
]);

export const CHARACTER_BY_ID = Object.freeze(Object.fromEntries(CHARACTERS.map(character => [character.id, character])));

export function resolveLineup(random, playerCharacter, format = '1v1', selections = {}) {
  if (!CHARACTER_BY_ID[playerCharacter]) throw new RangeError('Unknown player character');
  if (!['1v1', '2v2'].includes(format)) throw new RangeError('Unknown match format');
  const slots = format === '2v2' ? ['teammate', 'opponent', 'opponent2'] : ['opponent'];
  const requested = slots.map(slot => selections[slot] || 'random');
  const chosen = new Set([playerCharacter]);
  for (const choice of requested) {
    if (choice === 'random') continue;
    if (!CHARACTER_BY_ID[choice] || chosen.has(choice)) throw new RangeError('Duplicate or unknown character');
    chosen.add(choice);
  }
  const result = { player: playerCharacter };
  slots.forEach((slot, index) => {
    if (requested[index] !== 'random') { result[slot] = requested[index]; return; }
    const available = CHARACTERS.filter(character => !chosen.has(character.id));
    const picked = available[Math.min(available.length - 1, Math.floor(random() * available.length))].id;
    result[slot] = picked;
    chosen.add(picked);
  });
  return result;
}
