import {test,expect} from '@playwright/test';

test('phone diagnostic checks graphics and deployed assets without starting the game',async({page})=>{
  await page.goto('/diagnostics.html');
  await expect(page.locator('#status')).toContainText('Basic checks passed');
  await expect(page.locator('#report')).toContainText('PASS: WebGL 2 graphics');
  await expect(page.locator('#report')).toContainText('PASS: ./vendor/three.core.js');
  await page.route('**/mobile.css?*',route=>route.fulfill({status:200,contentType:'text/html',body:'ERR_NGROK_6024'}));
  await page.reload();await expect(page.locator('#report')).toContainText('ngrok page returned instead of game file');
  await expect(page.locator('#status')).toContainText('Some checks failed');
});

test('missing startup module produces a useful error instead of an endless loading screen',async({page})=>{
  await page.route('**/src/main.js',route=>route.abort());await page.goto('/');
  await expect(page.locator('#fatal')).toBeVisible();await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#fatal-message')).toContainText('could not start');await expect(page.getByRole('link',{name:'Check this phone'})).toBeVisible();
});

test('unavailable external fonts do not block the mobile game',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.goto('http://localhost:5173/dist/');await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#fatal')).toBeHidden();
  await expect(page.locator('#rotate-screen')).toBeVisible();await page.setViewportSize({width:844,height:390});await expect(page.locator('#rotate-screen')).toBeHidden();
  await page.locator('#start-button').click();await expect(page.locator('#mobile-controls')).toBeVisible();await context.close();
});
