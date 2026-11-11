# Performance baseline

Measured with `npm run build:e2e && npm run perf` (real app, WebView2, scratch data dir).
Debug Rust build with the production frontend embedded. Numbers are the median of 2 warm runs on the dev machine (2026-11-11).

| Metric | Value |
|---|---|
| Driver starts the app and the window opens | ~0.5 s |
| Window open to first tab rendered | ~0.5 s |
| Memory idle (app + WebView2, 8 processes), working set / private | ~556 MB / ~326 MB |
| Import a 100-page PDF (copy + insert + hash) | ~45 ms |
| Open it: first page rendered with text layer | ~0.6 s |
| Memory with the PDF open, working set / private | ~593 MB / ~362 MB |

Notes:
- The first run on a fresh data dir was much slower (cold WebView2 profile, ~20 s to first tab); not counted.
- Fixture is a generated text PDF (`e2e/fixture.mjs`), small on disk. Real scanned or image-heavy papers will cost more.
- Not measured yet: release Rust build, scrolling through all pages, PDFs over 100 MB.
