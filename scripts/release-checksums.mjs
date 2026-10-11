import {createReadStream} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const files=['windows/Taxi-Shift-1.0.0-Windows-Setup.exe','windows/Taxi-Shift-1.0.0-win-x64.zip','android/Taxi-Shift-1.0.0.apk','android/Taxi-Shift-1.0.0.aab'];
const lines=[];
for(const file of files){const hash=createHash('sha256');for await(const chunk of createReadStream(path.join('release',file)))hash.update(chunk);lines.push(`${hash.digest('hex')}  ${path.basename(file)}`);}
await writeFile('release/SHA256SUMS.txt',lines.join('\n')+'\n');
console.log('Created release/SHA256SUMS.txt for all four release files.');
