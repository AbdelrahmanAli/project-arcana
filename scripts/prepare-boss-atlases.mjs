import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';

const sourceDirectory=join(process.cwd(),'docs','art-source','bosses');
const outputDirectory=join(process.cwd(),'public','art','bosses');
const metricDirectory=join(process.cwd(),'src','generated');
const browser=await chromium.launch({
  executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless:true,
});

async function convert(page,name,columns,rows,motion){
  const source=`data:image/png;base64,${readFileSync(join(sourceDirectory,`${name}.png`)).toString('base64')}`;
  const result=await page.evaluate(async ({source,columns,rows,motion})=>{
    const image=new Image();image.src=source;await image.decode();
    const sourceCanvas=document.createElement('canvas');
    sourceCanvas.width=image.width;sourceCanvas.height=image.height;
    const sourceContext=sourceCanvas.getContext('2d',{willReadFrequently:true});
    sourceContext.drawImage(image,0,0);
    const cellWidth=image.width/columns,cellHeight=image.height/rows;
    const bounds=[];
    let maxWidth=0,maxHeight=0;
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      if(!motion){bounds.push(null);continue;}
      const data=sourceContext.getImageData(column*cellWidth,row*cellHeight,cellWidth,cellHeight).data;
      let left=cellWidth,top=cellHeight,right=0,bottom=0;
      for(let y=0;y<cellHeight;y++)for(let x=0;x<cellWidth;x++)if(data[(y*cellWidth+x)*4+3]>20){
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      const box=right>=left?{x:column*cellWidth+left,y:row*cellHeight+top,width:right-left+1,height:bottom-top+1}:null;
      bounds.push(box);
      if(box){maxWidth=Math.max(maxWidth,box.width);maxHeight=Math.max(maxHeight,box.height);}
    }
    const size=128,canvas=document.createElement('canvas');
    canvas.width=columns*size;canvas.height=rows*size;
    const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;
    const scale=motion?Math.min(116/maxWidth,116/maxHeight):size/cellWidth;
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const index=row*columns+column,box=bounds[index];
      if(motion&&box){
        const width=box.width*scale,height=box.height*scale;
        context.drawImage(image,box.x,box.y,box.width,box.height,column*size+(size-width)/2,row*size+120-height,width,height);
      }else if(!motion){
        context.drawImage(image,column*cellWidth,row*cellHeight,cellWidth,cellHeight,column*size,row*size,size,size);
      }
    }
    const metrics=motion?Array.from({length:columns*rows},(_,index)=>{
      const data=context.getImageData(index%columns*size,Math.floor(index/columns)*size,size,size).data;
      let left=size,top=size,right=-1,bottom=-1;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[(y*size+x)*4+3]>50){
        left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
      }
      return {w:(right-left+1)/size,h:(bottom-top+1)/size,bottom:bottom/size};
    }):null;
    return {data:canvas.toDataURL('image/webp',.9).split(',')[1],metrics};
  },{source,columns,rows,motion});
  writeFileSync(join(outputDirectory,`${name}.webp`),Buffer.from(result.data,'base64'));
  console.log(`${name}.webp`);
  return result.metrics;
}

async function poseTarget(page,id){
  const source=`data:image/webp;base64,${readFileSync(join(outputDirectory,`${id}-sheet.webp`)).toString('base64')}`;
  return page.evaluate(async source=>{
    const image=new Image();image.src=source;await image.decode();
    const width=image.width/4,height=image.height/2;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,width,height,0,0,width,height);
    const data=context.getImageData(0,0,width,height).data;
    let left=width,top=height,right=-1,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>50){
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    return {width:(right-left+1)/width*168,height:(bottom-top+1)/height*168,contact:(bottom/height-.5)*168};
  },source);
}

try{
  const page=await browser.newPage();
  const layouts={};
  for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
    const id=definition.id.replace(/([A-Z])/g,'-$1').toLowerCase();
    const frames=await convert(page,`${id}-motion`,8,4,true);
    const target=await poseTarget(page,id);
    const front=[4,12,20,28].map(index=>frames[index]);
    const averageWidth=front.reduce((sum,frame)=>sum+frame.w*target.height/frame.h,0)/front.length;
    layouts[map]={frames,targetHeight:target.height,targetContact:target.contact,xScale:target.width/averageWidth};
    if(process.argv.includes('--motion-only'))continue;
    for(const attack of definition.attacks){
      const slug=attack.replace(/([A-Z])/g,'-$1').toLowerCase();
      await convert(page,`${id}-${slug}`,3,2,false);
    }
  }
  mkdirSync(metricDirectory,{recursive:true});
  writeFileSync(join(metricDirectory,'boss-motion-metrics.json'),JSON.stringify(layouts));
}finally{await browser.close();}
