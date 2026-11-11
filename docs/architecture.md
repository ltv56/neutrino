# Architecture

Tauri 2 desktop app. React 19 UI talks to a Rust backend over `invoke`; the backend owns all data in SQLite.

## Layers

```
React (src/)                 Rust (src-tauri/src/)
pages, components, hooks     commands/        Tauri commands, thin
contexts (shared state)      database/        Database + repositories (sqlx)
services/ (invoke wrappers)  services/        clipboard + window context monitors
lib/, utils/ (pure logic)    core/            pure logic, no Tauri imports
                             http_server.rs   PDF streaming on loopback
                             documents/       file storage, PDF handling
```

- `src/services/*`: one wrapper per backend area; components never call `invoke` directly.
- `src-tauri/src/core/`: pure, unit-tested logic (`fts`, `ai_error`, `content_type`, `listener_state`). New pure logic goes here, not into commands.
- `commands/` parse arguments, call a repository, map errors to `String`.

## Data

SQLite file in the app data dir, WAL mode. Migrations in `src-tauri/migrations/` run at startup (`sqlx::migrate!`).

- Tables: research sessions, documents, notes, folders, note links, highlights, reading events.
- Full-text: `notes_fts` and `documents_fts` (FTS5, porter + unicode61), kept in sync by triggers. Queries go through `core::fts::to_prefix_query`.
- Compile-time checked queries use the offline cache in `src-tauri/.sqlx/`. After a schema or query change: `npm run db:update`.

## Runtime flows

- **Open a PDF**: UI asks for a document id, the loopback HTTP server (`127.0.0.1:43572-43581`, `GET /documents/{id}`, Range supported, Origin check) streams the file from its stored path into pdf.js.
- **Notes and links**: `[[Title]]`, `[[doc:Title#5]]`, `[[note:Title]]`; page suffix `#N` or `#page=N` (`src/lib/wikilink.ts`). Links are stored in `note_links`.
- **Clipboard capture**: a Win32 listener (`clipboard-master`) emits the `clipboard-changed` event with text, detected content type and the foreground window. Start/stop lifecycle is `core::listener_state`.
- **Window context**: `context_detection` reads the foreground window and process name; `context_monitor` emits `context-changed`.
- **AI**: `commands/ai.rs` calls Gemini with a shared client, 60 s timeout and model fallback (a rejected key stops at once, a 429 tries the next model).
- **Shell**: system tray, hide-on-close, global shortcuts (Ctrl+Alt+N main, Ctrl+Shift+F floating note), single instance, a second `floating-note` window.

## Checks

```bash
npm run lint && npm test && npm run build
cd src-tauri && cargo test    # SQLX_OFFLINE=true works without a database
```

CI (`.github/workflows/ci.yml`) runs the same on Windows.
