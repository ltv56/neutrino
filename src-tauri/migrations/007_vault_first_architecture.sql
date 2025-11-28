-- Refactor: Vault-First Architecture
-- Move from documents.session_id to session_documents junction table

-- Step 1: Create session_documents junction table
CREATE TABLE IF NOT EXISTS session_documents (
    session_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    notes TEXT,
    PRIMARY KEY (session_id, document_id),
    FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Step 2: Migrate existing data from documents.session_id
INSERT INTO session_documents (session_id, document_id, added_at, notes)
SELECT session_id, id, created_at, NULL
FROM documents
WHERE session_id IS NOT NULL;

-- Step 3: Recreate documents table WITHOUT session_id
-- (SQLite doesn't support DROP COLUMN, need to recreate)

-- 3a. Create new documents table without session_id
CREATE TABLE IF NOT EXISTS documents_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    metadata TEXT,
    reading_progress INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3b. Copy data (excluding session_id column)
INSERT INTO documents_new (id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at)
SELECT id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
FROM documents;

-- 3c. Drop old table
DROP TABLE documents;

-- 3d. Rename new table
ALTER TABLE documents_new RENAME TO documents;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_session_documents_session ON session_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_session_documents_document ON session_documents(document_id);

-- Note: FTS triggers are recreated automatically by SQLite
-- when documents table is recreated with the same name
