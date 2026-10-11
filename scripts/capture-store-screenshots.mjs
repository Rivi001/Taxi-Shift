import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('store-assets/screenshots',{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try{
  for(const mode of ['taxi','race']){
    const context=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage();await page.goto('http://localhost:5173/?test=1');
    await expect(page.locator('#loading')).toBeHidden({timeout:30000});await page.locator('#start-button').click();
    if(mode==='taxi'){await page.locator('#job-button').click();await expect(page.locator('#job-progress')).toBeVisible();}
    else{await page.locator('#races-tab').click();await page.locator('[data-race="sprint"]').click();await expect(page.locator('#race-hud')).toBeVisible();}
    await page.screenshot({path:`store-assets/screenshots/${mode==='taxi'?'01-taxi-driving':'02-checkpoint-race'}.png`});await context.close();
  }
}finally{await browser.close();}
console.log('Captured actual game screens at 1280 × 720.');
