use crate::database::{Database, models};

#[tauri::command]
pub async fn create_highlight(
    database: tauri::State<'_, Database>,
    document_id: String,
    page_number: i32,
    position_data: String,
    content: Option<String>,
    color: Option<String>,
) -> Result<models::ReadingEvent, String> {
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    // Store color in metadata as JSON
    let metadata = color.map(|c| format!(r#"{{"color":"{}"}}"#, c));

    database.reading_events()
        .create(
            document_uuid,
            "highlight".to_string(),
            page_number,
            Some(position_data),
            content,
            None, // note starts as None
            metadata,
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_highlights_by_page(
    database: tauri::State<'_, Database>,
    document_id: String,
    page_number: i32,
) -> Result<Vec<models::ReadingEvent>, String> {
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .find_by_document_and_page(document_uuid, page_number)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_highlights_by_document(
    database: tauri::State<'_, Database>,
    document_id: String,
) -> Result<Vec<models::ReadingEvent>, String> {
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .find_by_document(document_uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_highlight_note(
    database: tauri::State<'_, Database>,
    id: String,
    note: String,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;

    database.reading_events()
        .update_note(uuid, note)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_highlight(
    database: tauri::State<'_, Database>,
    id: String,
) -> Result<bool, String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;

    database.reading_events()
        .delete(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_highlights_by_session(
    database: tauri::State<'_, Database>,
    session_id: String,
    limit: i64,
) -> Result<Vec<models::ReadingEvent>, String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .get_recent_by_session(uuid, "highlight", limit)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn link_highlight_to_note(
    database: tauri::State<'_, Database>,
    highlight_id: String,
    note_id: String,
) -> Result<(), String> {
    let highlight_uuid = uuid::Uuid::parse_str(&highlight_id).map_err(|e| e.to_string())?;
    let note_uuid = uuid::Uuid::parse_str(&note_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .link_to_note(highlight_uuid, note_uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unlink_highlight_from_note(
    database: tauri::State<'_, Database>,
    highlight_id: String,
) -> Result<(), String> {
    let highlight_uuid = uuid::Uuid::parse_str(&highlight_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .unlink_note(highlight_uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_highlights_by_linked_note(
    database: tauri::State<'_, Database>,
    note_id: String,
) -> Result<Vec<models::ReadingEvent>, String> {
    let note_uuid = uuid::Uuid::parse_str(&note_id).map_err(|e| e.to_string())?;

    database.reading_events()
        .get_by_linked_note(note_uuid)
        .await
        .map_err(|e| e.to_string())
}
