import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const origin = process.env.DIVISION_SERVER_URL || 'http://127.0.0.1:8787';
const executablePath = process.env.DIVISION_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  const host = await browser.newPage({ viewport: { width: 470, height: 940 } });
  host.on('pageerror', error => errors.push(`host: ${error.message}`));
  await host.goto(origin, { waitUntil: 'domcontentloaded' });
  await host.locator('#menu-online').waitFor({ state: 'visible', timeout: 60000 });
  await host.locator('#menu-online').click({ timeout: 60000 });
  await host.locator('#online-host').click();
  await host.locator('#mode-panel [data-mode="random"]').click();
  await host.locator('#map-panel [data-map="riverside"]').click();
  const invite = host.locator('#online-invite-link');
  await invite.waitFor({ state: 'visible', timeout: 15000 });
  const inviteUrl = await invite.inputValue();
  mkdirSync('test-output', { recursive: true });
  await host.screenshot({ path: 'test-output/online-lobby.png' });

  const guest = await browser.newPage({ viewport: { width: 470, height: 940 } });
  guest.on('pageerror', error => errors.push(`guest: ${error.message}`));
  const guestFrames = [];
  const guestInputs = [];
  guest.on('websocket', socket => {
    socket.on('framesent', event => {
      try { const packet = JSON.parse(event.payload); if (packet.type === 'input') guestInputs.push(packet.input); } catch { /* Ignore. */ }
    });
    socket.on('framereceived', event => {
    try {
      const packet = JSON.parse(event.payload);
      if (packet.type === 'state') guestFrames.push({ frame: packet.frame, x: packet.state.players[1].x, time: packet.state.time });
    } catch { /* Ignore non-state frames. */ }
    });
  });
  await guest.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
  await guest.locator('#online-panel').waitFor({ state: 'visible', timeout: 60000 });
  await guest.locator('#online-characters [data-character="dorian"]').click();
  await guest.locator('#online-join').click();
  await host.locator('#player-hud').waitFor({ state: 'visible', timeout: 15000 });
  await guest.locator('#player-hud').waitFor({ state: 'visible', timeout: 15000 });
  await host.locator('#match-countdown').waitFor({ state: 'hidden', timeout: 10000 });
  await guest.locator('#match-countdown').waitFor({ state: 'hidden', timeout: 10000 });
  const hostLabel = await host.locator('.player-hud-label').textContent();
  const guestLabel = await guest.locator('.player-hud-label').textContent();
  if (!hostLabel.includes('Elias') || !guestLabel.includes('Dorian')) {
    throw new Error(`Wrong local fighters: ${hostLabel} / ${guestLabel}`);
  }
  for (const [page, name] of [[host, 'host'], [guest, 'guest']]) {
    const bank = await page.locator('#player-hud').evaluate(element => parseFloat(element.style.top));
    if (!(bank > 55)) throw new Error(`${name} fighter is not shown on the lower bank: ${bank}%`);
  }
  const before = await guest.locator('#player-hud').evaluate(element => parseFloat(element.style.left));
  const serverBefore = guestFrames.at(-1)?.x;
  await guest.keyboard.down('d');
  await guest.waitForFunction(start => parseFloat(document.querySelector('#player-hud').style.left) > start, before, { timeout: 10000 }).catch(() => {});
  await guest.waitForTimeout(450);
  await guest.keyboard.up('d');
  const after = await guest.locator('#player-hud').evaluate(element => parseFloat(element.style.left));
  if (!(after - before > 1.5)) {
    const state = await guest.evaluate(() => ({
      unit: document.querySelector('.game-unit').className,
      countdownHidden: document.querySelector('#match-countdown').hidden,
      overlay: document.querySelector('#overlay').className,
      status: document.querySelector('#online-status').textContent,
    }));
    throw new Error(`Guest input did not move: ${before} -> ${after}; ${JSON.stringify(state)}; frames ${JSON.stringify(guestFrames.slice(-8))}; inputs ${JSON.stringify(guestInputs.slice(-25))}; errors ${errors.join('; ')}`);
  }
  if (!guestInputs.some(value => value.x < 0) || !(guestFrames.at(-1)?.x < serverBefore)) {
    throw new Error('Guest movement was not rotated before reaching the authoritative arena');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await guest.screenshot({ path: 'test-output/online-guest.png' });
  await guest.reload({ waitUntil: 'domcontentloaded' });
  await guest.locator('#online-panel').waitFor({ state: 'visible', timeout: 60000 });
  await guest.locator('#online-join').click();
  await guest.waitForFunction(() => document.querySelector('.player-hud-label')?.textContent.includes('Dorian'), null, { timeout: 15000 });
  const rejoined = await guest.locator('.player-hud-label').textContent();
  if (!rejoined.includes('Dorian')) throw new Error(`Reconnect changed the fighter: ${rejoined}`);
  console.log(`Online browser smoke passed: ${hostLabel.trim()} / ${guestLabel.trim()}; guest moved ${before.toFixed(1)}% -> ${after.toFixed(1)}%`);
} finally {
  await browser.close();
}
