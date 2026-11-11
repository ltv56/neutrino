-- SHA-256 of the file bytes; anchors use it to tell whether a document changed.
ALTER TABLE documents ADD COLUMN doc_hash TEXT;
