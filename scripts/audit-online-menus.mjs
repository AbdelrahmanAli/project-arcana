import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:process.env.DIVISION_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.DIVISION_SERVER_URL||'http://127.0.0.1:8787';
await mkdir('test-output/menus',{recursive:true});
try{
  const host=await browser.newPage();
  await host.goto(origin);await host.locator('#menu-online:not([disabled])').waitFor({timeout:60000});await host.locator('#menu-online').click();
  async function inspect(page,screen){
    for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',360,640],['landscape',844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(350);
      await page.screenshot({path:`test-output/menus/${name}-${screen}.png`});
      const clipped=await page.locator('#online-panel button:visible,#online-panel input:visible').evaluateAll(elements=>elements.filter(element=>{const r=element.getBoundingClientRect();return r.bottom>innerHeight+1||r.top<0||r.right>innerWidth+1||r.left<0;}).map(element=>element.id||element.textContent));
      assert.deepEqual(clipped,[],`${name} ${screen} clipped controls`);
      console.log(`${name} ${screen}: all controls visible`);
    }
  }
  await inspect(host,'online-entry');
  await host.locator('#online-host').click();await host.locator('[data-online-mode="versus"]').click();await host.locator('[data-mode="random"]').click();await host.locator('[data-map="storm"]').click();
  await host.locator('#online-invite-link').waitFor({state:'visible'});
  const invite=await host.locator('#online-invite-link').inputValue();await inspect(host,'online-host');
  const guest=await browser.newPage();await guest.goto(origin+new URL(invite).search);await guest.locator('#online-teams').waitFor({state:'visible',timeout:60000});await inspect(guest,'online-guest');
}finally{await browser.close();}
