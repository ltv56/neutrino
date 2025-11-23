-- Fix FTS properly: Use contentless FTS tables
-- This prevents corruption by not relying on external content reference

-- Drop old FTS tables (created with external content which causes corruption)
DROP TABLE IF EXISTS notes_fts;
DROP TABLE IF EXISTS documents_fts;

-- Create contentless FTS tables (safer - stores data internally)
-- Notes FTS
CREATE VIRTUAL TABLE notes_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    tags,
    tokenize = 'porter unicode61'
);

-- Documents FTS
CREATE VIRTUAL TABLE documents_fts USING fts5(
    id UNINDEXED,
    title,
    metadata,
    tokenize = 'porter unicode61'
);

-- Populate FTS tables from existing data
INSERT INTO notes_fts(id, title, content, tags)
SELECT id, title, content, COALESCE(tags, '') FROM notes;

INSERT INTO documents_fts(id, title, metadata)
SELECT id, title, COALESCE(metadata, '') FROM documents;

-- Create triggers to keep FTS in sync
-- Notes triggers
CREATE TRIGGER notes_fts_insert AFTER INSERT ON notes
BEGIN
    INSERT INTO notes_fts(id, title, content, tags)
    VALUES (new.id, new.title, new.content, COALESCE(new.tags, ''));
END;

CREATE TRIGGER notes_fts_update AFTER UPDATE ON notes
BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
    INSERT INTO notes_fts(id, title, content, tags)
    VALUES (new.id, new.title, new.content, COALESCE(new.tags, ''));
END;

CREATE TRIGGER notes_fts_delete AFTER DELETE ON notes
BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
END;

-- Documents triggers
CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents
BEGIN
    INSERT INTO documents_fts(id, title, metadata)
    VALUES (new.id, new.title, COALESCE(new.metadata, ''));
END;

CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents
BEGIN
    DELETE FROM documents_fts WHERE id = old.id;
    INSERT INTO documents_fts(id, title, metadata)
    VALUES (new.id, new.title, COALESCE(new.metadata, ''));
END;

CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents
BEGIN
    DELETE FROM documents_fts WHERE id = old.id;
END;
