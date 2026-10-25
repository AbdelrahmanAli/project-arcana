import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';

test('missile flight audio follows each live missile and stops at impact',()=>{
  const sound=new Sound(),calls={play:0,stop:[],pan:[],volume:[],rate:[]};
  sound.ready=true;
  sound.clips.missileFlight={
    play:()=>++calls.play,
    stop:id=>calls.stop.push(id),
    stereo:(value,id)=>calls.pan.push([id,value]),
    volume:(value,id)=>calls.volume.push([id,value]),
    rate:(value,id)=>calls.rate.push([id,value]),
  };
  const missile={id:7,type:'missile',x:120,travel:0,targetDistance:400};
  sound.syncMissiles([missile]);
  missile.x=320;missile.travel=300;sound.syncMissiles([missile]);
  assert.equal(calls.play,1,'flight loop starts once');
  assert.ok(calls.pan[1][1]>calls.pan[0][1],'sound follows the missile across the arena');
  assert.ok(calls.rate[1][1]>calls.rate[0][1],'approach raises the flight pitch');
  sound.syncMissiles([]);
  assert.deepEqual(calls.stop,[1],'flight loop stops when the missile explodes');
  assert.equal(sound.missileVoices.size,0);
});
