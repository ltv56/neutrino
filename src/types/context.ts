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

export interface ReadingBehavior {
  total_reading_time_ms: number; // Total time in current session
  current_document_time_ms?: number; // Time spent on current document
  current_page_time_ms?: number; // Time on current page (struggle indicator)
  page_changes_count: number; // Total page navigations
  avg_time_per_page_ms?: number; // Average time per page
}

export interface StruggleSignals {
  highlights_without_notes: number; // Confusion indicator
  slow_progress: boolean; // Spending >5min on single page
  rapid_highlighting: boolean; // 3+ highlights in <2min (info overload)
  re_reading_detected: boolean; // Returning to same page/section
}

export interface SessionStatistics {
  documents_opened_count: number;
  highlights_created_count: number;
  notes_created_count: number;
  highlight_note_ratio?: number; // highlights with notes / total highlights
}

export interface AIInsights {
  generated_at: string;
  summary?: string; // AI-generated session summary
  struggle_areas?: string[]; // Detected struggle points
  suggestions?: string[]; // Personalized next steps
  learning_pattern?: string; // Detected learning style
}

export type ResearchPhase = 'exploration' | 'deep-dive' | 'synthesis' | 'validation';

export interface PhaseDetectionResult {
  phase: ResearchPhase;
  confidence: number; // 0-1
  reasoning: string; // Brief explanation of why this phase was detected
  detected_at: string; // ISO timestamp
}

export interface ContextSnapshot {
  timestamp: string;
  active_session_id: string | null;
  session_goal?: string;
  last_document?: LastDocumentInfo;
  last_highlight?: LastHighlightInfo;
  last_note?: LastNoteInfo;
  last_activity_type?: 'document' | 'highlight' | 'note';
  research_questions?: string[];
  open_documents?: string[];
  open_notes?: Array<{ id: string; title: string }>;
  open_tabs?: OpenTabInfo[];

  // Enhanced context-aware fields
  reading_behavior?: ReadingBehavior;
  struggle_signals?: StruggleSignals;
  session_statistics?: SessionStatistics;
  ai_insights?: AIInsights;
  research_phase?: PhaseDetectionResult;
}
