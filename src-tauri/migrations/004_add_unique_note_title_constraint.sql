-- Add unique constraint for note titles
-- Notes within the same session must have unique titles

-- Unique constraint for notes within a session
-- This ensures no duplicate note titles within the same session
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_note_title_per_session
ON notes(session_id, title);
