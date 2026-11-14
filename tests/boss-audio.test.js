import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';
import {BOSS_SOUND_PROFILES,synthesizeBossSound,synthesizeBossWindup} from '../src/boss-audio-synthesis.js';
import metadata from '../src/generated/boss-audio-sprites.json' with {type:'json'};

test('all five bosses and twenty attacks have distinct audible cues',()=>{
  const fingerprints=new Set();
  for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
    const profile=BOSS_SOUND_PROFILES[map];
    assert.ok(profile?.move,`${map} movement cue`);
    for(const [name,sound] of [['move',profile.move.sound],...definition.attacks.map(attack=>[attack,profile.attacks[attack]])]){
      assert.ok(sound,`${map} ${name} cue`);
      const samples=synthesizeBossSound(sound,name.length*17);
      assert.ok(samples.every(Number.isFinite),`${map} ${name} has invalid samples`);
      const level=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
      assert.ok(level>.006,`${map} ${name} is too quiet`);
      const fingerprint=createHash('sha256').update(Buffer.from(samples.buffer)).digest('hex');
      assert.ok(!fingerprints.has(fingerprint),`${map} ${name} repeats another cue`);
      fingerprints.add(fingerprint);
    }
    for(const attack of definition.attacks)assert.ok(synthesizeBossWindup(profile.attacks[attack]).length>0);
  }
  assert.equal(fingerprints.size,25);
});

test('Howler sprites cover every generated cue and stay within their WAV files',()=>{
  for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
    const wav=readFileSync(new URL(`../public/audio/bosses/${map}.wav`,import.meta.url));
    assert.equal(wav.toString('ascii',0,4),'RIFF');
    assert.equal(wav.toString('ascii',8,12),'WAVE');
    const duration=wav.readUInt32LE(40)/wav.readUInt32LE(28)*1000;
    const sprites=metadata[map].sprites;
    assert.deepEqual(Object.keys(sprites),['move',...definition.attacks.flatMap(attack=>[`windup-${attack}`,`attack-${attack}`])]);
    for(const [name,[offset,length]] of Object.entries(sprites)){
      assert.ok(length>100&&offset>=0&&offset+length<=duration+1,`${map} ${name} exceeds WAV duration`);
    }
  }
});
