use crate::database::{Database, models};

#[tauri::command]
pub async fn create_research_session(
    database: tauri::State<'_, Database>,
    title: String,
    goal: Option<String>,
) -> Result<models::ResearchSession, String> {
    database.sessions().create(title, goal).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_research_sessions(
    database: tauri::State<'_, Database>,
) -> Result<Vec<models::ResearchSession>, String> {
    database.sessions().find_all().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_research_session(
    database: tauri::State<'_, Database>,
    session_id: String,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.sessions().delete(uuid).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_research_session(
    database: tauri::State<'_, Database>,
    session_id: String,
    title: String,
    goal: Option<String>,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.sessions()
        .update(uuid, title, goal)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_context_snapshot(
    database: tauri::State<'_, Database>,
    session_id: String,
    snapshot: models::ContextSnapshot,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.sessions()
        .save_context_snapshot(uuid, &snapshot)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_context_snapshot(
    database: tauri::State<'_, Database>,
    session_id: String,
) -> Result<Option<models::ContextSnapshot>, String> {
    let uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.sessions()
        .get_context_snapshot(uuid)
        .await
        .map_err(|e| e.to_string())
}
