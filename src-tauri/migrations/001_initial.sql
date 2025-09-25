-- Create research_sessions table
CREATE TABLE IF NOT EXISTS research_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    goal TEXT,
    phase TEXT NOT NULL DEFAULT 'exploration',
    context_state TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    metadata TEXT,
    reading_progress INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

-- Create document_links table
CREATE TABLE IF NOT EXISTS document_links (
    id TEXT PRIMARY KEY,
    source_doc_id TEXT NOT NULL,
    target_doc_id TEXT NOT NULL,
    source_position TEXT,
    target_position TEXT,
    link_type TEXT NOT NULL,
    context TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (source_doc_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (target_doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    document_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'concept',
    position TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Create reading_events table
CREATE TABLE IF NOT EXISTS reading_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    position TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create concepts table
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    domain TEXT,
    evolution_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create concept_links table
CREATE TABLE IF NOT EXISTS concept_links (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    document_id TEXT,
    note_id TEXT,
    position TEXT,
    relationship TEXT NOT NULL,
    confidence REAL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_document_links_source ON document_links(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_document_links_target ON document_links(target_doc_id);
CREATE INDEX IF NOT EXISTS idx_notes_session_id ON notes(session_id);
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON notes(document_id);
CREATE INDEX IF NOT EXISTS idx_reading_events_session ON reading_events(session_id);
CREATE INDEX IF NOT EXISTS idx_reading_events_document ON reading_events(document_id);
CREATE INDEX IF NOT EXISTS idx_reading_events_timestamp ON reading_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_concept_links_concept ON concept_links(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_links_document ON concept_links(document_id);

-- Full-text search for notes and documents
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id, title, content, tags,
    content='notes',
    content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    id, title, metadata,
    content='documents',
    content_rowid='rowid'
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes
BEGIN
    INSERT INTO notes_fts(id, title, content, tags)
    VALUES (new.id, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes
BEGIN
    UPDATE notes_fts SET title = new.title, content = new.content, tags = new.tags
    WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes
BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents
BEGIN
    INSERT INTO documents_fts(id, title, metadata)
    VALUES (new.id, new.title, new.metadata);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents
BEGIN
    UPDATE documents_fts SET title = new.title, metadata = new.metadata
    WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents
BEGIN
    DELETE FROM documents_fts WHERE id = old.id;
END;