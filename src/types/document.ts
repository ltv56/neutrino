export interface Document {
  id: string;
  session_id: string | null; // Optional: document may not belong to a session
  title: string;
  file_path: string;
  content_type: string;
  metadata?: Record<string, unknown> | null;
  reading_progress: number;
  created_at: string;
  updated_at: string;
}
