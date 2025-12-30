-- Add linked_note_id to reading_events table for bi-directional linking between PDF highlights and notes
ALTER TABLE reading_events ADD COLUMN linked_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL;

-- Create index for efficient lookup of highlights linked to a note
CREATE INDEX idx_reading_events_linked_note ON reading_events(linked_note_id) WHERE linked_note_id IS NOT NULL;
