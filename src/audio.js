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
function fireWhooshWav() {
  let seed=7829,low=0,mid=0;
  return pcmWav(.72,(t)=>{
    if(t<.1)return 0;
    const rushTime=t-.1;
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.81+white*.19;
    mid=mid*.5+white*.5;
    const envelope=Math.min(1,rushTime/.035)*Math.exp(-rushTime*5.8);
    return (low*.55+mid*.26+white*.09)*envelope*.85;
  });
}
function grenadeLaunchWav() {
  let seed=4321,low=0;
  return pcmWav(.38,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.65+white*.35;
    const clack=Math.sin(2*Math.PI*390*t)*Math.exp(-t*24);
    const thump=Math.sin(2*Math.PI*(105-45*t)*t)*Math.exp(-t*10);
    const vent=low*Math.min(1,t*30)*Math.exp(-t*8);
    return (clack*.27+thump*.5+vent*.26)*Math.min(1,t/.006);
  });
}
function stunBlastWav() {
  let seed=7727;
  return pcmWav(.55,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    const crack=white*Math.exp(-t*30)*.42;
    const ring=Math.sin(2*Math.PI*(1350-420*t)*t)*Math.exp(-t*5)*.27;
    return crack+ring;
  });
}
function nuclearLaunchWav(){
  let seed=5183,low=0;
  return pcmWav(.45,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    low=low*.7+(seed/2147483648-1)*.3;
    const kick=Math.sin(2*Math.PI*(95-35*t)*t)*Math.exp(-t*11)*.5;
    const charge=Math.sin(2*Math.PI*(320+250*t)*t)*Math.exp(-t*6)*.25;
    return (kick+charge+low*Math.exp(-t*8)*.18)*Math.min(1,t/.008);
  });
}
function nuclearBlastWav(){
  let seed=9917,low=0;
  return pcmWav(.75,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    low=low*.82+(seed/2147483648-1)*.18;
    const thump=Math.sin(2*Math.PI*(75-32*t)*t)*Math.exp(-t*4.8)*.5;
    const hiss=low*Math.exp(-t*5)*.4;
    return (thump+hiss)*Math.min(1,t/.004);
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
    const defs={pistol:[.12,130,.8],rifle:[.1,150,.85],shotgun:[.3,70,.95],missile:[.45,160,.8],laser:[.48,760,.16],pickup:[.19,850,.05],landing:[.13,105,.8],hit:[.12,70,.9],explosion:[.7,45,.98],launch:[.24,180,.65],death:[.9,60,.9]};
    for(const [name,args]of Object.entries(defs))this.clips[name]=new Howl({src:[wav(...args)],format:['wav'],volume:name==='rifle'?.15:name==='landing'?.11:.22,preload:true,pool:8});
    this.clips.grenade=new Howl({src:[grenadeLaunchWav()],format:['wav'],volume:.38,preload:true,pool:8});
    this.clips.stunBlast=new Howl({src:[stunBlastWav()],format:['wav'],volume:.3,preload:true,pool:8});
    this.clips.nuclear=new Howl({src:[nuclearLaunchWav()],format:['wav'],volume:.32,preload:true,pool:8});
    this.clips.nuclearBlast=new Howl({src:[nuclearBlastWav()],format:['wav'],volume:.34,preload:true,pool:8});
    this.clips.crateBreak=new Howl({src:[wav(.25,180,.9,12)],format:['wav'],volume:.25,preload:true,pool:8});
    this.clips.crateHit=new Howl({src:[wav(.11,225,.72,18)],format:['wav'],volume:.19,preload:true,pool:8});
    this.clips.barrelBlast=new Howl({src:[wav(.64,62,.9,5)],format:['wav'],volume:.3,preload:true,pool:8});
    this.clips.burning=new Howl({src:[wav(1.7,48,.97,.35)],format:['wav'],volume:.18,loop:true,preload:true});
    this.clips.towerImpact=new Howl({src:[wav(.36,85,.88,8)],format:['wav'],volume:.27,preload:true});
    this.clips.retaliation=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.31,preload:true});
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
