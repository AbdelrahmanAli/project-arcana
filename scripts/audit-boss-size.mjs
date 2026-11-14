import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {BOSS_DEFINITIONS} from '../src/boss-encounter.js';
import metrics from '../src/generated/boss-motion-metrics.json' with {type:'json'};

const browser=await chromium.launch({executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try{
  const page=await browser.newPage();
  for(const [map,definition] of Object.entries(BOSS_DEFINITIONS)){
    const id=definition.id.replace(/([A-Z])/g,'-$1').toLowerCase();
    const files=['sheet','motion'].map(type=>`data:image/webp;base64,${readFileSync(join('public','art','bosses',`${id}-${type}.webp`)).toString('base64')}`);
    const [pose,motion]=await page.evaluate(async files=>Promise.all(files.map(async (source,index)=>{
      const image=new Image();image.src=source;await image.decode();
      const columns=index?8:4,rows=index?4:2,cellW=image.width/columns,cellH=image.height/rows;
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      return Array.from({length:columns*rows},(_,i)=>{
        const data=ctx.getImageData(i%columns*cellW,Math.floor(i/columns)*cellH,cellW,cellH).data;
        let left=cellW,top=cellH,right=-1,bottom=-1;
        for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++)if(data[(y*cellW+x)*4+3]>50){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
        return {w:+((right-left+1)/cellW).toFixed(2),h:+((bottom-top+1)/cellH).toFixed(2),bottom:+(bottom/cellH).toFixed(2)};
      });
    })),files);
    const layout=metrics[map],front=[4,12,20,28].map(i=>motion[i]);
    const measure=(frame,index)=>{
      const known=layout.frames[index],height=layout.targetHeight/known.h;
      return {width:frame.w*height*layout.xScale,height:frame.h*height,contact:(frame.bottom-.5)*height+layout.targetContact-(known.bottom-.5)*height};
    };
    const samples=[4,12,20,28].map(index=>measure(motion[index],index));
    const expected={width:pose[0].w*168,height:pose[0].h*168,contact:(pose[0].bottom-.5)*168};
    if(process.argv.includes('--measure')){
      console.log(id,JSON.stringify({pose:pose[0],front,range:{width:[Math.min(...motion.map(frame=>frame.w)),Math.max(...motion.map(frame=>frame.w))],height:[Math.min(...motion.map(frame=>frame.h)),Math.max(...motion.map(frame=>frame.h))]}}));
      continue;
    }
    assert.equal(layout.frames.length,32);
    for(const [index,frame] of motion.entries())for(const key of ['w','h','bottom'])
      assert.ok(Math.abs(frame[key]-layout.frames[index][key])<.02,`${id} frame ${index} ${key} metadata mismatch`);
    for(const key of Object.keys(expected)){
      const average=samples.reduce((sum,sample)=>sum+sample[key],0)/samples.length;
      assert.ok(Math.abs(average-expected[key])<5,`${id} ${key} average: ${average} vs ${expected[key]}`);
      if(key!=='width')assert.ok(motion.every((frame,index)=>Math.abs(measure(frame,index)[key]-expected[key])<5),`${id} ${key} has an oversized frame jump`);
    }
    console.log(`${id}: movement and idle silhouettes align`);
  }
}finally{await browser.close();}
