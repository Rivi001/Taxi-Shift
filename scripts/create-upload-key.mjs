import {existsSync, mkdirSync, writeFileSync, readdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'.signing');
const key=path.join(dir,'upload-keystore.p12');
const properties=path.join(dir,'key.properties');
if(existsSync(key)||existsSync(properties)){
  if(!existsSync(key)||!existsSync(properties))throw new Error('Incomplete .signing folder. Restore your backup; existing signing material will not be overwritten.');
  console.log('Existing upload signing key retained.');
  process.exit(0);
}
let java=process.env.JAVA_HOME;
const bundled=path.join(root,'.android-tools','jdk');
if(!java&&existsSync(bundled))java=path.join(bundled,readdirSync(bundled).find(n=>n.startsWith('jdk-')));
if(!java)throw new Error('Set JAVA_HOME to JDK 21 or run npm run android:tools.');
mkdirSync(dir,{recursive:true});
const password=randomBytes(32).toString('hex');
const result=spawnSync(path.join(java,'bin',process.platform==='win32'?'keytool.exe':'keytool'),[
  '-genkeypair','-keystore',key,'-storetype','PKCS12','-alias','upload',
  '-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Taxi Shift Upload',
  '-storepass:env','TAXI_UPLOAD_PASSWORD','-keypass:env','TAXI_UPLOAD_PASSWORD',
],{env:{...process.env,TAXI_UPLOAD_PASSWORD:password},encoding:'utf8'});
if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr);
writeFileSync(properties,`storePassword=${password}\nkeyPassword=${password}\nkeyAlias=upload\n`,{mode:0o600});
console.log('Created private upload key in .signing/. Back up this entire folder securely; never commit or share it.');
