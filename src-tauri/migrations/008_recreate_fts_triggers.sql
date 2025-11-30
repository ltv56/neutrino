-- Fix: Recreate FTS triggers that were lost in migration 007
-- Migration 007 dropped documents table which also deleted all triggers
-- This migration recreates the FTS triggers

-- Drop existing triggers if any (to allow clean recreation)
DROP TRIGGER IF EXISTS documents_fts_insert;
DROP TRIGGER IF EXISTS documents_fts_update;
DROP TRIGGER IF EXISTS documents_fts_delete;

-- Recreate FTS triggers for documents
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

-- Rebuild FTS index from existing documents
DELETE FROM documents_fts;
INSERT INTO documents_fts(id, title, metadata)
SELECT id, title, COALESCE(metadata, '') FROM documents;
