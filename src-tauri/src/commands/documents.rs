use crate::database::{Database, models};

#[tauri::command]
pub async fn create_document(
    database: tauri::State<'_, Database>,
    title: String,
    file_path: String,
    content_type: String,
    metadata: Option<String>,
) -> Result<models::Document, String> {
    database.documents()
        .create_with_metadata(title, file_path, content_type, metadata)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_duplicate_document(
    database: tauri::State<'_, Database>,
    title: String,
) -> Result<Vec<models::Document>, String> {
    database.documents()
        .find_by_title(&title)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_all_documents(
    database: tauri::State<'_, Database>,
) -> Result<u64, String> {
    database.documents()
        .delete_all()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_document(
    database: tauri::State<'_, Database>,
    id: String,
) -> Result<bool, String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    database.documents()
        .delete(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_documents(
    database: tauri::State<'_, Database>,
) -> Result<Vec<models::Document>, String> {
    database.documents()
        .find_all()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_document_by_id(
    database: tauri::State<'_, Database>,
    id: String,
) -> Result<Option<models::Document>, String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    database.documents()
        .find_by_id(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_documents_by_session(
    database: tauri::State<'_, Database>,
    session_id: String,
) -> Result<Vec<models::Document>, String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.session_documents()
        .find_documents_by_session(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_document_reading_progress(
    database: tauri::State<'_, Database>,
    id: String,
    progress: i32,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    database.documents()
        .update_reading_progress(uuid, progress)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_documents(
    database: tauri::State<'_, Database>,
    query: String,
) -> Result<Vec<models::Document>, String> {
    database.documents()
        .search(&query)
        .await
        .map_err(|e| e.to_string())
}

// Session-Document relationship commands
#[tauri::command]
pub async fn add_document_to_session(
    database: tauri::State<'_, Database>,
    session_id: String,
    document_id: String,
    notes: Option<String>,
) -> Result<models::SessionDocument, String> {
    let session_uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    database.session_documents()
        .add_to_session(session_uuid, document_uuid, notes)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_document_from_session(
    database: tauri::State<'_, Database>,
    session_id: String,
    document_id: String,
) -> Result<bool, String> {
    let session_uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    database.session_documents()
        .remove_from_session(session_uuid, document_uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_session_document_notes(
    database: tauri::State<'_, Database>,
    session_id: String,
    document_id: String,
    notes: Option<String>,
) -> Result<bool, String> {
    let session_uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    let document_uuid = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;

    database.session_documents()
        .update_notes(session_uuid, document_uuid, notes)
        .await
        .map_err(|e| e.to_string())
}
