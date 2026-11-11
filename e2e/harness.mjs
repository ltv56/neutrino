// Starts the debug build through tauri-driver on a scratch data dir (never the real app data).
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const outDir = resolve('e2e/out');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = 'http://127.0.0.1:4444';

export async function startApp() {
  mkdirSync(outDir, { recursive: true });
  const app = resolve('src-tauri/target/debug/neutrino.exe');
  const dataDir = mkdtempSync(join(tmpdir(), 'neutrino-e2e-'));
  process.env.NEUTRINO_DATA_DIR = dataDir;
  const driver = spawn('tauri-driver', [], { stdio: 'inherit', env: process.env });

  const wd = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json();
    if (json.value?.error) throw new Error(`${json.value.error}: ${json.value.message}`);
    return json.value;
  };
  for (let i = 0; i < 30; i++) {
    try { await fetch(base + '/status'); break; } catch { await sleep(200); }
  }
  const startedAt = Date.now();
  const created = await wd('POST', '/session', {
    capabilities: { alwaysMatch: { browserName: 'wry', 'tauri:options': { application: app } } },
  });
  const session = created.sessionId;
  const sessionMs = Date.now() - startedAt;
  return {
    app, dataDir, startedAt, sessionMs, wd,
    run: (script) => wd('POST', `/session/${session}/execute/sync`, { script, args: [] }),
    runAsync: (script) => wd('POST', `/session/${session}/execute/async`, { script, args: [] }),
    title: () => wd('GET', `/session/${session}/title`),
    screenshot: () => wd('GET', `/session/${session}/screenshot`),
    async close() {
      await wd('DELETE', `/session/${session}`).catch(() => {});
      driver.kill();
    },
  };
}
