import { chromium } from 'playwright-core';

const origin=process.env.DIVISION_SERVER_URL||'http://127.0.0.1:8787';
const executablePath=process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function host(teamMode){
  const page=await browser.newPage({viewport:{width:470,height:940}});
  page.on('pageerror',error=>errors.push(`host ${teamMode}: ${error.message}`));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#menu-online').waitFor({state:'visible',timeout:60000});
  await page.locator('#menu-online').click();
  await page.locator('#online-host').click();
  await page.locator(`#online-format-panel [data-online-mode="${teamMode}"]`).click();
  await page.locator('#mode-panel [data-mode="random"]').click();
  await page.locator('#map-panel [data-map="snow"]').click();
  await page.locator('#online-invite-link').waitFor({state:'visible',timeout:15000});
  return {page,inviteUrl:await page.locator('#online-invite-link').inputValue()};
}
async function join(inviteUrl,character,team){
  const page=await browser.newPage({viewport:{width:470,height:940}});
  page.on('pageerror',error=>errors.push(`${character}: ${error.message}`));
  await page.goto(inviteUrl,{waitUntil:'domcontentloaded'});
  try{await page.locator('#online-panel').waitFor({state:'visible',timeout:60000});}
  catch(error){
    const state=await page.evaluate(()=>({url:location.href,menu:document.querySelector('#menu')?.className,panel:document.querySelector('#online-panel')?.className,play:document.querySelector('#menu-play')?.textContent,loading:document.querySelector('#art-progress-label')?.textContent}));
    throw new Error(`Invite did not open for ${character}: ${JSON.stringify(state)}; page errors: ${errors.join('; ')}`,{cause:error});
  }
  await page.waitForFunction(()=>document.querySelector('#online-map-name')?.textContent.includes('SNOW'),null,{timeout:15000});
  if(await page.locator('#online-host').isVisible())throw new Error('Invite guest has Create Invite');
  await page.locator(`#online-characters [data-character="${character}"]`).click();
  if(team!==undefined)await page.locator(`#online-teams [data-team="${team}"]`).click();
  await page.locator('#online-join').click();
  return page;
}
async function check(page,name,teammate){
  await page.locator('#player-hud').waitFor({state:'visible',timeout:25000});
  await page.locator('#match-countdown').waitFor({state:'hidden',timeout:25000});
  await page.waitForFunction(()=>document.querySelector('.player-hud-label')?.textContent.includes('YOU'),null,{timeout:15000});
  const label=await page.locator('.player-hud-label').textContent();
  if(!label.includes(name))throw new Error(`Wrong local fighter: expected ${name}, got ${label}`);
  const ownTop=await page.locator('#player-hud').evaluate(element=>parseFloat(element.style.top));
  if(!(ownTop>55))throw new Error(`${name} was not on the lower bank: ${ownTop}%`);
  await page.waitForFunction(target=>[...document.querySelectorAll('.phase7-fighter-name')].some(element=>element.textContent.includes(`ALLY · ${target}`)&&element.parentElement.style.display!=='none'),teammate,{timeout:15000});
}
try{
  const coop=await host('coop');
  const first=coop.page;
  const second=await join(coop.inviteUrl,'nadia');
  await check(first,'Elias','Nadia');
  await check(second,'Nadia','Elias');
  console.log('2v2 co-op browser passed: both teammates saw themselves below the river with aligned ally HUDs');
  await Promise.all([first.close(),second.close()]);

  const versus=await host('versus');
  const fighters=[['dorian',1],['nadia',0],['imani',1]];
  const joined=[versus.page];
  for(const [character,team] of fighters)joined.push(await join(versus.inviteUrl,character,team));
  await Promise.all([
    check(joined[0],'Elias','Nadia'),
    check(joined[1],'Dorian','Imani'),
    check(joined[2],'Nadia','Elias'),
    check(joined[3],'Imani','Dorian'),
  ]);
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('2v2 versus browser passed: all four fighters saw their own bank below the river');
}finally{await browser.close();}
