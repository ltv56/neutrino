use crate::database::{Database, models};

#[tauri::command]
pub async fn create_document(
    database: tauri::State<'_, Database>,
    session_id: String,
    title: String,
    file_path: String,
    content_type: String
) -> Result<models::Document, String> {
    let session_uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.documents()
        .create(session_uuid, title, file_path, content_type)
        .await
        .map_err(|e| e.to_string())
}
