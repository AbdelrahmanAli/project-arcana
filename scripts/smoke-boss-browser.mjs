import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

const browser=await chromium.launch({executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.DIVISION_SERVER_URL||'http://127.0.0.1:5173/project-arcana/';
const errors=[];
try{
  mkdirSync('test-output',{recursive:true});
  const context=await browser.newContext({viewport:{width:470,height:940}});
  for(const map of ['riverside','storm','magma','desert','snow']){
    const page=await context.newPage();
    const bossAudioResponses=[];
    page.on('pageerror',error=>errors.push(`${map}: ${error.message}`));
    page.on('response',response=>{
      if(response.url().includes('/audio/bosses/'))bossAudioResponses.push({url:response.url(),status:response.status()});
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('#menu-play:not([disabled])').waitFor({timeout:120000});
    await page.locator('#menu-play').click();
    if(map==='riverside'){
      await page.screenshot({path:'test-output/boss-format-menu.png'});
      await page.setViewportSize({width:320,height:740});
      await page.screenshot({path:'test-output/boss-format-menu-small-phone.png'});
      await page.setViewportSize({width:470,height:940});
    }
    await page.locator('[data-format="boss-solo"]').click();
    await page.locator('[data-mode="random"]').click();
    await page.locator(`#map-panel [data-map="${map}"]`).click();
    await page.locator('#lineup-start').click();
    await page.locator('#boss-hud:not([hidden])').waitFor({timeout:30000});
    await page.locator('#match-countdown').waitFor({state:'hidden',timeout:10000});
    await page.waitForFunction(expected=>performance.getEntriesByType('resource').some(entry=>entry.name.endsWith(`/audio/bosses/${expected}.wav`)),map,{timeout:10000});
    if(!bossAudioResponses.some(response=>response.url.endsWith(`/audio/bosses/${map}.wav`)&&response.status===200))throw new Error(`${map} boss audio bank did not load`);
    const snapshot=await page.evaluate(()=>window.arcana.snapshot());
    if(!snapshot.bossMode||snapshot.boss.map!==map||snapshot.players.length!==2)throw new Error(`Invalid ${map} solo boss state`);
    if(snapshot.platformAttacks.length)throw new Error(`${map} platform attacked boss match`);
    await page.screenshot({path:`test-output/boss-${map}.png`});
    await page.waitForFunction(()=>window.arcana.snapshot().bossEffects.some(effect=>effect.age>.12&&effect.age<.42),null,{timeout:10000});
    await page.screenshot({path:`test-output/boss-${map}-attack.png`});
    if(map==='riverside'){
      await page.setViewportSize({width:320,height:740});
      await page.screenshot({path:'test-output/boss-riverside-small-phone.png'});
      const hud=await page.locator('#boss-hud').boundingBox();
      if(!hud||hud.x<0||hud.x+hud.width>320)throw new Error('Boss HP overflows a small phone');
      await page.evaluate(()=>window.arcana.forceBossDefeat());
      await page.waitForTimeout(450);
      await page.screenshot({path:'test-output/boss-riverside-death.png'});
      await page.locator('#overlay').waitFor({state:'visible',timeout:5000});
      if(!((await page.locator('#overlay-title').textContent())||'').includes('BOSS'))throw new Error('Boss victory result missing');
      await page.locator('#start').click();
      await page.locator('#match-countdown').waitFor({state:'hidden',timeout:10000});
      if((await page.evaluate(()=>window.arcana.snapshot())).boss.hp!==500)throw new Error('Boss rematch did not reset health');
    }
    await page.close();
  }
  const duo=await context.newPage();
  duo.on('pageerror',error=>errors.push(`duo: ${error.message}`));
  await duo.goto(origin,{waitUntil:'domcontentloaded'});
  await duo.locator('#menu-play:not([disabled])').waitFor({timeout:120000});
  await duo.locator('#menu-play').click();await duo.locator('[data-format="boss-duo"]').click();
  await duo.locator('#mode-panel [data-mode="random"]').click();await duo.locator('#map-panel [data-map="riverside"]').click();
  await duo.locator('.lineup-options[data-slot="teammate"] [data-character="mara"]').click();
  await duo.locator('#lineup-start').click();
  await duo.locator('#match-countdown').waitFor({state:'hidden',timeout:10000});
  const duoState=await duo.evaluate(()=>window.arcana.snapshot());
  if(duoState.players.length!==3||duoState.players[2].characterId!=='mara'||duoState.boss.maxHp!==800)throw new Error('Local boss duo lineup failed');
  await duo.screenshot({path:'test-output/boss-duo.png'});
  await duo.close();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Five local boss maps rendered without browser errors');
}finally{await browser.close();}
