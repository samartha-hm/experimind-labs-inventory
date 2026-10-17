// Loopback-only fault injection for synthetic browser acceptance; never part of the app.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
const control = '.local-dev/13j-fault.json';
http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:3102');
  if (url.pathname === '/__13j/responsive') {
    const width = [360, 768, 1280].includes(Number(url.searchParams.get('width'))) ? Number(url.searchParams.get('width')) : 768;
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><html lang="en"><title>Synthetic responsive acceptance</title><body style="margin:0"><iframe title="Projects acceptance at ${width}px" style="border:0;width:${width}px;height:1024px" src="/index.html?projects_workspace=1&projects_audit=1"></iframe></body></html>`); return;
  }
  if (url.pathname === '/__13j/axe.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.end(await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js')); return;
  }
  if (url.pathname === '/__13j/audit.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    response.end(`window.addEventListener('load', () => {
      const button = document.createElement('button'); button.textContent = 'Run synthetic accessibility audit';
      button.onclick = async () => {
        const result = await axe.run('.projects-workspace', {runOnly: {type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}});
        let output = document.getElementById('synthetic-audit');
        if (!output) { output = document.createElement('pre'); output.id = 'synthetic-audit'; document.body.append(output); }
        output.textContent = JSON.stringify({width:innerWidth,height:innerHeight,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),passes:result.passes.length,incomplete:result.incomplete.map(v=>v.id)});
      }; document.body.append(button);
    });`); return;
  }
  let mode = {};
  delete request.headers['if-none-match'];
  delete request.headers['if-modified-since'];
  if (request.method === 'GET' && request.url.includes('/planning-projects/workspace/projects')) {
    try { mode = JSON.parse(await readFile(control, 'utf8')); } catch {}
    if (mode.status) { response.writeHead(mode.status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Synthetic browser acceptance fault' })); return; }
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: 3101, path: request.url, method: request.method, headers: { ...request.headers, host: '127.0.0.1:3101', 'accept-encoding': 'identity' } }, result => {
    if (mode.loseResponse) {
      result.resume(); result.on('end', async () => { await writeFile(control, '{}'); response.destroy(); }); return;
    }
    if (url.searchParams.has('projects_audit') && result.headers['content-type']?.includes('text/html')) {
      const chunks = []; result.on('data', chunk => chunks.push(chunk)); result.on('end', () => {
        const headers = { ...result.headers, 'cache-control': 'no-store' }; delete headers['content-length']; delete headers['content-encoding']; delete headers.etag;
        response.writeHead(result.statusCode, headers);
        response.end(Buffer.concat(chunks).toString('utf8').replace('<head>', '<head><script>history.replaceState(null,"","/?projects_workspace=1&projects_audit=1")</script>').replace('</body>', '<script src="/__13j/axe.js"></script><script src="/__13j/audit.js"></script></body>'));
      }); return;
    }
    response.writeHead(result.statusCode, result.headers); result.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  response.on('close', () => upstream.destroy()); request.pipe(upstream);
}).listen(3102, '127.0.0.1');
