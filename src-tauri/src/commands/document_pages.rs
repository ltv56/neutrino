use crate::database::repositories::{PageHit, PageText};
use crate::database::Database;

#[tauri::command]
pub async fn save_document_pages(
    database: tauri::State<'_, Database>,
    document_id: String,
    pages: Vec<PageText>,
) -> Result<(), String> {
    let id = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;
    database.document_pages()
        .replace_pages(id, pages)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_document_page(
    database: tauri::State<'_, Database>,
    document_id: String,
    page_number: u32,
) -> Result<Option<PageText>, String> {
    let id = uuid::Uuid::parse_str(&document_id).map_err(|e| e.to_string())?;
    database.document_pages()
        .get_page(id, page_number)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_document_pages(
    database: tauri::State<'_, Database>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<PageHit>, String> {
    database.document_pages()
        .search(&query, limit.unwrap_or(20).min(100))
        .await
        .map_err(|e| e.to_string())
}
