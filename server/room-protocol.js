import { CHARACTER_BY_ID } from '../src/characters.js';
import { DROP_TYPES, GAME_MODES, MAP_TYPES } from '../src/model.js';

export const TICK_SECONDS = 1 / 60;
export const SNAPSHOT_EVERY_TICKS = 2;

export function matchOptions(value) {
  if (!value || typeof value !== 'object') throw new RangeError('Match options are required');
  const { format = '1v1', mode = GAME_MODES.RANDOM, map = MAP_TYPES[0], weapon } = value;
  if (!['1v1', '2v2'].includes(format)) throw new RangeError('Unknown match format');
  if (!Object.values(GAME_MODES).includes(mode)) throw new RangeError('Unknown weapon mode');
  if (!MAP_TYPES.includes(map)) throw new RangeError('Unknown map');
  if (mode === GAME_MODES.CHOOSE_FIXED && !DROP_TYPES.includes(weapon)) {
    throw new RangeError('Choose Fixed Weapon requires a valid weapon');
  }
  return { format, mode, map, ...(mode === GAME_MODES.CHOOSE_FIXED ? { weapon } : {}) };
}

export function fighterCount(format) {
  return format === '2v2' ? 4 : 2;
}

export function validCharacter(id) {
  return typeof id === 'string' && Object.hasOwn(CHARACTER_BY_ID, id);
}

export function sanitizeInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const axis = n => Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
  return {
    x: axis(value.x),
    y: axis(value.y),
    pistol: value.pistol === true,
    special: value.special === true,
    specialRelease: value.specialRelease === true,
    dodge: value.dodge === true,
  };
}

// Preserve short button presses across packets until the next simulation tick.
export function bufferInput(previous, value) {
  const input = sanitizeInput(value);
  if (!input) return null;
  input.dodge ||= previous?.dodge || false;
  input.specialRelease ||= previous?.specialRelease || false;
  return input;
}

export function consumeTransientInput(input) {
  if (!input) return;
  input.dodge = false;
  input.specialRelease = false;
}

export function lineupFromSeats(seats) {
  const [player, opponent, teammate, opponent2] = seats.map(seat => seat?.characterId);
  if (seats.some(seat => !validCharacter(seat?.characterId)) ||
    new Set(seats.map(seat => seat.characterId)).size !== seats.length) {
    throw new RangeError('Every fighter needs a distinct character');
  }
  return { player, opponent, ...(seats.length === 4 ? { teammate, opponent2 } : {}) };
}

export function snapshot(match) {
  return {
    id: match.id,
    time: match.time,
    finished: match.finished,
    ending: match.ending,
    winner: match.winner,
    map: match.map,
    mode: match.mode,
    fixedWeapon: match.fixedWeapon,
    format: match.format,
    launches: match.launches,
    marksRevision: match.marksRevision,
    players: match.players,
    bullets: match.bullets,
    pickups: match.pickups,
    flames: match.flames,
    platformAttacks: match.platformAttacks,
    platform: match.platform,
    obstacles: match.obstacles,
    effects: match.effects,
    beams: match.beams,
    marks: match.marks,
    waste: match.waste,
    mud: match.mud,
    lightning: match.lightning,
    tornadoes: match.tornadoes,
    rocksInFlight: match.rocksInFlight,
    volcanicFire: match.volcanicFire,
    ash: match.ash,
    sandstorm: match.sandstorm,
    eagles: match.eagles,
    quicksand: match.quicksand,
    mirages: match.mirages,
    icePatches: match.icePatches,
    avalanches: match.avalanches,
    hail: match.hail,
    events: match.events,
  };
}
