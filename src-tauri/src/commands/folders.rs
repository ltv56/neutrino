use crate::database::{Database, models};

#[tauri::command]
pub async fn create_folder(
    database: tauri::State<'_, Database>,
    name: String,
    parent_folder_id: Option<String>,
) -> Result<models::Folder, String> {
    let parent_uuid = match parent_folder_id {
        Some(id) => Some(uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?),
        None => None,
    };

    database.folders()
        .create(name, parent_uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_folders(
    database: tauri::State<'_, Database>,
) -> Result<Vec<models::Folder>, String> {
    database.folders()
        .find_all()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_folder(
    database: tauri::State<'_, Database>,
    folder_id: String,
) -> Result<Option<models::Folder>, String> {
    let uuid = uuid::Uuid::parse_str(&folder_id).map_err(|e| e.to_string())?;
    database.folders()
        .find_by_id(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_folder(
    database: tauri::State<'_, Database>,
    folder_id: String,
    name: String,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&folder_id).map_err(|e| e.to_string())?;
    database.folders()
        .update(uuid, name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_folder(
    database: tauri::State<'_, Database>,
    folder_id: String,
) -> Result<bool, String> {
    let uuid = uuid::Uuid::parse_str(&folder_id).map_err(|e| e.to_string())?;
    database.folders()
        .delete(uuid)
        .await
        .map_err(|e| e.to_string())
}
