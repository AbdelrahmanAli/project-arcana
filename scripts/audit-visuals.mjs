import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:process.env.DIVISION_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.DIVISION_DEV_URL||'http://127.0.0.1:5174/project-arcana/';
await mkdir('test-output/depth-audit',{recursive:true});
try{
  for(const format of (process.argv[2]?[process.argv[2]]:['1v1','2v2']))for(const map of (process.argv[3]?[process.argv[3]]:['riverside','storm','magma','desert','snow'])){
    const page=await browser.newPage({viewport:{width:Number(process.env.AUDIT_WIDTH||480),height:Number(process.env.AUDIT_HEIGHT||980)}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('#menu-play:not([disabled])').waitFor({timeout:60000});
    await page.locator('#menu-play').click();
    await page.locator(`[data-format="${format}"]`).click();
    await page.locator('#mode-panel [data-mode="random"]').click();
    await page.locator(`[data-map="${map}"]`).click();
    await page.locator('#lineup-start').click();
    await page.waitForFunction(()=>window.arcana?.snapshot().time>=12,null,{timeout:45000});
    await page.screenshot({path:`test-output/depth-audit/${format}-${map}.png`});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(errors.length||overflow)throw new Error(`${format} ${map}: ${errors.join('; ')} overflow=${overflow}`);
    const controlsFit=await page.evaluate(()=>['pistol-fire','dodge-fire','special-fire'].every(id=>{
      const button=document.getElementById(id).getBoundingClientRect();
      return button.left>=0&&button.right<=innerWidth&&button.top>=0&&button.bottom<=innerHeight;
    }));
    if(!controlsFit)throw new Error(`${format} ${map}: a combat control is outside the viewport`);
    console.log(`${format} ${map}: rendered without errors or horizontal overflow`);
    await page.close();
  }
}finally{await browser.close();}
