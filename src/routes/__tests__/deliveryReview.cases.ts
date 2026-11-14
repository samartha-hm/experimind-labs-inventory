import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';

/** Explicit opt-in, local-only review of an isolated integration fixture via the supported browser. */
export async function reviewDeliveryFixture(base: string, token: string, profile: object, project: string,
  pending: { path: string; key: string; input: unknown }) {
  const evidencePath = process.env.ERP_DELIVERY_BROWSER_REVIEW;
  if (!evidencePath) return;
  const bootstrap = `import React from 'react';import{createRoot}from'react-dom/client';
    import Panel from './src/features/delivery/TrustedDeliveryPanel';import{setApiAuthToken}from './src/utils/api';
    setApiAuthToken(${JSON.stringify(token)});sessionStorage.setItem(${JSON.stringify(`delivery.pending.${(profile as { organization_id: string }).organization_id}.${(profile as { id: string }).id}`)},${JSON.stringify(JSON.stringify(pending))});
    createRoot(document.getElementById('root')).render(<Panel projectId=${JSON.stringify(project)}/>);`;
  const compiled = await build({ stdin: { contents: bootstrap, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, outfile: 'review.js', format: 'iife', jsx: 'automatic', plugins: [{ name: 'fixture-profile', setup(b) {
      b.onResolve({ filter: /AuthContext$/ }, () => ({ path: 'profile', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const useAuth=()=>({currentUser:${JSON.stringify(profile)}});` }));
    } }] });
  const receipts: { method: string; path: string; status: number; result: unknown }[] = [];
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; });
  const server = createServer(async (req, res) => {
    try {
      const path = (req.url ?? '/').split('?')[0];
      if (path === '/review-done') { res.end('Review complete'); finish(); return; }
      if (path.startsWith('/api/v1/production-planning/')) {
        const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const response = await fetch(base + path.slice('/api/v1/production-planning'.length), {
          method: req.method, headers: { Authorization: req.headers.authorization ?? '', 'Content-Type': 'application/json',
            'Idempotency-Key': String(req.headers['idempotency-key'] ?? '') },
          ...(req.method === 'POST' ? { body: Buffer.concat(chunks).toString() } : {}) });
        const text = await response.text();
        if (req.method === 'POST') receipts.push({ method: req.method, path, status: response.status, result: JSON.parse(text) });
        res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(text); return;
      }
      const asset = compiled.outputFiles.find(file => path === '/' + file.path.split(/[\\/]/).pop());
      if (asset) { res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(asset.contents); return; }
      res.setHeader('Content-Type', 'text/html');
      res.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/review.css"><h1>Isolated synthetic ERP review - no physical acceptance</h1><form action="/review-done"><button>Finish synthetic review</button></form><div id="root"></div><script src="/review.js"></script>');
    } catch { res.writeHead(500); res.end('Synthetic review request failed'); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  writeFileSync(evidencePath, JSON.stringify({ url: `http://127.0.0.1:${address.port}`, project, receipts }));
  const timer = setTimeout(finish, 600_000);
  try { await done; } finally {
    clearTimeout(timer); writeFileSync(evidencePath, JSON.stringify({ project, receipts }, null, 2));
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
