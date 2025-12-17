use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResearchSession {
    pub id: Uuid,
    pub title: String,
    pub goal: Option<String>,
    pub phase: String, // exploration, deep_dive, synthesis, validation, documentation
    pub context_state: Option<String>, // JSON string for context preservation
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: Uuid,
    pub title: String,
    pub file_path: String,
    pub content_type: String, // pdf, md, txt, etc.
    pub metadata: Option<String>, // JSON metadata (citation info, etc.)
    pub reading_progress: i32, // percentage or page number
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionDocument {
    pub session_id: Uuid,
    pub document_id: Uuid,
    pub added_at: DateTime<Utc>,
    pub notes: Option<String>,
}

/// Document search result with session context
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentSearchResult {
    pub id: Uuid,
    pub title: String,
    pub content_type: String,
    pub session_id: Option<Uuid>,      
    pub session_name: Option<String>, 
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentLink {
    pub id: Uuid,
    pub source_doc_id: Uuid,
    pub target_doc_id: Uuid,
    pub source_position: Option<String>, // JSON: page, section, paragraph
    pub target_position: Option<String>,
    pub link_type: String, // reference, quote, concept, contradicts, supports
    pub context: Option<String>, // user description of the link
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: Uuid,
    pub session_id: Option<Uuid>,
    pub document_id: Option<Uuid>,
    pub title: String,
    pub content: String,
    pub note_type: String, // concept, insight, question, quote
    pub position: Option<String>, // JSON: document position if linked
    pub tags: Option<String>, // JSON array of tags
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Note search result with content preview and session context
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NoteSearchResult {
    pub id: Uuid,
    pub session_id: Option<Uuid>,
    pub session_name: Option<String>,
    pub document_id: Option<Uuid>,
    pub title: String,
    pub content_preview: String,
    pub note_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Note {
    pub fn to_search_result(&self) -> NoteSearchResult {
        let preview: String = self.content
            .trim()
            .replace("\n", " ")
            .chars()
            .take(60)
            .collect();

        let content_preview = if self.content.len() > 60 {
            format!("{}...", preview)
        } else {
            preview
        };

        NoteSearchResult {
            id: self.id,
            session_id: self.session_id,
            session_name: None, // Set by search query when joining with sessions
            document_id: self.document_id,
            title: self.title.clone(),
            content_preview,
            note_type: self.note_type.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingEvent {
    pub id: Uuid,
    pub document_id: Uuid,
    pub event_type: String, // highlight, note, bookmark
    pub page_number: i32,
    pub position_data: Option<String>, // JSON: coordinates, rect data
    pub content: Option<String>, // Highlighted text or bookmark label
    pub note: Option<String>, // User's note/comment
    pub metadata: Option<String>, // JSON: color, etc.
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Concept {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub domain: Option<String>, // ML, NLP, etc.
    pub evolution_data: Option<String>, // JSON: how understanding evolved
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConceptLink {
    pub id: Uuid,
    pub concept_id: Uuid,
    pub document_id: Option<Uuid>,
    pub note_id: Option<Uuid>,
    pub position: Option<String>,
    pub relationship: String, // defines, uses, extends, contradicts
    pub confidence: f32, // AI confidence score
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LastDocumentInfo {
    pub document_id: String,
    pub document_title: String,
    pub page_number: i32,
    pub scroll_position: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LastHighlightInfo {
    pub id: String,
    pub content: String,
    pub note: Option<String>,
    pub page_number: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LastNoteInfo {
    pub id: String,
    pub title: String,
    pub content_preview: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenNoteInfo {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReadingBehavior {
    pub total_reading_time_ms: i64,
    pub current_document_time_ms: Option<i64>,
    pub current_page_time_ms: Option<i64>,
    pub page_changes_count: i32,
    pub avg_time_per_page_ms: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StruggleSignals {
    pub highlights_without_notes: i32,
    pub slow_progress: bool,
    pub rapid_highlighting: bool,
    pub re_reading_detected: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionStatistics {
    pub documents_opened_count: i32,
    pub highlights_created_count: i32,
    pub notes_created_count: i32,
    pub highlight_note_ratio: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIInsights {
    pub generated_at: String,
    pub summary: Option<String>,
    pub struggle_areas: Option<Vec<String>>,
    pub suggestions: Option<Vec<String>>,
    pub learning_pattern: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenTabInfo {
    #[serde(rename = "type")]
    pub tab_type: String, // "document" | "note"
    pub id: String,
    pub title: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhaseDetectionResult {
    pub phase: String, // "exploration" | "deep-dive" | "synthesis" | "validation"
    pub confidence: f32, // 0-1
    pub reasoning: String,
    pub detected_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextSnapshot {
    pub timestamp: DateTime<Utc>,
    pub active_session_id: Option<String>,
    pub session_goal: Option<String>,
    pub last_document: Option<LastDocumentInfo>,
    pub last_highlight: Option<LastHighlightInfo>,
    pub last_note: Option<LastNoteInfo>,
    pub last_activity_type: Option<String>, // "document" | "highlight" | "note"
    pub research_questions: Option<Vec<String>>,
    pub open_documents: Option<Vec<String>>,
    pub open_notes: Option<Vec<OpenNoteInfo>>,
    pub open_tabs: Option<Vec<OpenTabInfo>>,
    pub reading_behavior: Option<ReadingBehavior>,
    pub struggle_signals: Option<StruggleSignals>,
    pub session_statistics: Option<SessionStatistics>,
    pub ai_insights: Option<AIInsights>,
    pub research_phase: Option<PhaseDetectionResult>,
    // Session activity history (last 5 of each type)
    pub recent_highlights: Option<Vec<LastHighlightInfo>>,
    pub recent_notes: Option<Vec<LastNoteInfo>>,
}