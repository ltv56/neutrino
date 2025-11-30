export interface Document {
  id: string;
  title: string;
  file_path: string;
  content_type: string;
  metadata?: Record<string, unknown> | null;
  reading_progress: number;
  created_at: string;
  updated_at: string;
}

export interface SessionDocument {
  session_id: string;
  document_id: string;
  added_at: string;
  notes: string | null;
}
