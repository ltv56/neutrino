-- Note Links table for bidirectional linking
CREATE TABLE IF NOT EXISTS note_links (
    id TEXT PRIMARY KEY,
    source_note_id TEXT NOT NULL,
    target_note_id TEXT,
    target_document_id TEXT,
    source_position TEXT,
    target_position TEXT,
    link_type TEXT NOT NULL DEFAULT 'reference',
    link_text TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT 0,
    context TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CHECK (target_note_id IS NOT NULL OR target_document_id IS NOT NULL OR resolved = 0)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target_note ON note_links(target_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target_doc ON note_links(target_document_id);
CREATE INDEX IF NOT EXISTS idx_note_links_text ON note_links(link_text);
CREATE INDEX IF NOT EXISTS idx_note_links_resolved ON note_links(resolved);
