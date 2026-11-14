import {chromium} from 'playwright-core';
import {mkdirSync} from 'node:fs';

const origin=process.env.DIVISION_SERVER_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({executablePath:process.env.DIVISION_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
  const host=await browser.newPage({viewport:{width:470,height:940}});
  host.on('pageerror',error=>errors.push(`host: ${error.message}`));
  await host.goto(origin,{waitUntil:'domcontentloaded'});
  await host.locator('#menu-online:not([disabled])').waitFor({timeout:120000});
  await host.locator('#menu-online').click();
  await host.locator('#online-host').click();
  await host.locator('[data-online-mode="boss"]').click();
  await host.locator('#mode-panel [data-mode="random"]').click();
  await host.locator('#map-panel [data-map="storm"]').click();
  await host.locator('#online-invite-link').waitFor({state:'visible',timeout:20000});
  const invite=await host.locator('#online-invite-link').inputValue();
  const roomId=new URL(invite).searchParams.get('room');
  const status=await (await host.request.get(`${origin}/api/rooms/${roomId}`)).json();
  if(status.options.teamMode!=='boss'||status.requiredPlayers!==2)throw new Error('Boss room options incorrect');

  const guest=await browser.newPage({viewport:{width:470,height:940}});
  guest.on('pageerror',error=>errors.push(`guest: ${error.message}`));
  await guest.goto(invite,{waitUntil:'domcontentloaded'});
  await guest.locator('#online-panel').waitFor({state:'visible',timeout:120000});
  if(await guest.locator('#online-host').isVisible())throw new Error('Invited fighter can host a new match');
  await guest.locator('#online-characters [data-character="mara"]').click();
  await guest.locator('#online-join').click();
  for(const [page,name] of [[host,'host'],[guest,'guest']]){
    await page.locator('#match-countdown').waitFor({state:'hidden',timeout:25000});
    await page.locator('#boss-hud').waitFor({state:'visible',timeout:25000});
    const ownTop=await page.locator('#player-hud').evaluate(element=>parseFloat(element.style.top));
    if(!(ownTop>55))throw new Error(`${name} is not on the lower bank`);
    if(!((await page.locator('#boss-name').textContent())||'').includes('NIGHT WRAITH'))throw new Error(`${name} sees wrong boss`);
  }
  mkdirSync('test-output',{recursive:true});
  await guest.screenshot({path:'test-output/online-boss-guest.png'});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Online duo boss invite and both lower-bank views passed');
}finally{await browser.close();}
