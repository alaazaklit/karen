// Minimal static server for previewing the site locally (no dependencies).
// Usage, from this folder:  node serve.mjs   →  http://127.0.0.1:4173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm'
};

createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL('http://localhost' + req.url).pathname); }    // malformed URL or %-escape
  catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Bad request'); }
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    const page = await readFile(join(ROOT, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  }
}).listen(PORT, '127.0.0.1', () => console.log('Karen K Sanctuaries — serving on http://127.0.0.1:' + PORT));
