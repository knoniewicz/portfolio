// Prints the built /cv/ page to dist/cv.pdf with headless Chrome, so the PDF never drifts from the site.
// Runs after `astro build`. Chrome: $CHROME_BIN, else google-chrome / chromium on PATH (GitHub runners have one).
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const which = (b) => { try { return execSync(`command -v ${b}`, { shell: '/bin/sh' }).toString().trim(); } catch { return ''; } };
const chrome = process.env.CHROME_BIN || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!chrome) {
  const msg = 'cv-pdf: no Chrome found (set CHROME_BIN), skipping cv.pdf';
  if (process.env.CI) throw new Error(msg);
  console.warn(msg);
  process.exit(0);
}

// Serve dist/ so the page's root-relative assets resolve.
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(await readFile(join(dist, p))); }
  catch { res.writeHead(404).end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/cv/`;

const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${await mkdtemp(join(tmpdir(), 'cv-'))}`, 'about:blank']);
const wsUrl = await new Promise((r) => proc.stderr.on('data', (d) => { const m = String(d).match(/ws:\/\/\S+/); if (m) r(m[0]); }));
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id;
  pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
});

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId);
  // Wait for load and web fonts, so the PDF never falls back to Georgia.
  const ready = `location.href === ${JSON.stringify(url)} && document.readyState === "complete"`;
  for (let t = 0; !(await send('Runtime.evaluate', { expression: ready, returnByValue: true }, sessionId)).result.value; t++) {
    if (t > 150) throw new Error('cv-pdf: page did not load');
    await new Promise((r) => setTimeout(r, 100));
  }
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true }, sessionId);
  const { data } = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false }, sessionId);
  await writeFile(join(dist, 'cv.pdf'), Buffer.from(data, 'base64'));
  console.log('cv-pdf: wrote dist/cv.pdf');
} finally {
  ws.close();
  proc.kill();
  server.close();
}
