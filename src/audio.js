import { Howl, Howler } from 'howler';

const AUDIO_PREFS_KEY='tower-deal-audio-v1';
function loadAudioPrefs(){
  try { return JSON.parse(localStorage.getItem(AUDIO_PREFS_KEY))||{}; }
  catch { return {}; }
}
function saveAudioPrefs(sound){
  try { localStorage.setItem(AUDIO_PREFS_KEY,JSON.stringify({muted:sound.muted})); }
  catch { /* Storage may be unavailable in a private browser. */ }
}

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
function platformCueWav(){
  return pcmWav(.42,t=>{
    const note=(start,freq)=>{
      const age=t-start;
      return age<0?0:Math.sin(2*Math.PI*freq*age)*Math.min(1,age/.014)*Math.exp(-age*12);
    };
    return note(0,620)*.18+note(.17,880)*.15;
  });
}
const DEATH_VOICES=Object.freeze({
  elias:{pitch:126,fall:.38,rasp:.28,duration:.78,seed:211},
  dorian:{pitch:148,fall:.45,rasp:.34,duration:.71,seed:337},
  tomas:{pitch:106,fall:.32,rasp:.43,duration:.91,seed:419},
  nadia:{pitch:204,fall:.42,rasp:.19,duration:.72,seed:553},
  imani:{pitch:182,fall:.35,rasp:.24,duration:.81,seed:677},
  mara:{pitch:226,fall:.48,rasp:.31,duration:.67,seed:811},
});
function deathGruntWav({pitch,fall,rasp,duration,seed}){
  let phase=0,breath=0;
  return pcmWav(duration,(t)=>{
    seed=(seed*1664525+1013904223)>>>0;
    breath=breath*.72+(seed/2147483648-1)*.28;
    const progress=t/duration;
    const frequency=pitch*(1-fall*progress)*(1+.023*Math.sin(2*Math.PI*7*t));
    phase+=2*Math.PI*frequency/22050;
    const voice=Math.tanh((Math.sin(phase)+.34*Math.sin(phase*2)+.14*Math.sin(phase*3))*1.35);
    const envelope=Math.min(1,t/.018)*Math.max(0,1-progress)**1.2;
    const exhale=breath*(rasp+.12*progress);
    return (voice*(.43-rasp*.3)+exhale*.42)*envelope;
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
  const duration=pull?.62:3.2;let seed=pull?7193:10457,low=0,mid=0,air=0;
  return pcmWav(duration,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.975+white*.025;mid=mid*.84+white*.16;air=air*.42+white*.58;
    const envelope=pull?Math.min(1,t/.035)*Math.exp(-t*3.8):Math.min(1,t/.16,(duration-t)/.16);
    const gust=pull?1:.77+.15*Math.sin(2*Math.PI*.7*t)+.08*Math.sin(2*Math.PI*1.9*t);
    return (low*.72+mid*.35+air*(pull?.1:.045))*envelope*gust;
  });
}
function phase6WindWav(){
  const duration=4;let seed=83217,bass=0,mid=0,grain=0;
  return pcmWav(duration,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    bass=bass*.97+white*.03;mid=mid*.72+white*.28;
    grain=grain*.2+white*.8;
    const gust=.64+.22*Math.sin(2*Math.PI*(.29*t+.025*t*t))+.1*Math.sin(2*Math.PI*.83*t);
    const edge=Math.min(1,t/.14,(duration-t)/.14);
    return (bass*.55+mid*.28+grain*.035)*gust*edge;
  });
}
function avalancheWarningWav(){
  let seed=24711,low=0;
  return pcmWav(.85,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    low=low*.9+(seed/2147483648-1)*.1;
    const creak=Math.sin(2*Math.PI*(76*t-18*t*t))*Math.exp(-t*2.7);
    return (low*.36+creak*.16)*Math.sin(Math.PI*t/.85);
  });
}
function avalancheRushWav(){
  const duration=3;let seed=62519,bass=0,crunch=0;
  return pcmWav(duration,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    bass=bass*.94+white*.06;crunch=crunch*.34+white*.66;
    const swell=Math.min(1,t/.2)*Math.min(1,(duration-t)/.42);
    const crack=(Math.sin(2*Math.PI*(3.3*t+.8*t*t))>.93?1:0)*crunch;
    return (bass*.62+crunch*.13+crack*.22)*swell*(.8+.14*Math.sin(2*Math.PI*.7*t));
  });
}
function iceFallWav(){
  let seed=12461,air=0;
  return pcmWav(.65,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    air=air*.66+(seed/2147483648-1)*.34;
    const fall=Math.min(1,t/.08)*Math.min(1,(.65-t)/.11);
    const whistle=Math.sin(2*Math.PI*(940*t+460*t*t));
    const second=Math.sin(2*Math.PI*(1420*t+280*t*t));
    return (whistle*.16+second*.07+air*.15)*fall;
  });
}
function iceShatterWav(){
  let seed=48329,crack=0;
  return pcmWav(.37,t=>{
    seed=(seed*1664525+1013904223)>>>0;
    crack=crack*.25+(seed/2147483648-1)*.75;
    const snap=crack*Math.exp(-t*36)*.52;
    const shards=crack*(Math.exp(-Math.max(0,t-.09)*30)*(t>.09?.24:0)+Math.exp(-Math.max(0,t-.17)*35)*(t>.17?.14:0));
    const ring=Math.sin(2*Math.PI*(1750*t-750*t*t))*Math.exp(-t*12)*.16;
    return snap+shards+ring;
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
  constructor(){
    const prefs=loadAudioPrefs();
    this.muted=prefs.muted===true;
    this.ready=false;this.clips={};this.burning=false;this.watering=false;this.storming=false;this.tornadoing=false;this.platformPhase=null;this.ambientMap=null;
  }
  init(){
    if(this.ready){Howler.ctx?.resume();return;}
    this.ready=true;
    const defs={pistol:[.12,130,.8],rifle:[.1,150,.85],shotgun:[.3,70,.95],laser:[.48,760,.16],pickup:[.19,850,.05],landing:[.13,105,.8],hit:[.12,70,.9],explosion:[.7,45,.98],launch:[.24,180,.65]};
    for(const [name,args]of Object.entries(defs))this.clips[name]=new Howl({src:[wav(...args)],format:['wav'],volume:name==='rifle'?.15:name==='landing'?.11:.22,preload:true,pool:8});
    for(const [character,voice] of Object.entries(DEATH_VOICES))this.clips[`death-${character}`]=new Howl({src:[deathGruntWav({...voice})],format:['wav'],volume:.28,preload:true,pool:3});
    this.clips.menuClick=new Howl({src:[wav(.095,680,.14,15)],format:['wav'],volume:.14,preload:true,pool:6});
    this.clips.dealTick=new Howl({src:[wav(.07,610,.2,16)],format:['wav'],volume:.11,preload:true,pool:8});
    this.clips.dealSettle=new Howl({src:[wav(.27,410,.28,8)],format:['wav'],volume:.24,preload:true,pool:3});
    this.clips.ready=new Howl({src:[wav(.24,330,.12,7)],format:['wav'],volume:.19,preload:true});
    this.clips.fight=new Howl({src:[wav(.32,510,.24,6)],format:['wav'],volume:.25,preload:true});
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
    this.clips.burning=new Howl({src:[wav(1.7,48,.97,.35)],format:['wav'],volume:.14,loop:true,preload:true});
    this.clips.platformCue=new Howl({src:[platformCueWav()],format:['wav'],volume:.12,preload:true});
    this.clips.platformFire=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.19,preload:true});
    this.clips.platformAim=new Howl({src:[wav(.24,470,.28,8)],format:['wav'],volume:.13,preload:true});
    this.clips.water=new Howl({src:[waterWav()],format:['wav'],volume:0,loop:true,preload:true});
    this.clips.rain=new Howl({src:[weatherWav('rain')],format:['wav'],volume:.045,loop:true,preload:true});
    this.clips.lava=new Howl({src:[weatherWav('lava')],format:['wav'],volume:.04,loop:true,preload:true});
    this.clips.lightningCharge=new Howl({src:[wav(.43,620,.3,4)],format:['wav'],volume:.12,preload:true});
    this.clips.lightningStrike=new Howl({src:[wav(.68,63,.95,5)],format:['wav'],volume:.34,preload:true});
    this.clips.tornado=new Howl({src:[tornadoWindWav()],format:['wav'],volume:.23,loop:true,preload:true});
    this.clips.tornadoPull=new Howl({src:[tornadoWindWav(true)],format:['wav'],volume:.32,preload:true,pool:4});
    this.clips.ash=new Howl({src:[weatherWav('lava')],format:['wav'],volume:.12,preload:true});
    this.clips.volcanoRockLaunch=new Howl({src:[wav(.45,93,.75,5)],format:['wav'],volume:.21,preload:true});
    this.clips.volcanoFireLaunch=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.2,preload:true});
    this.clips.volcanoRockImpact=new Howl({src:[wav(.55,66,.9,6)],format:['wav'],volume:.3,preload:true});
    this.clips.volcanoFireImpact=new Howl({src:[fireWhooshWav()],format:['wav'],volume:.27,preload:true});
    this.clips.rockBreak=new Howl({src:[wav(.3,120,.83,10)],format:['wav'],volume:.2,preload:true});
    this.clips.avalanche=new Howl({src:[avalancheWarningWav()],format:['wav'],volume:.2,preload:true});
    this.clips.avalancheRush=new Howl({src:[avalancheRushWav()],format:['wav'],volume:.33,preload:true});
    this.clips.avalancheHit=new Howl({src:[iceShatterWav()],format:['wav'],volume:.21,preload:true});
    this.clips.hailFall=new Howl({src:[iceFallWav()],format:['wav'],volume:.11,preload:true,pool:8});
    this.clips.hailImpact=new Howl({src:[iceShatterWav()],format:['wav'],volume:.17,preload:true,pool:8});
    for(const [name,duration,freq,noise,volume] of [
      ['eagleHit',.25,200,.75,.25],['quicksand',.55,78,.8,.17],
      ['mirageSun',.55,860,.15,.11],['scorpionReveal',.28,490,.6,.19],
      ['iceSlide',.26,620,.5,.09],
    ])this.clips[name]=new Howl({src:[wav(duration,freq,noise,5)],format:['wav'],volume,preload:true,pool:8});
    this.clips.eagleAttack=new Howl({src:[`${import.meta.env.BASE_URL}audio/red-tailed-hawk.mp3`],format:['mp3'],volume:.31,preload:true,pool:8});
    this.clips.scorpionBite=new Howl({src:[scorpionBiteWav()],format:['wav'],volume:.31,preload:true,pool:8});
    this.clips.sandstorm=new Howl({src:[phase6WindWav()],format:['wav'],volume:.2,loop:true,preload:true});
    Howler.mute(this.muted);Howler.ctx?.resume();
  }
  play(name,x,rate=1){if(this.muted||!this.ready)return;const s=this.clips[name];if(s){const id=s.play();if(x!==undefined)s.stereo((x/480-.5)*.6,id);if(rate!==1)s.rate(rate,id);}}
  burn(active){if(!this.ready||this.burning===active)return;this.burning=active;if(active)this.clips.burning.play();else this.clips.burning.stop();}
  tornado(active){if(!this.ready||this.tornadoing===active)return;this.tornadoing=active;if(active)this.clips.tornado.play();else this.clips.tornado.stop();}
  environment(map,sandstormActive=false){
    if(!this.ready)return;
    if(this.ambientMap!==map){
      for(const name of ['rain','lava'])this.clips[name].stop();
      this.ambientMap=map;
      if(map==='storm')this.clips.rain.play();
      else if(map==='magma')this.clips.lava.play();
    }
    const storming=map==='desert'&&sandstormActive;
    if(storming!==this.storming){
      this.storming=storming;
      if(storming)this.clips.sandstorm.play();
      else this.clips.sandstorm.stop();
    }
  }
  platform(phase,map){
    if(!this.ready)return;
    this.platformPhase=phase;
    const wet=(map==='riverside'||map==='storm')&&phase!=='idle';
    if(wet!==this.watering){this.watering=wet;if(wet)this.clips.water.play();else this.clips.water.stop();}
    if(wet)this.clips.water.volume(.018);
  }
  toggle(){this.muted=!this.muted;Howler.mute(this.muted);saveAudioPrefs(this);return this.muted;}
  stop(){this.burning=false;this.watering=false;this.storming=false;this.tornadoing=false;this.platformPhase=null;this.ambientMap=null;Howler.stop();}
}
