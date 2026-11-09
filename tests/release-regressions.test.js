import test from 'node:test';
import assert from 'node:assert/strict';
import {missileAltitude,missilePitch} from '../src/missile-flight.js';
import {encodeCheckpoint,decodeCheckpoint} from '../server/checkpoint.js';
import {Match,MAP_TYPES} from '../src/model.js';
test('missile projection advances toward the target from either bank without flipping',()=>{
  for(const dy of [-700,-216,216,700])for(const dx of [-394,0,394]){
    const d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;let last=0;
    for(let i=0;i<=1000;i++){
      const p=i/1000,y=dy*p-missileAltitude(p,d,uy),pitch=missilePitch(p,d,ux,uy);
      assert.ok(Number.isFinite(pitch));
      if(i)assert.ok((y-last)*Math.sign(dy)>0,'screen path never reverses');
      assert.ok(Math.sin(pitch)*Math.sign(dy)>0,'nose faces forward');last=y;
    }
    assert.equal(missileAltitude(0,d,uy),0);assert.equal(missileAltitude(1,d,uy),0);
  }
});
test('checkpoint preserves hazard hit history and AI maps through JSON storage',()=>{
  const match=new Match();match.platformAttacks=[{damaged:new Set([0,2])}];match.avalanches=[{hit:new Set([1]),evaded:new Set([0])}];
  const restored=decodeCheckpoint(JSON.parse(JSON.stringify(encodeCheckpoint(match))));
  assert.ok(restored.aiState instanceof Map);
  assert.equal(restored.aiState.get(1).lastSeenAt,-Infinity);
  assert.equal(restored.platformAttacks[0].damaged.has(2),true);
  assert.equal(restored.avalanches[0].hit.has(1),true);
  assert.equal(restored.avalanches[0].evaded.has(0),true);
  assert.equal(restored.random,undefined);
  assert.deepEqual(decodeCheckpoint({time:12,players:[]}),{time:12,players:[]});
});

test('restored four-fighter matches continue identically on every map',()=>{
  for(const map of MAP_TYPES){
    const options={map,format:'2v2',controllers:Array(4).fill('computer')};
    const match=new Match(()=>.41,options);
    for(let tick=0;tick<600;tick++){match.update(1/60);match.events=[];}
    const restored=Object.assign(new Match(()=>.41,options),decodeCheckpoint(encodeCheckpoint(match)));
    for(let tick=0;tick<120;tick++){
      match.update(1/60);restored.update(1/60);
      match.events=[];restored.events=[];
    }
    assert.deepEqual(encodeCheckpoint(restored),encodeCheckpoint(match),map);
  }
});
