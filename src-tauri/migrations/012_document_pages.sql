-- Per-page text for library search and passage anchors.
-- FTS is maintained by the repository (no triggers): replace_pages rewrites both tables.
CREATE TABLE document_pages (
    document_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    items_json TEXT,
    PRIMARY KEY (document_id, page_number),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE document_pages_fts USING fts5(
    document_id UNINDEXED,
    page_number UNINDEXED,
    text,
    tokenize = 'porter unicode61'
);
