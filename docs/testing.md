# Testing

```bash
npm run lint && npm run lint:eslint && npm test
cd src-tauri && cargo test
```

## E2E smoke (real app, WebView2)

One-time setup:

```bash
cargo install tauri-driver
# msedgedriver must match the installed WebView2 version, put it on PATH
# https://msedgedriver.microsoft.com/<version>/edgedriver_win64.zip
```

Run:

```bash
npm run build:e2e   # debug build with the frontend embedded
npm run e2e         # starts the app on a scratch data dir, screenshot in e2e/out/smoke.png
```

`NEUTRINO_DATA_DIR` points the app at a scratch directory (never the real app data) and skips the single-instance check, so it runs next to a normal app.
