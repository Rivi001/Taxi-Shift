import {test,expect} from '@playwright/test';

test('keyboard drift makes smoke and skid marks, then recovers and clears effects',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/?test=1');await expect(page.locator('#loading')).toBeHidden();
  await page.locator('#start-button').click();
  await page.evaluate(()=>window.__taxiTest.teleport(0,10,Math.PI,28));
  await page.keyboard.down('w');await page.keyboard.down('a');await page.keyboard.down('Space');
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().player.drifting)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.effects().marksLaid)).toBeGreaterThan(4);
  await expect(page.locator('#drift-meter')).toBeVisible();
  expect(await page.evaluate(()=>window.__taxiTest.effects().livePuffs)).toBeGreaterThan(0);
  await page.screenshot({path:'artifacts/drifting.png'});
  await page.keyboard.up('Space');await page.keyboard.up('a');await page.keyboard.up('w');
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().player.drifting)).toBe(false);
  await page.keyboard.press('r');
  const player=await page.evaluate(()=>window.__taxiTest.snapshot().player);
  expect(Math.abs(player.slip)).toBe(0);expect(player.speed).toBe(0);
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.effects().liveMarks)).toBe(0);
  expect(await page.evaluate(()=>window.__taxiTest.effects().livePuffs)).toBe(0);
  await expect(page.locator('#drift-meter')).toBeHidden();expect(errors).toEqual([]);
});

test('mobile supports throttle, steering and drift together',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage();await page.goto('http://localhost:5173/?test=1');await expect(page.locator('#loading')).toBeHidden();await page.locator('#start-button').click();
  const points=[];for(const [i,control] of ['forward','left','brake'].entries()){
    const box=await page.locator(`[data-control="${control}"]`).boundingBox();points.push({x:box.x+box.width/2,y:box.y+box.height/2,id:i+1});
  }
  await page.evaluate(()=>window.__taxiTest.teleport(0,10,Math.PI,28));
  const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().player.drifting)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.effects().livePuffs)).toBeGreaterThan(0);
  await page.screenshot({path:'artifacts/mobile-drifting.png'});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('.pressed')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.__taxiTest.snapshot().player.drifting)).toBe(false);
  await context.close();
});
