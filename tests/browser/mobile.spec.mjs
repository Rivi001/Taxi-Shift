import {test,expect} from '@playwright/test';

test('touch devices automatically get usable controls and menus at phone and tablet sizes',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/?test=1');await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/mobile-mode/);
  await expect(page.locator('#welcome-controls')).toContainText('Steer left');
  await page.locator('#start-button').click();
  for(const viewport of [{width:1024,height:768},{width:932,height:430},{width:844,height:390},{width:740,height:320},{width:640,height:360}]){
    await page.setViewportSize(viewport);await expect(page.locator('#mobile-controls')).toBeVisible();
    for(const control of await page.locator('[data-control]').all()){
      const box=await control.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
      expect(await control.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    }
    await page.locator('#mobile-menu-button').click();await expect(page.locator('#mobile-menu')).toBeVisible();await expect(page.locator('#mobile-controls')).toBeHidden();
    await page.locator('#mobile-help').click();await expect(page.locator('.touch-help')).toBeVisible();await expect(page.locator('.help-keys')).toBeHidden();await page.getByRole('button',{name:'Close help',exact:true}).click();
    await page.screenshot({path:`artifacts/mobile-layout-${viewport.width}.png`});
  }
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotate-screen')).toBeVisible();await expect(page.locator('#mobile-controls')).toBeHidden();
  const before=await page.evaluate(()=>window.__taxiTest.snapshot().player);await page.waitForTimeout(200);expect(await page.evaluate(()=>window.__taxiTest.snapshot().player)).toEqual(before);
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#rotate-screen')).toBeHidden();
  await page.locator('#mobile-menu-button').click();await page.locator('#mobile-sound').click();await expect(page.locator('#mobile-sound')).toHaveAttribute('aria-pressed','true');
  await page.locator('#mobile-camera').click();await expect(page.locator('#camera-name')).toHaveText('Driver’s seat');
  await page.locator('#garage-tab').click();await expect(page.locator('#garage')).toBeVisible();await expect(page.locator('#mobile-controls')).toBeHidden();await page.getByRole('button',{name:'Close garage',exact:true}).click();
  await page.locator('#races-tab').click();await page.locator('[data-race="sprint"]').click();await expect(page.locator('#mobile-controls')).toBeVisible();await expect(page.locator('.job-panel')).toBeHidden();
  expect(errors).toEqual([]);await context.close();
});

test('desktop keeps keyboard UI and cancelled touch releases its pedal',async({browser,page})=>{
  await page.goto('/');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#mobile-controls')).toBeHidden();await expect(page.locator('.control-hints')).toBeVisible();
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const phone=await context.newPage();
  await phone.goto('http://localhost:5173/?test=1');await expect(phone.locator('#loading')).toBeHidden();await phone.locator('#start-button').click();
  const gas=phone.locator('[data-control="forward"]'),box=await gas.boundingBox(),session=await context.newCDPSession(phone);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await expect.poll(()=>phone.evaluate(()=>window.__taxiTest.snapshot().player.speed)).toBeGreaterThan(2);
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(phone.locator('.pressed')).toHaveCount(0);
  const speed=await phone.evaluate(()=>window.__taxiTest.snapshot().player.speed);
  await expect.poll(()=>phone.evaluate(()=>window.__taxiTest.snapshot().player.speed)).toBeLessThan(speed);
  await phone.locator('#mobile-menu-button').click();const p=await phone.evaluate(()=>window.__taxiTest.snapshot().player);await phone.waitForTimeout(250);expect(await phone.evaluate(()=>window.__taxiTest.snapshot().player)).toEqual(p);
  await context.close();
});
