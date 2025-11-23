-- Temporary fix: Disable FTS triggers to prevent corruption
-- TODO: Re-enable after fixing FTS handling

-- Drop FTS triggers for notes
DROP TRIGGER IF EXISTS notes_fts_insert;
DROP TRIGGER IF EXISTS notes_fts_update;
DROP TRIGGER IF EXISTS notes_fts_delete;

-- Drop FTS triggers for documents
DROP TRIGGER IF EXISTS documents_fts_insert;
DROP TRIGGER IF EXISTS documents_fts_update;
DROP TRIGGER IF EXISTS documents_fts_delete;

-- Note: FTS tables are kept but won't auto-sync
-- Search functionality will be temporarily disabled
-- This prevents the "database disk image is malformed" error
