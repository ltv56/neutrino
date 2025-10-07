use std::sync::Arc;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use anyhow::Result;

pub mod models;
pub mod errors;
pub mod repositories;
pub mod transactions;

use repositories::*;
use transactions::*;

#[derive(Clone)]
pub struct Database {
    pool: Arc<SqlitePool>,
    sessions: SessionRepository,
    documents: DocumentRepository,
    notes: repositories::NoteRepository,
    transactions: TransactionService,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true);
        let pool = SqlitePool::connect_with(options).await?;
        
        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;
        
        let pool = Arc::new(pool);
        
        Ok(Self {
            sessions: SessionRepository::new(pool.clone()),
            documents: DocumentRepository::new(pool.clone()),
            notes: repositories::NoteRepository::new(pool.clone()),
            transactions: TransactionService::new(pool.clone()),
            pool,
        })
    }

    pub fn sessions(&self) -> &SessionRepository {
        &self.sessions
    }

    pub fn documents(&self) -> &DocumentRepository {
        &self.documents
    }

    pub fn notes(&self) -> &repositories::NoteRepository {
        &self.notes
    }

    pub fn transactions(&self) -> &TransactionService {
        &self.transactions
    }

    // Keep for backward compatibility
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

// Updated Tauri commands
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
pub async fn create_document(
    database: tauri::State<'_, Database>,
    session_id: String,
    title: String,
    file_path: String,
    content_type: String,
) -> Result<models::Document, String> {
    let session_uuid = uuid::Uuid::parse_str(&session_id).map_err(|e| e.to_string())?;
    database.documents()
        .create(session_uuid, title, file_path, content_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_session_with_documents(
    database: tauri::State<'_, Database>,
    title: String,
    goal: Option<String>,
    documents: Vec<transactions::CreateDocumentRequest>,
) -> Result<models::ResearchSession, String> {
    database.transactions()
        .create_session_with_documents(title, goal, documents)
        .await
        .map_err(|e| e.to_string())
}