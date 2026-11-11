// Smoke test through tauri-driver. Uses a scratch data dir, never the real app data.
// Run: npm run build:e2e (once), then npm run e2e
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startApp, outDir, sleep } from './harness.mjs';

const h = await startApp();
const { wd, run, runAsync } = h;
let failed = false;
try {
  let tabs = 0;
  for (let i = 0; i < 40 && !tabs; i++) {
    await sleep(500);
    tabs = await run('return document.querySelectorAll(".tab").length').catch(() => 0);
  }
  console.log('title:', await h.title(), '| tabs:', tabs);
  if (!tabs) throw new Error('no tab rendered');

  // CSP: the PDF server must stay reachable, anything else on the network must be blocked
  const csp = await runAsync(`const done = arguments[arguments.length - 1]; const v = [];
      document.addEventListener('securitypolicyviolation', (e) => v.push(e.blockedURI));
      const tryFetch = (u) => fetch(u).catch(() => {});
      Promise.all([tryFetch('http://127.0.0.1:43572/documents/none'), tryFetch('http://localhost:43572/documents/none'), tryFetch('https://example.com/')])
        .then(() => setTimeout(() => done({ host: location.host, v }), 300));`);
  console.log('csp:', JSON.stringify(csp));
  if (csp.v.some((u) => u.includes('127.0.0.1') || u.includes('localhost:43572'))) throw new Error('CSP blocks the PDF server');
  // a dev server page (devUrl) gets no CSP from Tauri, only the embedded build does
  if (csp.host.includes('tauri.localhost') && !csp.v.some((u) => u.includes('example.com'))) {
    throw new Error('CSP does not block external connections');
  }

  // capabilities: what the UI needs works, what it does not need is denied
  const caps = await runAsync(`const done = arguments[arguments.length - 1];
      const call = (cmd, args) => window.__TAURI_INTERNALS__.invoke(cmd, args).then(() => 'ok', () => 'denied');
      Promise.all([
        call('plugin:window|is_maximized', { label: 'main' }),
        call('plugin:fs|exists', { path: 'C:/Windows' }),
        call('plugin:global-shortcut|is_registered', { shortcut: 'Ctrl+Alt+N' }),
      ]).then(([windowOk, fs, shortcut]) => done({ windowOk, fs, shortcut }));`);
  console.log('capabilities:', JSON.stringify(caps));
  if (caps.windowOk !== 'ok') throw new Error('window permission missing');
  if (caps.fs !== 'denied' || caps.shortcut !== 'denied') throw new Error('unused plugin permissions are still granted');

  writeFileSync(join(outDir, 'smoke.png'), Buffer.from(await h.screenshot(), 'base64'));
  console.log('screenshot:', join(outDir, 'smoke.png'));
} catch (e) {
  failed = true;
  console.error('E2E FAILED:', e.message);
} finally {
  await h.close();
}
process.exit(failed ? 1 : 0);
