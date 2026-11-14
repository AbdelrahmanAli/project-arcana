import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const directory=join(process.cwd(),'public','art','bosses');
const browser=await chromium.launch({executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try{
  const page=await browser.newPage();
  for(const file of readdirSync(directory).filter(name=>name.endsWith('.png'))){
    const data=`data:image/png;base64,${readFileSync(join(directory,file)).toString('base64')}`;
    const result=await page.evaluate(async source=>{
      const image=new Image();image.src=source;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*.5);canvas.height=Math.round(image.height*.5);
      const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/webp',.95).split(',')[1];
    },data);
    const output=file.replace(/\.png$/,'.webp');
    writeFileSync(join(directory,output),Buffer.from(result,'base64'));
    console.log(`${file} -> ${output}`);
  }
}finally{await browser.close();}
