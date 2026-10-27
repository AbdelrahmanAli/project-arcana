import { W, RIVER } from './model.js';

// Three plumes per bank rise from its vent, then spread across different lanes.
export function ashCloudVisuals(ash){
  if(!ash)return [];
  const clouds=[];
  for(const owner of [0,1])for(let index=0;index<3;index++){
    const delay=index*.38,age=ash.age-delay;
    if(age<=0)continue;
    const progress=Math.min(1,age/(ash.life-delay));
    const rising=Math.min(1,progress/.2),travel=Math.max(0,(progress-.2)/.8);
    const sourceX=owner===0?48:W-48,across=owner===0?1:-1,bank=owner===0?1:-1;
    const routes=[
      {startX:sourceX+across*60,startY:RIVER.y+bank*130,endX:owner===0?W+150:-150,endY:RIVER.y+bank*130},
      {startX:sourceX+across*105,startY:RIVER.y+bank*90,endX:sourceX+across*105,endY:owner===0?1060:-60},
      {startX:sourceX+across*35,startY:RIVER.y+bank*75,endX:owner===0?W+130:-130,endY:owner===0?1060:-60},
    ];
    const route=routes[index],x=sourceX+(route.startX-sourceX)*rising+(route.endX-route.startX)*travel;
    const y=RIVER.y+(route.startY-RIVER.y)*rising+(route.endY-route.startY)*travel;
    const enter=Math.min(1,age/.65),leave=Math.min(1,(1-progress)/.12);
    const size=[1,.91,.97][index];
    clouds.push({owner,index,x,y,width:(130+110*rising)*size,height:(68+75*rising)*size,
      alpha:enter*leave*[.95,.93,.96][index]});
  }
  return clouds;
}
