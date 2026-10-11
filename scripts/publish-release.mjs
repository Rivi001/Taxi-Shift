// Uses your existing GitHub Git credential helper; never prints or saves its token.
import {spawnSync} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {stat,readFile} from 'node:fs/promises';
import path from 'node:path';
const repo='Rivi001/Taxi-Shift',tag='v1.0.0-preview';
const files=process.argv.slice(2);
if(!files.length)throw new Error('Pass verified release artifact paths.');
for(const file of files){
  const resolved=path.resolve(file),root=path.resolve('release')+path.sep;
  if(!resolved.startsWith(root)||! /\.(exe|zip|apk|aab|txt)$/.test(file))throw new Error('Only release artifacts may be uploaded.');
  await stat(file);
}
const credential=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
if(credential.status!==0)throw new Error('GitHub authentication is needed. Sign in with Git Credential Manager first.');
const token=credential.stdout.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);
if(!token)throw new Error('No GitHub token returned by the credential helper.');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Taxi-Shift-release'};
async function api(url,options={}){
  const host=new URL(url).hostname;if(!['api.github.com','uploads.github.com'].includes(host))throw new Error('Unexpected release API host.');
  const r=await fetch(url,{...options,headers:{...headers,...options.headers}});
  if(!r.ok)throw new Error(`GitHub API ${r.status}: ${(await r.json()).message}`);
  return r.json();
}
const base=`https://api.github.com/repos/${repo}`;
const releases=await api(`${base}/releases`);
let release=releases.find(r=>r.tag_name===tag);
if(!release){
  release=await api(`${base}/releases`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:'main',name:'Taxi Shift 1.0.0 — test release',prerelease:true,body:await readFile('docs/RELEASE-NOTES.md','utf8')})});
}
for(const file of files){
  const name=path.basename(file);const existing=release.assets.find(a=>a.name===name);
  if(existing){console.log(`Already uploaded: ${name}`);continue;}
  const upload=release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name);
  const asset=await api(upload,{method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':String((await stat(file)).size)},body:createReadStream(file),duplex:'half'});
  console.log(`Uploaded ${asset.name}: ${asset.browser_download_url}`);
}
console.log(`Release: ${release.html_url}`);
