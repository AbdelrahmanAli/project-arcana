// Original, deterministic PCM sound designs. The build script packs each
// boss's movement, windups, and attacks into a single Howler audio sprite.
const event=(kind,start,length,from,to,gain,decay=1.5)=>({kind,start,length,from,to,gain,decay});
const clip=(duration,...events)=>({duration,events});

export const BOSS_SOUND_PROFILES=Object.freeze({
  riverside:{
    move:{interval:.34,volume:.12,sound:clip(.3,event('boom',0,.18,88,55,.6),event('metal',.025,.21,290,240,.24),event('scrape',.06,.22,110,90,.19))},
    attacks:{
      cannon:clip(.65,event('boom',0,.36,90,38,.9),event('crack',0,.14,620,330,.55),event('boom',.12,.38,78,32,.75),event('crack',.12,.13,570,300,.46)),
      missileBarrage:clip(.9,event('wind',0,.56,480,105,.55),event('boom',.13,.3,128,46,.48),event('boom',.32,.32,117,43,.55),event('boom',.52,.35,105,36,.6),event('crack',.62,.18,720,290,.32)),
      laserSweep:clip(.82,event('tone',0,.72,220,1170,.62),event('scrape',.08,.66,1250,490,.42),event('crack',.2,.15,1700,660,.4)),
      nuclearStrike:clip(1.15,event('wind',0,.56,160,80,.39),event('boom',.38,.7,110,24,1),event('crack',.4,.32,780,150,.6),event('ghost',.58,.5,380,130,.26)),
    },
  },
  storm:{
    move:{interval:.74,volume:.1,sound:clip(.69,event('ghost',0,.69,180,260,.55),event('wind',.08,.57,420,560,.27))},
    attacks:{
      chain:clip(.67,event('crack',0,.12,1800,950,.78),event('tone',0,.52,960,410,.46),event('crack',.18,.12,1650,860,.7),event('crack',.35,.12,1420,730,.56)),
      spectralArc:clip(.76,event('ghost',0,.65,260,120,.52),event('wind',.1,.55,700,250,.46),event('tone',.2,.34,620,180,.2)),
      decoys:clip(.86,event('ghost',0,.8,360,190,.63),event('metal',.22,.48,920,560,.21),event('ghost',.38,.42,280,150,.28)),
      thunderPulse:clip(.8,event('boom',0,.59,115,42,.72),event('crack',0,.13,1950,1050,.56),event('tone',.13,.57,340,110,.37),event('crack',.33,.12,1100,580,.22)),
    },
  },
  magma:{
    move:{interval:.48,volume:.14,sound:clip(.44,event('boom',0,.3,74,36,.78),event('crack',.04,.15,240,120,.37),event('scrape',.14,.29,105,80,.26))},
    attacks:{
      moltenFist:clip(.85,event('wind',0,.28,170,120,.26),event('boom',.25,.54,78,28,.9),event('crack',.27,.43,380,140,.54)),
      fissure:clip(.92,event('scrape',0,.8,110,65,.63),event('boom',.18,.57,58,26,.57),event('crack',.47,.34,320,150,.3)),
      boulder:clip(.92,event('wind',0,.42,240,100,.39),event('boom',.37,.5,86,31,.83),event('crack',.39,.35,520,220,.43)),
      fragments:clip(.69,event('crack',0,.16,780,290,.54),event('crack',.12,.17,680,230,.49),event('crack',.27,.16,570,190,.42),event('crack',.42,.15,480,160,.37)),
    },
  },
  desert:{
    move:{interval:.38,volume:.115,sound:clip(.35,event('scrape',0,.3,400,170,.5),event('wind',.04,.26,170,90,.27))},
    attacks:{
      sandBlade:clip(.73,event('scrape',0,.32,1100,450,.57),event('wind',0,.38,720,320,.28),event('scrape',.29,.35,950,360,.49)),
      burrow:clip(.8,event('boom',0,.55,83,38,.5),event('scrape',.07,.55,210,90,.41),event('crack',.43,.19,570,260,.35)),
      vortex:clip(.96,event('wind',0,.92,190,610,.71),event('ghost',.19,.63,310,480,.19),event('scrape',.42,.49,460,250,.18)),
      sandTeeth:clip(.72,event('crack',0,.16,690,320,.38),event('crack',.14,.16,610,280,.45),event('crack',.3,.18,540,230,.52),event('scrape',.07,.57,240,130,.22)),
    },
  },
  snow:{
    move:{interval:.43,volume:.12,sound:clip(.39,event('crack',0,.12,1050,600,.35),event('scrape',.03,.33,850,530,.39),event('ice',.09,.28,1270,860,.23))},
    attacks:{
      icicles:clip(.72,event('ice',0,.32,1550,900,.46),event('crack',.16,.13,1450,720,.51),event('ice',.29,.31,1280,720,.39),event('crack',.42,.15,1120,580,.31)),
      iceBeam:clip(.77,event('tone',0,.66,780,1540,.53),event('ice',.09,.58,1660,1100,.3),event('wind',.22,.48,960,720,.2)),
      iceBoulder:clip(.85,event('wind',0,.41,430,220,.31),event('boom',.31,.48,92,44,.59),event('crack',.32,.28,1420,620,.52),event('ice',.5,.29,920,520,.22)),
      frostWave:clip(.92,event('wind',0,.86,390,180,.62),event('ice',.18,.6,1240,700,.31),event('crack',.52,.24,890,420,.2)),
    },
  },
});

const SAMPLE_RATE=22050;
export function synthesizeBossSound(spec,seed=1){
  const samples=new Float32Array(Math.round(spec.duration*SAMPLE_RATE));
  let low=0,mid=0;
  for(let i=0;i<samples.length;i++){
    const time=i/SAMPLE_RATE;
    seed=(seed*1664525+1013904223)>>>0;
    const white=seed/2147483648-1;
    low=low*.94+white*.06;mid=mid*.57+white*.43;
    let sample=0;
    for(const part of spec.events){
      const age=time-part.start;
      if(age<0||age>=part.length)continue;
      const progress=age/part.length;
      const phase=2*Math.PI*(part.from*age+(part.to-part.from)*age*progress*.5);
      const tone=Math.sin(phase);
      const envelope=Math.min(1,age/.009)*Math.pow(1-progress,part.decay);
      let voice;
      switch(part.kind){
        case 'boom':voice=tone*.68+low*.43+mid*.1;break;
        case 'crack':voice=white*.65+mid*.25+tone*.1;break;
        case 'metal':voice=(tone+Math.sin(phase*1.61)*.55+Math.sin(phase*2.37)*.26)*.55;break;
        case 'wind':voice=low*.55+mid*.27+tone*.12;break;
        case 'scrape':voice=mid*.55+white*.19+tone*.12;break;
        case 'ice':voice=(tone+Math.sin(phase*2.49)*.52+mid*.24)*.58;break;
        case 'ghost':voice=(tone*.5+Math.sin(phase*.51)*.32+low*.28)*(1+.26*Math.sin(2*Math.PI*8*age));break;
        default:voice=tone*.8;
      }
      sample+=voice*envelope*part.gain;
    }
    samples[i]=Math.tanh(sample*.85)*.82;
  }
  return samples;
}

export function synthesizeBossWindup(attack,seed=1){
  const source=synthesizeBossSound(attack,seed);
  const duration=Math.min(.48,attack.duration*.68),samples=new Float32Array(Math.round(duration*SAMPLE_RATE));
  for(let i=0;i<samples.length;i++){
    const progress=i/samples.length;
    const sourceIndex=Math.min(source.length-1,Math.floor((1-progress)*(source.length-1)));
    const edge=Math.min(1,progress/.07,(1-progress)/.09);
    samples[i]=source[sourceIndex]*Math.max(0,edge)*.55;
  }
  return samples;
}

export {SAMPLE_RATE};
