use anyhow::Result;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::str::FromStr;
use std::sync::Arc;

pub mod errors;
pub mod models;
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
    reading_events: repositories::ReadingEventRepository,
    transactions: TransactionService,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let options = SqliteConnectOptions::from_str(database_url)?.create_if_missing(true);
        let pool = SqlitePool::connect_with(options).await?;

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        // Log applied migrations for debugging
        let migrations: Vec<String> =
            sqlx::query_scalar("SELECT version FROM _sqlx_migrations ORDER BY version")
                .fetch_all(&pool)
                .await
                .unwrap_or_default();
        if !migrations.is_empty() {
            println!("[Database] Applied migrations: {:?}", migrations);
        }
        let pool = Arc::new(pool);

        Ok(Self {
            sessions: SessionRepository::new(pool.clone()),
            documents: DocumentRepository::new(pool.clone()),
            notes: repositories::NoteRepository::new(pool.clone()),
            reading_events: repositories::ReadingEventRepository::new(pool.clone()),
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

    pub fn reading_events(&self) -> &repositories::ReadingEventRepository {
        &self.reading_events
    }

    pub fn transactions(&self) -> &TransactionService {
        &self.transactions
    }

    // Keep for backward compatibility
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
