import http from 'node:http';
import { readFile, stat, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
await mkdir(path.join(root, 'vendor'), { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(path.join(root, 'node_modules/three/build', file), path.join(root, 'vendor', file));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Serve game assets only. Build tools and signing material must never be public.
    const publicPath=pathname.replace(/^\//,'').replace(/^dist\//,'');
    if(publicPath && !/^(index\.html|diagnostics\.html|privacy\.html|licenses\.html|style\.css|mobile\.css|landscape\.css|icon\.svg|(?:src|vendor|assets)\/[\w/.-]+\.(?:js|css|woff2?|png|svg|jpg|json))$/.test(publicPath)) {res.writeHead(404);return res.end('Not found');}
    if(pathname.split('/').some(part=>part.startsWith('.'))) {res.writeHead(404);return res.end('Not found');}
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 5173), '0.0.0.0', () => console.log('Taxi Shift is ready: http://localhost:5173'));
