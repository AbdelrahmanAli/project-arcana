import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:process.env.DIVISION_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.DIVISION_DEV_URL||'http://127.0.0.1:5180/project-arcana/';
await mkdir('test-output/ai-controls',{recursive:true});
try{
  for(const [name,width,height] of [['phone',390,844],['landscape',844,390]]){
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.aiControlsFixture=()=>game; window.aiControlsOnlineSetup=()=>showMenuPanel("online-format-panel");'});
    });
    await page.goto(origin);
    await page.locator('#menu-play:not([disabled])').waitFor({timeout:60000});await page.locator('#menu-play').click();
    assert.equal(await page.locator('#format-panel [data-difficulty="normal"]').getAttribute('aria-pressed'),'true');
    await page.locator('#format-panel [data-difficulty="easy"]').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('division-difficulty-v1')),'easy');
    async function bounds(selector){
      await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
      const clipped=await page.locator(selector).evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight;}).map(b=>b.textContent));
      assert.deepEqual(clipped,[]);
    }
    await bounds('#format-panel button');await page.screenshot({path:`test-output/ai-controls/${name}-difficulty.png`});
    // Vite has no room service; exercise setup layout here, real rooms in the online smoke test.
    await page.evaluate(()=>window.aiControlsOnlineSetup());
    assert.equal(await page.locator('#online-format-panel [data-difficulty="easy"]').getAttribute('aria-pressed'),'true');
    await bounds('#online-format-panel button');await page.screenshot({path:`test-output/ai-controls/${name}-coop.png`});
    await page.reload();await page.locator('#menu-play:not([disabled])').waitFor({timeout:60000});await page.locator('#menu-play').click();
    assert.equal(await page.locator('#format-panel [data-difficulty="easy"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-format="1v1"]').click();await page.locator('[data-mode="random"]').click();await page.locator('[data-map="riverside"]').click();await page.locator('#lineup-start').click();
    await page.waitForFunction(()=>window.arcana?.snapshot().time>.2);
    assert.equal(await page.evaluate(()=>window.aiControlsFixture().difficulty),'easy');
    await page.locator('#pistol-fire').click();
    await page.evaluate(()=>{const m=window.aiControlsFixture();m.obstacles=[];m.nextDrop=Infinity;m.players[1].controller='human';m.players[0].slot={type:'laser',ammo:2};});
    await page.locator('#special-fire').hover();await page.mouse.down();await page.waitForTimeout(500);
    assert.ok(await page.evaluate(()=>window.aiControlsFixture().players[0].charge>.1));
    await page.keyboard.press('Shift');await page.waitForTimeout(750);
    assert.equal(await page.evaluate(()=>window.aiControlsFixture().players[0].charge),0);
    await page.mouse.up();await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.aiControlsFixture().players[0].slot.ammo),2);
    await page.mouse.down();await page.waitForTimeout(300);
    assert.ok(await page.evaluate(()=>window.aiControlsFixture().players[0].charge>0));
    await page.mouse.up();assert.deepEqual(errors,[]);
    console.log(`${name}: difficulty controls fit, preference persists, match uses it, dodge cancels held laser without spending ammo`);
    await page.close();
  }
}finally{await browser.close();}
