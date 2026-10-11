import {readFile,writeFile,mkdir} from 'node:fs/promises';
const notices=[];
for(const name of ['three','@capacitor/core','@capacitor/android','electron']){
  let license='';for(const file of ['LICENSE','LICENSE.txt','LICENSE.md']){try{license=await readFile(`node_modules/${name}/${file}`,'utf8');break;}catch{}}
  notices.push(`${name}\n${'='.repeat(name.length)}\n${license||'See dependency distribution for license text.'}`);
}
await mkdir('store-assets',{recursive:true});await writeFile('store-assets/THIRD-PARTY-NOTICES.txt',notices.join('\n\n'));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
await writeFile('licenses.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Taxi Shift — Open-source notices</title></head><body style="font:14px/1.6 Arial;max-width:800px;margin:24px auto;padding:20px"><h1>Open-source notices</h1><pre style="white-space:pre-wrap">${escape(notices.join('\n\n'))}</pre></body></html>`);
