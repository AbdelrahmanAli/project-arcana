import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';
import {BOSS_SOUND_PROFILES,SAMPLE_RATE,synthesizeBossSound,synthesizeBossWindup} from '../src/boss-audio-synthesis.js';

const audioDirectory=join(process.cwd(),'public','audio','bosses');
const metadataDirectory=join(process.cwd(),'src','generated');
mkdirSync(audioDirectory,{recursive:true});mkdirSync(metadataDirectory,{recursive:true});
const metadata={};

function mixLevel(samples,target){
  const rms=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
  const peak=samples.reduce((max,value)=>Math.max(max,Math.abs(value)),0);
  const gain=Math.min(target/Math.max(.001,rms),.86/Math.max(.001,peak),2.4);
  return samples.map(value=>value*gain);
}

function encodeWav(samples){
  const buffer=Buffer.alloc(44+samples.length*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(SAMPLE_RATE,24);buffer.writeUInt32LE(SAMPLE_RATE*2,28);
  buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);
  buffer.writeUInt32LE(samples.length*2,40);
  samples.forEach((sample,index)=>buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+index*2));
  return buffer;
}

for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
  const profile=BOSS_SOUND_PROFILES[map],clips={},segments=[];
  let position=0;
  const add=(name,samples)=>{
    clips[name]=[Math.round(position/SAMPLE_RATE*1000),Math.round(samples.length/SAMPLE_RATE*1000)];
    segments.push(samples,new Float32Array(Math.round(.07*SAMPLE_RATE)));
    position+=samples.length+Math.round(.07*SAMPLE_RATE);
  };
  add('move',mixLevel(synthesizeBossSound(profile.move.sound,definition.name.length*301),.07));
  for(const [index,attack] of definition.attacks.entries()){
    const spec=profile.attacks[attack],seed=definition.name.length*401+index*977;
    if(!spec)throw new Error(`Missing ${map} ${attack} sound design`);
    add(`windup-${attack}`,mixLevel(synthesizeBossWindup(spec,seed),.05));
    add(`attack-${attack}`,mixLevel(synthesizeBossSound(spec,seed),.1));
  }
  const samples=new Float32Array(position);
  let offset=0;
  for(const segment of segments){samples.set(segment,offset);offset+=segment.length;}
  writeFileSync(join(audioDirectory,`${map}.wav`),encodeWav(samples));
  metadata[map]={sprites:clips,moveInterval:profile.move.interval,moveVolume:profile.move.volume};
  console.log(`${map}.wav (${(samples.length/SAMPLE_RATE).toFixed(1)}s)`);
}

writeFileSync(join(metadataDirectory,'boss-audio-sprites.json'),JSON.stringify(metadata));
