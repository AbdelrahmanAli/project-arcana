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
function dodgeDeniedWav(){
  return pcmWav(.19,t=>{
    const first=t<.055?(1-t/.055)*Math.sin(2*Math.PI*490*t):0;
    const next=t-.095;
    const second=next>=0&&next<.07?(1-next/.07)*Math.sin(2*Math.PI*330*next):0;
    return (first+second)*.35;
  });
}
function healWav(){
  return pcmWav(.42,t=>{
    const rise=Math.sin(2*Math.PI*(480*t+360*t*t))*Math.exp(-t*7);
    const chime=Math.sin(2*Math.PI*840*t)*Math.exp(-Math.max(0,t-.13)*11)*(t>.13?.55:0);
    return (rise*.27+chime*.2)*Math.min(1,t/.015);
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
function weatherWav(kind){
  const duration=3;let seed=kind==='rain'?17329:59381,low=0,mid=0;
  return pcmWav(duration,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;low=low*.92+white*.08;mid=mid*.62+white*.38;
    const edge=Math.min(1,t/.06,(duration-t)/.06);
    return kind==='rain'?(mid*.26+white*.09+low*.12)*edge*.55:(low*.65+mid*.12)*edge*.42;
  });
}
function tornadoWindWav(pull=false){
  const duration=pull?.55:1.15;let seed=pull?7193:10457,low=0,mid=0;
  return pcmWav(duration,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.88+white*.12;mid=mid*.56+white*.44;
    const envelope=pull?Math.min(1,t/.025)*Math.exp(-t*4.3):Math.sin(Math.PI*t/duration)**.7;
    const whine=Math.sin(2*Math.PI*(pull?105*t+145*t*t:72*t+35*t*t));
    return (low*.58+mid*.19+whine*(pull?.17:.08))*envelope*.72;
  });
}
function phase6WindWav(){
  const duration=8.5;let seed=83217,low=0;
  return pcmWav(duration,t=>{seed=(seed*1664525+1013904223)>>>0;const white=seed/2147483648-1;low=low*.91+white*.09;return low*.34*Math.min(1,t/.4,(duration-t)/.55);});
}
function eagleAttackWav(){
  let seed=31891,wind=0;
  return pcmWav(.52,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    wind=wind*.72+(seed/2147483648-1)*.28;
    const sweep=Math.sin(2*Math.PI*(690*t-450*t*t));
    const dive=Math.sin(2*Math.PI*(235*t-125*t*t));
    const envelope=Math.sin(Math.PI*Math.min(1,t/.52))**.8;
    return (wind*.33+sweep*.22+dive*.16)*envelope;
  });
}
function scorpionBiteWav(){
  let seed=9127,crunch=0;
  return pcmWav(.3,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    crunch=crunch*.46+(seed/2147483648-1)*.54;
    const snap=Math.sin(2*Math.PI*(1050*t-650*t*t))*Math.exp(-t*33);
    const sting=Math.sin(2*Math.PI*(330*t+240*t*t))*Math.exp(-t*12);
    return snap*.42+crunch*Math.exp(-t*19)*.32+sting*.18;
  });
}
export class Sound {
  constructor(){this.muted=false;this.ready=false;this.clips={};this.burning=false;this.watering=false;this.towerPhase=null;this.ambientMap=null;}
  init(){
    if(this.ready){Howler.ctx?.resume();return;}
    this.ready=true;
    const defs={pistol:[.12,130,.8],rifle:[.1,150,.85],shotgun:[.3,70,.95],laser:[.48,760,.16],pickup:[.19,850,.05],landing:[.13,105,.8],hit:[.12,70,.9],explosion:[.7,45,.98],launch:[.24,180,.65],death:[.9,60,.9]};
    for(const [name,args]of Object.entries(defs))this.clips[name]=new Howl({src:[wav(...args)],format:['wav'],volume:name==='rifle'?.15:name==='landing'?.11:.22,preload:true,pool:8});
    this.clips.empty=new Howl({src:[pcmWav(.16,t=>Math.sin(2*Math.PI*(t<.065?420*t:420*.065+290*(t-.065)))*Math.exp(-t*19)*.38)],format:['wav'],volume:.2,preload:true,pool:4});
    this.clips.dodgeDenied=new Howl({src:[dodgeDeniedWav()],format:['wav'],volume:.22,preload:true,pool:4});
    this.clips.heal=new Howl({src:[healWav()],format:['wav'],volume:.28,preload:true,pool:4});
    this.clips.crateLoot=new Howl({src:[wav(.2,370,.3,13)],format:['wav'],volume:.18,preload:true,pool:8});
    this.clips.missile=new Howl({src:[`${import.meta.env.BASE_URL}audio/smart-missile.mp3`],format:['mp3'],volume:.4,preload:true,pool:8});
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
    this.clips.rain=new Howl({src:[weatherWav('rain')],format:['wav'],volume:.045,loop:true,preload:true});
    this.clips.lava=new Howl({src:[weatherWav('lava')],format:['wav'],volume:.04,loop:true,preload:true});
    this.clips.lightningCharge=new Howl({src:[wav(.43,620,.3,4)],format:['wav'],volume:.12,preload:true});
    this.clips.lightningStrike=new Howl({src:[wav(.68,63,.95,5)],format:['wav'],volume:.34,preload:true});
    this.clips.tornado=new Howl({src:[tornadoWindWav()],format:['wav'],volume:.16,preload:true});
    this.clips.tornadoPull=new Howl({src:[tornadoWindWav(true)],format:['wav'],volume:.31,preload:true,pool:4});
    this.clips.ash=new Howl({src:[weatherWav('lava')],format:['wav'],volume:.12,preload:true});
    this.clips.volcanoRockLaunch=new Howl({src:[wav(.45,93,.75,5)],format:['wav'],volume:.21,preload:true});
    this.clips.volcanoFireLaunch=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.2,preload:true});
    this.clips.volcanoRockImpact=new Howl({src:[wav(.55,66,.9,6)],format:['wav'],volume:.3,preload:true});
    this.clips.volcanoFireImpact=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.27,preload:true});
    this.clips.rockBreak=new Howl({src:[wav(.3,120,.83,10)],format:['wav'],volume:.2,preload:true});
    for(const [name,duration,freq,noise,volume] of [
      ['eagle',.6,680,.32,.21],['eagleHit',.25,200,.75,.25],['quicksand',.55,78,.8,.17],
      ['mirageSun',.55,860,.15,.11],['scorpionReveal',.28,490,.6,.19],
      ['avalanche',1.1,65,.92,.22],['avalancheHit',.52,72,.94,.26],['hail',.65,330,.78,.13],['hailImpact',.22,430,.76,.16],['iceSlide',.26,620,.5,.09],
    ])this.clips[name]=new Howl({src:[wav(duration,freq,noise,5)],format:['wav'],volume,preload:true,pool:8});
    this.clips.eagleAttack=new Howl({src:[eagleAttackWav()],format:['wav'],volume:.27,preload:true,pool:8});
    this.clips.scorpionBite=new Howl({src:[scorpionBiteWav()],format:['wav'],volume:.31,preload:true,pool:8});
    this.clips.sandstorm=new Howl({src:[phase6WindWav()],format:['wav'],volume:.24,preload:true});
    Howler.ctx?.resume();
  }
  play(name,x){if(this.muted||!this.ready)return;const s=this.clips[name];if(s){const id=s.play();if(x!==undefined)s.stereo((x/480-.5)*.6,id);}}
  burn(active){if(!this.ready||this.burning===active)return;this.burning=active;if(active)this.clips.burning.play();else this.clips.burning.stop();}
  environment(map){
    if(!this.ready||this.ambientMap===map)return;
    for(const name of ['rain','lava'])this.clips[name].stop();
    this.ambientMap=map;
    if(map==='storm')this.clips.rain.play();
    else if(map==='magma')this.clips.lava.play();
  }
  tower(phase,height,progress,map){
    if(!this.ready)return;
    if(phase!==this.towerPhase){
      this.towerPhase=phase;
      if(phase==='rise'&&progress<.15&&!this.muted)this.clips.riseAlarm.play('alert');
    }
    const wet=(map==='riverside'||map==='storm')&&phase!=='rest'&&height>.015;
    if(wet!==this.watering){this.watering=wet;if(wet)this.clips.water.play();else this.clips.water.stop();}
    if(wet)this.clips.water.volume(.025+.06*Math.min(1,height*2));
  }
  toggle(){this.muted=!this.muted;Howler.mute(this.muted);return this.muted;}
  stop(){this.burning=false;this.watering=false;this.towerPhase=null;this.ambientMap=null;Howler.stop();}
}
