use crate::database::{Database, models};

#[tauri::command]
pub async fn create_note(
    database: tauri::State<'_, Database>,
    session_id: Option<String>,
    document_id: Option<String>,
    folder_id: Option<String>,
    title: String,
    content: String,
    note_type: String,
) -> Result<models::Note, String> {
    let session_uuid = match session_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    let document_uuid = match document_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    let folder_uuid = match folder_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    database.notes()
        .create(session_uuid, document_uuid, folder_uuid, title, content, note_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_note(
    database: tauri::State<'_, Database>,
    note_id: String,
) -> Result<Option<models::Note>, String> {
    let uuid = uuid::Uuid::parse_str(&note_id).map_err(|e| e.to_string())?;
    database.notes()
        .find_by_id(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_notes(
    database: tauri::State<'_, Database>,
    session_id: Option<String>,
) -> Result<Vec<models::Note>, String> {
    match session_id {
        Some(id) => {
            let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
            database.notes()
                .find_by_session(uuid)
                .await
                .map_err(|e| e.to_string())
        }
        None => {
            database.notes()
                .find_all()
                .await
                .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub async fn update_note(
    database: tauri::State<'_, Database>,
    note_id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&note_id).map_err(|e| e.to_string())?;
    database.notes()
        .update(uuid, title, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(
    database: tauri::State<'_, Database>,
    note_id: String,
) -> Result<bool, String> {
    let uuid = uuid::Uuid::parse_str(&note_id).map_err(|e| e.to_string())?;
    database.notes()
        .delete(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_notes(
    database: tauri::State<'_, Database>,
    query: String,
    type_filter: Option<String>,
    type_negate: Option<bool>,
    in_filter: Option<String>,
    in_negate: Option<bool>,
    current_session_id: Option<String>,
) -> Result<Vec<models::NoteSearchResult>, String> {
    let current_session_uuid = match current_session_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    database.notes()
        .search(
            &query,
            type_filter.as_deref(),
            type_negate.unwrap_or(false),
            in_filter.as_deref(),
            in_negate.unwrap_or(false),
            current_session_uuid,
        )
        .await
        .map_err(|e| e.to_string())
}
