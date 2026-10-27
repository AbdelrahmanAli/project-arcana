import { W, RIVER } from './model.js';

// Smoke rises from each vent, crosses its own bank, then leaves the arena.
export function ashCloudVisuals(ash){
  if(!ash)return [];
  const clouds=[];
  for(const owner of [0,1])for(let index=0;index<3;index++){
    const delay=index*.34,age=ash.age-delay;
    if(age<=0)continue;
    const progress=Math.min(1,age/(ash.life-delay));
    const rising=Math.min(1,progress/.23),crossing=Math.max(0,(progress-.23)/.77);
    const sourceX=owner===0?48:W-48,bankY=owner===0?RIVER.bottom+125:RIVER.top-125;
    const exitX=owner===0?W+130:-130;
    const scale=index===0?1:index===1?.85:.7;
    const x=sourceX+(exitX-sourceX)*crossing;
    const y=RIVER.y+(bankY-RIVER.y)*rising+Math.sin(crossing*5+index)*9*crossing;
    const entry=Math.min(1,age/.7);
    const exit=Math.min(1,(1-progress)/.13);
    clouds.push({owner,index,x,y,width:(95+100*rising)*scale,height:(48+54*rising)*scale,
      alpha:entry*exit*(index===0?.82:.67)});
  }
  return clouds;
}
