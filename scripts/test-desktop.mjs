import {_electron as electron,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const app=await electron.launch({...(process.argv[2]?{executablePath:process.argv[2]}:{}),args:process.argv[2]?[]:['.'],env:{...process.env,TAXI_SMOKE_TEST:'1'}});
try{
  const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.show();window.focus();});
  await expect(page.locator('#loading')).toBeHidden({timeout:45000});await expect(page.locator('#fatal')).toBeHidden();
  await page.locator('#start-button').click();await page.keyboard.down('w');
  await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(5);await page.keyboard.up('w');
  await page.keyboard.press('c');await expect(page.locator('#camera-name')).toHaveText('Driver’s seat');
  await page.evaluate(()=>window.dispatchEvent(new Event('taxi-native-pause')));await expect(page.locator('#paused')).toBeVisible();await page.locator('#resume-button').click();
  await page.screenshot({path:'artifacts/windows-app.png'});expect(errors).toEqual([]);
  console.log('Windows app startup, driving, camera and native pause passed.');
}finally{await app.close();}
