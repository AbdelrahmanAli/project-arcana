import { Rectangle, Texture } from 'pixi.js';

// The generated poses reach across a few atlas cell boundaries. Keep only the
// soldier's connected silhouette in each cell so neighboring poses cannot
// appear as stray dark spots during the roll.
export function isolatedRollFrames(atlas) {
  const canvas=document.createElement('canvas');
  canvas.width=atlas.width;canvas.height=atlas.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(atlas.source.resource,0,0);
  const image=context.getImageData(0,0,canvas.width,canvas.height);
  const {data,width,height}=image;
  const labels=new Int32Array(width*height);
  const queue=new Int32Array(Math.ceil(width/4)*Math.ceil(height/8));
  let nextLabel=0;
  const cells=[];

  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
    const x0=Math.round(col*width/4),x1=Math.round((col+1)*width/4);
    const y0=Math.round(row*height/8),y1=Math.round((row+1)*height/8);
    let largestLabel=0,largestSize=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const start=y*width+x;
      if(labels[start]||data[start*4+3]<16)continue;
      const label=++nextLabel;
      let head=0,tail=0;
      labels[start]=label;queue[tail++]=start;
      while(head<tail){
        const pixel=queue[head++],px=pixel%width,py=(pixel/width)|0;
        for(let dy=-1;dy<=1;dy++){
          const ny=py+dy;if(ny<y0||ny>=y1)continue;
          for(let dx=-1;dx<=1;dx++){
            const nx=px+dx;if(nx<x0||nx>=x1||(!dx&&!dy))continue;
            const neighbor=ny*width+nx;
            if(labels[neighbor]||data[neighbor*4+3]<16)continue;
            labels[neighbor]=label;queue[tail++]=neighbor;
          }
        }
      }
      if(tail>largestSize){largestSize=tail;largestLabel=label;}
    }
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const pixel=y*width+x;
      if(labels[pixel]!==largestLabel)data[pixel*4+3]=0;
    }
    cells.push({x:x0,y:y0,width:x1-x0,height:y1-y0});
  }

  context.putImageData(image,0,0);
  const clean=Texture.from(canvas);
  clean.source.scaleMode='nearest';
  return Array.from({length:8},(_,row)=>Array.from({length:4},(_,col)=>{
    const cell=cells[row*4+col];
    return new Texture({source:clean.source,frame:new Rectangle(cell.x,cell.y,cell.width,cell.height)});
  }));
}
