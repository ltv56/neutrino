export interface LastDocumentInfo {
  document_id: string;
  document_title: string;
  page_number: number;
  scroll_position?: number;
}

export interface LastHighlightInfo {
  id: string;
  content: string;
  page_number: number;
  created_at: string;
}

export interface LastNoteInfo {
  id: string;
  title: string;
  content_preview: string;
  created_at: string;
}

export interface ContextSnapshot {
  timestamp: string;
  active_session_id: string | null;
  last_document?: LastDocumentInfo;
  last_highlight?: LastHighlightInfo;
  last_note?: LastNoteInfo;
  research_questions?: string[];
  open_documents?: string[];
}
