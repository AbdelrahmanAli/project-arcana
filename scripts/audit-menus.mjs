import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:process.env.DIVISION_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const origin=process.env.DIVISION_DEV_URL||'http://127.0.0.1:5175/project-arcana/';
await mkdir('test-output/menus',{recursive:true});
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',360,640],['compact',320,568],['landscape',844,390],['small-landscape',667,375]]){
    if(process.argv[2]&&!process.argv.slice(2).includes(name))continue;
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);
    await page.locator('#menu-play:not([disabled])').waitFor({timeout:60000});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>['Jersey 10','VT323'].every(family=>Array.from(document.fonts).some(face=>face.family.replaceAll('"','')===family&&face.status==='loaded'))),true,'bundled game fonts load');
    async function capture(screen){
      await page.waitForTimeout(400);
      await page.screenshot({path:`test-output/menus/${name}-${screen}.png`});
      const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,arena:getComputedStyle(document.querySelector('#arena')).display}));
      assert.equal(layout.arena,'none','Arena must not be visible beneath menus');
      assert.ok(layout.width<=width,`${name} ${screen} horizontal overflow: ${layout.width}`);
      const clipped=await page.locator('#menu .menu-card:not(.hidden) button:visible').evaluateAll(buttons=>buttons.filter(button=>{const r=button.getBoundingClientRect();return r.bottom>innerHeight+1||r.top<0||r.right>innerWidth+1||r.left<0;}).map(button=>button.id||button.textContent));
      assert.deepEqual(clipped,[],`${name} ${screen} clipped controls`);
      console.log(`${name} ${screen}: ${layout.width}x${layout.height} viewport ${width}x${height}`);
    }
    await capture('home');
    await page.locator('#menu-settings').click();await capture('settings');
    await page.locator('#settings-back').click();await page.locator('#menu-play').click();await capture('format');
    await page.locator('[data-format="2v2"]').click();await capture('rules');
    await page.locator('[data-mode="choose-fixed"]').click();await capture('weapons');
    await page.locator('.weapon-choice').first().click();await page.locator('#weapon-start').click();await capture('maps');
    await page.locator('[data-map="snow"]').click();await capture('lineup');
    await page.locator('.lineup-tabs button').first().click();
    await page.locator('.lineup-option:not(:disabled)').nth(1).click();
    await page.locator('.lineup-tabs button').last().click();
    await page.locator('#lineup-start').click();await page.locator('#menu').waitFor({state:'hidden'});
    assert.deepEqual(errors,[],`${name} runtime errors`);
    await page.close();
  }
}finally{await browser.close();}
