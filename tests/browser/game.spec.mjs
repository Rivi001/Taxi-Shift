import {test,expect} from '@playwright/test';
test('passenger shift, rewards, unlocks, customization and persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?test=1');await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#start-button').click();await page.locator('#job-button').click();
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().job.stage)).toBe('pickup');
  await page.evaluate(()=>{const t=window.__taxiTest.target();window.__taxiTest.teleport(t.x,t.z);});
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().job.stage)).toBe('dropoff');
  await page.evaluate(()=>{const t=window.__taxiTest.target();window.__taxiTest.teleport(t.x,t.z);});
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().save.trips)).toBe(1);
  const earned=await page.evaluate(()=>window.__taxiTest.snapshot().save.cash);expect(earned).toBeGreaterThan(100);
  await page.locator('#garage-tab').click();await expect(page.locator('.car-card')).toHaveCount(4);
  await page.locator('[data-car="hatch"]').click();await expect(page.locator('#toast')).toContainText('more to unlock');
  await page.evaluate(()=>window.__taxiTest.setCash(700));await page.locator('[data-car="hatch"]').click();
  expect(await page.evaluate(()=>window.__taxiTest.snapshot().save.cash)).toBe(50);
  await page.locator('[data-paint="#eb815f"]').click();await page.locator('[data-wheel="sport"]').click();await page.locator('#stripe-toggle').check();await page.screenshot({path:'artifacts/desktop-garage.png'});
  await page.reload();await expect(page.locator('#loading')).toBeHidden();
  const save=await page.evaluate(()=>window.__taxiTest.snapshot().save);expect(save.selected).toBe('hatch');expect(save.paint).toBe('#eb815f');expect(save.wheels).toBe('sport');expect(save.stripe).toBe(true);expect(save.trips).toBe(1);expect(save.cash).toBe(50);expect(errors).toEqual([]);
});
test('keyboard movement, both cameras, pause, races, and no double payout',async({page})=>{
  await page.goto('/?test=1');await expect(page.locator('#loading')).toBeHidden();await page.locator('#start-button').click();
  const z=await page.evaluate(()=>window.__taxiTest.snapshot().player.z);await page.keyboard.down('w');await page.waitForTimeout(1000);await page.keyboard.up('w');
  expect(await page.evaluate(()=>window.__taxiTest.snapshot().player.z)).toBeLessThan(z-2);
  await page.keyboard.press('c');await expect(page.locator('#camera-name')).toHaveText('Driver’s seat');await page.screenshot({path:'artifacts/first-person.png'});
  await page.keyboard.press('p');await expect(page.locator('#paused')).toBeVisible();const pausedZ=await page.evaluate(()=>window.__taxiTest.snapshot().player.z);await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__taxiTest.snapshot().player.z)).toBe(pausedZ);await page.locator('#resume-button').click();
  await page.locator('#races-tab').click();await page.locator('[data-race="sprint"]').click();
  await expect(page.locator('#turn-guidance')).toBeVisible();await expect(page.locator('#turn-name')).toHaveText('Turn right');
  await expect(page.locator('.job-panel')).toBeHidden();await expect(page.locator('#target-label')).toBeHidden();
  const raceHud=await page.locator('#race-hud').boundingBox();expect(raceHud.height).toBeLessThanOrEqual(48);expect(raceHud.x).toBeLessThan(30);
  await page.screenshot({path:'artifacts/race-gates.png'});
  await page.evaluate(()=>window.__taxiTest.raceReady());
  for(let i=0;i<6;i++){
    await page.evaluate(()=>{const t=window.__taxiTest.target();window.__taxiTest.teleport(t.x,t.z);});
    await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().race?.index??6)).toBe(i+1);
  }
  expect(await page.evaluate(()=>window.__taxiTest.snapshot().save.cash)).toBe(250);await page.waitForTimeout(300);expect(await page.evaluate(()=>window.__taxiTest.snapshot().save.cash)).toBe(250);
  await expect(page.locator('.job-panel')).toBeVisible();await expect(page.locator('#race-hud')).toBeHidden();
  await page.keyboard.press('c');await page.screenshot({path:'artifacts/desktop-game.png'});
});
test('race HUD and turn cue occupy separate corners on landscape phones',async({page})=>{
  await page.goto('/?test=1');await expect(page.locator('#loading')).toBeHidden();await page.locator('#races-tab').click();await page.locator('[data-race="sprint"]').click();
  for(const size of [{width:640,height:360},{width:844,height:390}]){
    await page.setViewportSize(size);await expect(page.locator('.job-panel')).toBeHidden();
    const hud=await page.locator('#race-hud').boundingBox();expect(hud.height).toBeLessThanOrEqual(44);expect(hud.x).toBeLessThan(20);expect(hud.x+hud.width).toBeLessThan(size.width);
    const turn=await page.locator('#turn-guidance').boundingBox();expect(turn.x).toBeGreaterThanOrEqual(hud.x+hud.width);expect(turn.y).toBe(hud.y);
    await page.screenshot({path:`artifacts/race-clear-${size.width}.png`});
  }
  await page.locator('#quit-race').click();await expect(page.locator('.job-panel')).toBeVisible();
});
test('mobile layout and simultaneous touch steering and acceleration',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/?test=1');await expect(page.locator('#loading')).toBeHidden();await page.locator('#start-button').click();await expect(page.locator('#mobile-controls')).toBeVisible();
  const gas=await page.locator('[data-control="forward"]').boundingBox(),left=await page.locator('[data-control="left"]').boundingBox();
  const session=await context.newCDPSession(page);
  const initial=await page.evaluate(()=>window.__taxiTest.snapshot().player);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gas.x+gas.width/2,y:gas.y+gas.height/2,id:1},{x:left.x+left.width/2,y:left.y+left.height/2,id:2}]});
  await page.waitForTimeout(700);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const moved=await page.evaluate(()=>window.__taxiTest.snapshot().player);expect(moved.speed).toBeGreaterThan(2);expect(moved.yaw).toBeGreaterThan(initial.yaw);await expect(page.locator('.pressed')).toHaveCount(0);
  await page.locator('#job-button').click();await page.screenshot({path:'artifacts/mobile-game.png'});
  const radar=await page.locator('.map-panel').boundingBox();expect(Math.abs(radar.width-radar.height)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  await page.locator('#garage-tab').click();await expect(page.locator('#garage')).toBeVisible();await page.screenshot({path:'artifacts/mobile-garage.png'});await context.close();
});
test('production build loads independently and fits a landscape phone',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // The guarded bootstrap imports the game asynchronously, after page load.
  // Give first-time shader compilation its own bounded readiness wait.
  await page.goto('/dist/');await expect(page.locator('#loading')).toBeHidden({timeout:30000});await expect(page.locator('#fatal')).toBeHidden();
  await page.screenshot({path:'artifacts/welcome.png'});await page.locator('#start-button').click();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#mobile-controls')).toBeVisible();
  await page.locator('#job-button').click();await expect(page.locator('#job-progress')).toBeVisible();
  await expect(page.locator('#boost-meter')).toHaveAttribute('aria-valuenow','100');
  await page.screenshot({path:'artifacts/landscape-game.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
