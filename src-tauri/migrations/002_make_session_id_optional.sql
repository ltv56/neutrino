-- Make session_id optional in documents table
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new documents table with nullable session_id
CREATE TABLE IF NOT EXISTS documents_new (
    id TEXT PRIMARY KEY,
    session_id TEXT,  -- Now nullable
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    metadata TEXT,
    reading_progress INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE SET NULL
);

-- Copy data from old table to new table
INSERT INTO documents_new
SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
FROM documents;

-- Drop old table
DROP TABLE documents;

-- Rename new table to documents
ALTER TABLE documents_new RENAME TO documents;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
