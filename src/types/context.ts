export interface LastDocumentInfo {
  document_id: string;
  document_title: string;
  page_number: number;
  scroll_position?: number;
}

export interface LastHighlightInfo {
  id: string;
  content: string;
  note?: string;
  page_number: number;
  created_at: string;
}

export interface LastNoteInfo {
  id: string;
  title: string;
  content_preview: string;
  created_at: string;
}

export interface OpenTabInfo {
  type: 'document' | 'note';
  id: string;
  title: string;
}

export interface ContextSnapshot {
  timestamp: string;
  active_session_id: string | null;
  session_goal?: string;
  last_document?: LastDocumentInfo;
  last_highlight?: LastHighlightInfo;
  last_note?: LastNoteInfo;
  last_activity_type?: 'document' | 'highlight' | 'note'; // Track most recent activity for banner display
  research_questions?: string[];
  open_documents?: string[];
  open_notes?: Array<{ id: string; title: string }>;
  open_tabs?: OpenTabInfo[]; // New: preserves exact tab order
}
