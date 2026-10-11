const {app,BrowserWindow,session}=require('electron');
const path=require('node:path');
app.setAppUserModelId('com.riviproj.taxishift');
let window;
function openGame(){
  window=new BrowserWindow({show:!process.env.TAXI_SMOKE_TEST,width:1440,height:900,minWidth:960,minHeight:540,backgroundColor:'#203134',autoHideMenuBar:true,title:'Taxi Shift',icon:path.join(__dirname,'../store-assets/icon-512.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  window.removeMenu();window.loadFile(path.join(__dirname,'../dist/index.html'));
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){window.setFullScreen(!window.isFullScreen());event.preventDefault();}});
  window.on('blur',()=>window.webContents.executeJavaScript("window.dispatchEvent(new Event('taxi-native-pause'))").catch(()=>{}));
}
if(!app.requestSingleInstanceLock())app.quit();
else{app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));openGame();});app.on('window-all-closed',()=>app.quit());}
