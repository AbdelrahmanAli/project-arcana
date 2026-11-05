import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:process.env.DIVISION_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const origin=process.env.DIVISION_DEV_URL||'http://127.0.0.1:5178/project-arcana/';
await mkdir('test-output/combat-ui',{recursive:true});
try{
  for(const [name,width,height] of [['phone',390,844],['desktop',1440,900],['landscape',844,390]]){
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // The fixture hook exists only in this intercepted development response, never in a shipped build.
    await page.route('**/src/main.js',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text())+'\nwindow.combatUiFixture=()=>game;'});
    });
    await page.goto(origin);
    await page.locator('#menu-play:not([disabled])').waitFor({timeout:60000});
    await page.locator('#menu-play').click();await page.locator('[data-format="2v2"]').click();
    await page.locator('[data-mode="random"]').click();await page.locator('[data-map="riverside"]').click();await page.locator('#lineup-start').click();
    await page.waitForFunction(()=>window.arcana?.snapshot().time>.2);
    await page.locator('#pistol-fire').click();
    await page.evaluate(()=>{const p=window.combatUiFixture().players[0];p.slot={type:'laser',ammo:3,ammoReceived:3};});
    await page.waitForTimeout(150);
    await page.locator('#special-fire').hover();await page.mouse.down();await page.waitForTimeout(700);
    assert.ok(await page.locator('#special-fire').evaluate(el=>el.classList.contains('laser-charging')));
    const label=await page.locator('.player-hud-label').evaluate(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)}));
    assert.ok(label.height<=label.lineHeight+1,'Player name and HP stay on one line');
    await page.screenshot({path:`test-output/combat-ui/${name}-charging.png`});
    await page.mouse.up();await page.waitForFunction(()=>document.getElementById('special-ammo').textContent==='2');
    assert.equal(await page.locator('#special-ammo').textContent(),'2');
    await page.locator('#dodge-fire').click();await page.waitForTimeout(150);
    await page.screenshot({path:`test-output/combat-ui/${name}-dodge.png`});
    const controls=await page.locator('.fire-control').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {id:button.id,visible:r.left>=0&&r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth};}));
    assert.ok(controls.every(control=>control.visible),JSON.stringify(controls));
    assert.equal(await page.locator('.game-top').count(),0);
    const pauseTarget=await page.locator('#pause').boundingBox();
    assert.ok(pauseTarget.width>=44&&pauseTarget.height>=44&&pauseTarget.x+pauseTarget.width<=width);
    assert.equal(await page.locator('#sound').isVisible(),false);
    await page.locator('#pause').click();await page.waitForTimeout(200);
    assert.equal(await page.locator('#pause').isVisible(),false);
    await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-label'),'Enable sound');
    assert.ok(await page.evaluate(()=>window.arcana.snapshot().paused));
    await page.screenshot({path:`test-output/combat-ui/${name}-paused.png`});
    async function checkOverlay(){
      const clipped=await page.locator('#overlay button').evaluateAll(buttons=>buttons.filter(button=>{const r=button.getBoundingClientRect();return r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth;}).map(button=>button.id));
      assert.deepEqual(clipped,[]);
    }
    await checkOverlay();await page.locator('#start').click();
    await page.evaluate(()=>{const m=window.combatUiFixture();for(const p of m.players.filter(p=>p.team!==m.players[0].team)){p.dodgeTime=0;m.damage(p,1000);}});
    await page.waitForFunction(()=>window.arcana.snapshot().finished,{},{timeout:15000});
    await page.waitForTimeout(1200);await page.screenshot({path:`test-output/combat-ui/${name}-result.png`});
    await checkOverlay();await page.locator('#start').click();await page.waitForFunction(()=>window.arcana.snapshot().started&&!window.arcana.snapshot().finished);
    assert.deepEqual(errors,[]);console.log(`${name}: charge, ammo, dodge, sound, pause, result, replay and control bounds passed`);
    await page.close();
  }
}finally{await browser.close();}
