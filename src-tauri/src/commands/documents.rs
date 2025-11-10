use crate::database::{Database, models};

#[tauri::command]
pub async fn create_document(
    database: tauri::State<'_, Database>,
    session_id: Option<String>,
    title: String,
    file_path: String,
    content_type: String,
    metadata: Option<String>,
) -> Result<models::Document, String> {
    let session_uuid = match session_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    database.documents()
        .create_with_metadata(session_uuid, title, file_path, content_type, metadata)
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
    database.documents()
        .find_by_session(uuid)
        .await
        .map_err(|e| e.to_string())
}
