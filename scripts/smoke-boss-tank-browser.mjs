import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

const browser=await chromium.launch({executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  mkdirSync('test-output',{recursive:true});
  const page=await browser.newPage({viewport:{width:470,height:940}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.DIVISION_SERVER_URL||'http://127.0.0.1:5173/project-arcana/',{waitUntil:'domcontentloaded'});
  await page.locator('#menu-play:not([disabled])').waitFor({timeout:120000});
  await page.locator('#menu-play').click();await page.locator('[data-format="boss-solo"]').click();
  await page.locator('[data-mode="random"]').click();await page.locator('#map-panel [data-map="riverside"]').click();
  await page.locator('#lineup-start').click();await page.locator('#match-countdown').waitFor({state:'hidden',timeout:10000});
  for(const type of ['cannon','missileBarrage','laserSweep','nuclearStrike']){
    if(!await page.evaluate(type=>window.arcana.previewBossAttack(type),type))throw new Error(`Could not preview ${type}`);
    await page.waitForFunction(type=>window.arcana.snapshot().bossEffects.some(effect=>effect.attack===type&&effect.age<0&&effect.age>-.2),type,{timeout:5000});
    await page.screenshot({path:`test-output/boss-tank-${type}-flight.png`});
    // A screenshot can take longer than the impact window on software WebGL.
    await page.evaluate(type=>window.arcana.previewBossAttack(type),type);
    await page.waitForFunction(type=>window.arcana.snapshot().bossEffects.some(effect=>effect.attack===type&&effect.age>=0),type,{timeout:5000});
    await page.screenshot({path:`test-output/boss-tank-${type}-impact.png`});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Four tank attacks rendered in flight and at impact');
}finally{await browser.close();}
