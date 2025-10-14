use crate::database::{Database, models, transactions::CreateDocumentRequest};

#[tauri::command]
pub async fn create_session_with_documents(
    database: tauri::State<'_, Database>,
    title: String,
    goal: Option<String>,
    documents: Vec<CreateDocumentRequest>,
) -> Result<models::ResearchSession, String> {
    database.transactions()
        .create_session_with_documents(title, goal, documents)
        .await
        .map_err(|e| e.to_string())
}
