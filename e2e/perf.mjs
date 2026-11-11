// Performance baseline on the real app: start, idle memory, import and open a 100-page PDF.
// Run: npm run build:e2e, then npm run perf. Results go to e2e/out/perf.json.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApp, outDir, sleep } from './harness.mjs';
import { makePdf } from './fixture.mjs';

const PAGES = 100;
const mb = (n) => Math.round(n / 1048576);

function memory(app) {
  const ps = `
    $root = (Get-Process neutrino | Where-Object { $_.Path -eq '${app}' }).Id
    function Tree($id) { $id; Get-CimInstance Win32_Process -Filter "ParentProcessId=$id" | ForEach-Object { Tree $_.ProcessId } }
    $p = Get-Process -Id (Tree $root) -ErrorAction SilentlyContinue
    "$(($p | Measure-Object WorkingSet64 -Sum).Sum) $(($p | Measure-Object PrivateMemorySize64 -Sum).Sum) $($p.Count)"`;
  const [ws, priv, count] = execFileSync('powershell', ['-NoProfile', '-Command', ps]).toString().trim().split(' ').map(Number);
  return { workingSetMb: mb(ws), privateMb: mb(priv), processes: count };
}

const h = await startApp();
const result = { pages: PAGES };
let failed = false;
try {
  result.driverStartMs = h.sessionMs; // driver launches the app and waits for the window
  const t0 = Date.now();
  let tabs = 0;
  while (!tabs) {
    await sleep(100);
    tabs = await h.run('return document.querySelectorAll(".tab").length').catch(() => 0);
  }
  result.sessionToFirstTabMs = Date.now() - t0;
  await sleep(3000);
  result.memoryIdle = memory(h.app);

  const pdfPath = join(mkdtempSync(join(tmpdir(), 'neutrino-pdf-')), `perf-${PAGES}.pdf`);
  writeFileSync(pdfPath, makePdf(PAGES));

  const imp = await h.runAsync(`const done = arguments[arguments.length - 1]; const t0 = performance.now();
    const inv = window.__TAURI_INTERNALS__.invoke;
    inv('pdf_import_from_path', { sourcePath: ${JSON.stringify(pdfPath)} })
      .then((f) => inv('create_document', { title: 'perf', filePath: f.path, contentType: 'pdf', metadata: null }))
      .then((d) => done({ id: d.id, ms: Math.round(performance.now() - t0) }), (e) => done({ error: String(e) }));`);
  if (imp.error) throw new Error('import failed: ' + imp.error);
  result.importMs = imp.ms;

  const open = await h.runAsync(`const done = arguments[arguments.length - 1]; const t0 = performance.now();
    window.dispatchEvent(new CustomEvent('open-document-split-view', { detail: { documentId: ${JSON.stringify(imp.id)}, title: 'perf', page: 1 } }));
    const tick = () => {
      const c = document.querySelector('canvas');
      if (c && c.width > 0 && document.querySelector('.textLayer span')) return done({ ms: Math.round(performance.now() - t0) });
      if (performance.now() - t0 > 20000) return done({ error: 'viewer did not render in 20s' });
      setTimeout(tick, 50);
    };
    tick();`);
  if (open.error) throw new Error(open.error);
  result.openFirstPageMs = open.ms;
  await sleep(2000);
  result.memoryWithPdf = memory(h.app);

  writeFileSync(join(outDir, 'perf.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  writeFileSync(join(outDir, 'perf.png'), Buffer.from(await h.screenshot(), 'base64'));
} catch (e) {
  failed = true;
  console.error('PERF FAILED:', e.message);
  try {
    writeFileSync(join(outDir, 'perf-fail.png'), Buffer.from(await h.screenshot(), 'base64'));
    console.error(await h.run('return [...document.querySelectorAll("canvas")].length + " canvas, textLayer spans: " + document.querySelectorAll(".textLayer span").length + ", split? " + document.querySelectorAll("[class*=split]").length'));
  } catch {}
} finally {
  await h.close();
}
process.exit(failed ? 1 : 0);
