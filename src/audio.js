import { Howl, Howler } from 'howler';

// Original synthesized prototype effects, played and mixed exclusively by Howler.
function pcmWav(duration, sampleAt) {
  const rate=22050,n=Math.floor(rate*duration),buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer);
  const str=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-32767,Math.min(32767,sampleAt(i/rate,i,n)*32767)),true);
  const bytes=new Uint8Array(buffer);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
  return 'data:audio/wav;base64,'+btoa(bin);
}
function wav(duration, frequency, noise, decay = 5) {
  let seed=1337,low=0;
  return pcmWav(duration,(t,i,n)=>{
    seed=(seed*1664525+1013904223)>>>0;
    const envelope=Math.min(1,i/50)*Math.exp(-decay*i/n);
    const white=seed/2147483648-1;low=low*.6+white*.4;
    const tone=Math.sin(2*Math.PI*frequency*(t-.28*t*t/duration));
    return (tone*(1-noise)+low*noise)*envelope*.8;
  });
}
function flameBlastWav() {
  let seed=7829,low=0,mid=0;
  return pcmWav(.85,(t)=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.86+white*.14;
    mid=mid*.48+white*.52;
    const ignition=white*Math.exp(-t*75)*.75;
    const firstJet=Math.max(0,1-Math.exp(-t*38))*Math.exp(-t*3.8);
    const secondAge=Math.max(0,t-.11);
    const secondJet=t>=.11?(1-Math.exp(-secondAge*38))*Math.exp(-secondAge*5):0;
    const rush=(low*.52+mid*.35+white*.1)*(firstJet+secondJet*.62);
    return (ignition+rush)*.75;
  });
}
function waterWav() {
  const duration=4;
  let seed=27183,low=0,mid=0;
  return pcmWav(duration,(t)=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.93+white*.07;
    mid=mid*.64+white*.36;
    const gentleSwell=.87+.08*Math.sin(2*Math.PI*t/duration);
    const loopEdge=Math.max(0,Math.min(1,t/.045,(duration-t)/.045));
    return (low*.7+mid*.18+white*.015)*gentleSwell*loopEdge*.65;
  });
}
export class Sound {
  constructor(){this.muted=false;this.ready=false;this.clips={};this.burning=false;this.watering=false;this.towerPhase=null;}
  init(){
    if(this.ready){Howler.ctx?.resume();return;}
    this.ready=true;
    const defs={pistol:[.12,130,.8],rifle:[.1,150,.85],shotgun:[.3,70,.95],grenade:[.2,110,.6],missile:[.45,160,.8],laser:[.48,760,.16],pickup:[.19,850,.05],hit:[.12,70,.9],explosion:[.7,45,.98],launch:[.24,180,.65],death:[.9,60,.9]};
    for(const [name,args]of Object.entries(defs))this.clips[name]=new Howl({src:[wav(...args)],format:['wav'],volume:name==='rifle'?.15:.22,preload:true,pool:8});
    this.clips.burning=new Howl({src:[wav(1.7,48,.97,.35)],format:['wav'],volume:.18,loop:true,preload:true});
    this.clips.retaliation=new Howl({src:[flameBlastWav()],format:['wav'],volume:.35,preload:true});
    this.clips.riseAlarm=new Howl({src:[`${import.meta.env.BASE_URL}audio/red-alert-nuclear-buzzer.mp3`],format:['mp3'],sprite:{alert:[0,3700]},volume:.23,preload:true});
    this.clips.water=new Howl({src:[waterWav()],format:['wav'],volume:0,loop:true,preload:true});
    Howler.ctx?.resume();
  }
  play(name,x){if(this.muted||!this.ready)return;const s=this.clips[name];if(s){const id=s.play();if(x!==undefined)s.stereo((x/480-.5)*.6,id);}}
  burn(active){if(!this.ready||this.burning===active)return;this.burning=active;if(active)this.clips.burning.play();else this.clips.burning.stop();}
  tower(phase,height,progress){
    if(!this.ready)return;
    if(phase!==this.towerPhase){
      this.towerPhase=phase;
      if(phase==='rise'&&progress<.15&&!this.muted)this.clips.riseAlarm.play('alert');
    }
    const wet=phase!=='rest'&&height>.015;
    if(wet!==this.watering){this.watering=wet;if(wet)this.clips.water.play();else this.clips.water.stop();}
    if(wet)this.clips.water.volume(.025+.06*Math.min(1,height*2));
  }
  toggle(){this.muted=!this.muted;Howler.mute(this.muted);return this.muted;}
  stop(){this.burning=false;this.watering=false;this.towerPhase=null;Howler.stop();}
}
