use crate::database::Database;
use crate::database::models::{NoteLink, LinkTarget, BacklinksResult};
use uuid::Uuid;

#[tauri::command]
pub async fn create_note_link(
    database: tauri::State<'_, Database>,
    source_note_id: String,
    link_text: String,
    link_type: String,
    source_position: Option<String>,
    context: Option<String>,
) -> Result<NoteLink, String> {
    let source_id = Uuid::parse_str(&source_note_id)
        .map_err(|e| format!("Invalid source_note_id: {}", e))?;

    database
        .note_links()
        .create(source_id, link_text, link_type, source_position, context)
        .await
        .map_err(|e| format!("Failed to create note link: {}", e))
}

#[tauri::command]
pub async fn resolve_note_link(
    database: tauri::State<'_, Database>,
    link_id: String,
    target_note_id: Option<String>,
    target_document_id: Option<String>,
) -> Result<(), String> {
    let link_uuid = Uuid::parse_str(&link_id)
        .map_err(|e| format!("Invalid link_id: {}", e))?;

    let target_note_uuid = target_note_id
        .as_ref()
        .map(|id| Uuid::parse_str(id))
        .transpose()
        .map_err(|e| format!("Invalid target_note_id: {}", e))?;

    let target_doc_uuid = target_document_id
        .as_ref()
        .map(|id| Uuid::parse_str(id))
        .transpose()
        .map_err(|e| format!("Invalid target_document_id: {}", e))?;

    database
        .note_links()
        .resolve_link(link_uuid, target_note_uuid, target_doc_uuid)
        .await
        .map_err(|e| format!("Failed to resolve link: {}", e))
}

#[tauri::command]
pub async fn get_backlinks(
    database: tauri::State<'_, Database>,
    note_id: String,
) -> Result<BacklinksResult, String> {
    let note_uuid = Uuid::parse_str(&note_id)
        .map_err(|e| format!("Invalid note_id: {}", e))?;

    database
        .note_links()
        .get_backlinks(note_uuid)
        .await
        .map_err(|e| format!("Failed to get backlinks: {}", e))
}

#[tauri::command]
pub async fn search_link_targets(
    database: tauri::State<'_, Database>,
    query: String,
    session_id: Option<String>,
) -> Result<Vec<LinkTarget>, String> {
    let session_uuid = session_id
        .as_ref()
        .map(|id| Uuid::parse_str(id))
        .transpose()
        .map_err(|e| format!("Invalid session_id: {}", e))?;

    database
        .note_links()
        .search_targets(&query, session_uuid)
        .await
        .map_err(|e| format!("Failed to search link targets: {}", e))
}

#[derive(serde::Deserialize)]
pub struct ParsedLink {
    pub link_text: String,
    pub link_type: String,
    pub context: Option<String>,
}

#[tauri::command]
pub async fn sync_note_links(
    database: tauri::State<'_, Database>,
    note_id: String,
    links: Vec<ParsedLink>,
) -> Result<(), String> {
    let note_uuid = Uuid::parse_str(&note_id)
        .map_err(|e| format!("Invalid note_id: {}", e))?;

    let link_tuples: Vec<(String, String, Option<String>)> = links
        .into_iter()
        .map(|l| (l.link_text, l.link_type, l.context))
        .collect();

    database
        .note_links()
        .sync_links_for_note(note_uuid, link_tuples)
        .await
        .map_err(|e| format!("Failed to sync note links: {}", e))
}

#[tauri::command]
pub async fn delete_note_link(
    database: tauri::State<'_, Database>,
    link_id: String,
) -> Result<bool, String> {
    let link_uuid = Uuid::parse_str(&link_id)
        .map_err(|e| format!("Invalid link_id: {}", e))?;

    database
        .note_links()
        .delete(link_uuid)
        .await
        .map_err(|e| format!("Failed to delete note link: {}", e))
}
