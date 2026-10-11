import { mkdir, cp, copyFile,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'style.css', 'mobile.css', 'landscape.css', 'icon.svg', 'diagnostics.html','privacy.html','licenses.html']) await copyFile(path.join(root, file), path.join(dist, file));
// Packaged releases must work completely offline and make no font requests.
const html=await readFile(path.join(dist,'index.html'),'utf8');
await writeFile(path.join(dist,'index.html'),html.replace(/^.*fonts\.googleapis\.com.*\r?\n/gm,''));
await cp(path.join(root, 'src'), path.join(dist, 'src'), { recursive: true });
await mkdir(path.join(dist, 'vendor'), { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(path.join(root, 'node_modules/three/build', file), path.join(dist, 'vendor', file));
console.log('Built offline-ready static game in dist/');
