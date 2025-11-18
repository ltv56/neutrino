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
    pub session_id: Option<Uuid>, // Optional: document may not belong to a session (vault-first)
    pub title: String,
    pub file_path: String,
    pub content_type: String, // pdf, md, txt, etc.
    pub metadata: Option<String>, // JSON metadata (citation info, etc.)
    pub reading_progress: i32, // percentage or page number
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
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