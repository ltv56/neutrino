-- Migration 003: Update reading_events table for PDF highlights and annotations
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

DROP INDEX IF EXISTS idx_reading_events_session;
DROP INDEX IF EXISTS idx_reading_events_document;
DROP INDEX IF EXISTS idx_reading_events_timestamp;

DROP TABLE IF EXISTS reading_events;

CREATE TABLE reading_events (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('highlight', 'note', 'bookmark')),
    page_number INTEGER NOT NULL,
    position_data TEXT, -- JSON with coordinates/rect data
    content TEXT, -- Highlighted text or bookmark label
    note TEXT, -- User's note/comment
    metadata TEXT, -- JSON with color, timestamps, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create new indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reading_events_document ON reading_events(document_id);
CREATE INDEX IF NOT EXISTS idx_reading_events_page ON reading_events(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_reading_events_type ON reading_events(event_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_reading_events_timestamp
    AFTER UPDATE ON reading_events
BEGIN
    UPDATE reading_events
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
