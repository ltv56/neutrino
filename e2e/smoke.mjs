// Smoke test through tauri-driver. Uses a scratch data dir, never the real app data.
// Run: npm run build:e2e (once), then npm run e2e
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const app = resolve('src-tauri/target/debug/neutrino.exe');
const dataDir = mkdtempSync(join(tmpdir(), 'neutrino-e2e-'));
const outDir = resolve('e2e/out');
mkdirSync(outDir, { recursive: true });
process.env.NEUTRINO_DATA_DIR = dataDir;

const driver = spawn('tauri-driver', [], { stdio: 'inherit', env: process.env });
const base = 'http://127.0.0.1:4444';
const wd = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (json.value?.error) throw new Error(`${json.value.error}: ${json.value.message}`);
  return json.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let session;
let failed = false;
try {
  for (let i = 0; i < 30; i++) {
    try { await fetch(base + '/status'); break; } catch { await sleep(200); }
  }
  const created = await wd('POST', '/session', {
    capabilities: { alwaysMatch: { browserName: 'wry', 'tauri:options': { application: app } } },
  });
  session = created.sessionId;
  const run = (script) => wd('POST', `/session/${session}/execute/sync`, { script, args: [] });
  const shot = async (name) => {
    const png = await wd('GET', `/session/${session}/screenshot`);
    writeFileSync(join(outDir, name), Buffer.from(png, 'base64'));
    console.log('screenshot:', join(outDir, name));
  };

  let tabs = 0;
  for (let i = 0; i < 40 && !tabs; i++) {
    await sleep(500);
    tabs = await run('return document.querySelectorAll(".tab").length').catch(() => 0);
  }
  console.log('title:', await wd('GET', `/session/${session}/title`), '| tabs:', tabs);
  // CSP: the PDF server must stay reachable, anything else on the network must be blocked
  const csp = await wd('POST', `/session/${session}/execute/async`, {
    script: `const done = arguments[arguments.length - 1]; const v = [];
      document.addEventListener('securitypolicyviolation', (e) => v.push(e.blockedURI));
      const tryFetch = (u) => fetch(u).catch(() => {});
      Promise.all([tryFetch('http://127.0.0.1:43572/documents/none'), tryFetch('https://example.com/')])
        .then(() => setTimeout(() => done({ host: location.host, v }), 300));`,
    args: [],
  });
  console.log('csp:', JSON.stringify(csp));
  if (csp.v.some((u) => u.includes('127.0.0.1'))) throw new Error('CSP blocks the PDF server');
  // a dev server page (devUrl) gets no CSP from Tauri, only the embedded build does
  if (csp.host.includes('tauri.localhost') && !csp.v.some((u) => u.includes('example.com'))) {
    throw new Error('CSP does not block external connections');
  }
  await shot('smoke.png');
  if (!tabs) throw new Error('no tab rendered');
} catch (e) {
  failed = true;
  console.error('E2E FAILED:', e.message);
} finally {
  if (session) await wd('DELETE', `/session/${session}`).catch(() => {});
  driver.kill();
}
process.exit(failed ? 1 : 0);
