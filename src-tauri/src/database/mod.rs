use anyhow::Result;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::str::FromStr;
use std::sync::Arc;

pub mod errors;
pub mod models;
pub mod repositories;
pub mod transactions;

use repositories::{SessionRepository, DocumentRepository, NoteRepository, ReadingEventRepository, SessionDocumentRepository, NoteLinkRepository, FolderRepository};
use transactions::*;

#[derive(Clone)]
pub struct Database {
    pool: Arc<SqlitePool>,
    sessions: SessionRepository,
    documents: DocumentRepository,
    notes: NoteRepository,
    reading_events: ReadingEventRepository,
    session_documents: SessionDocumentRepository,
    note_links: NoteLinkRepository,
    folders: FolderRepository,
    transactions: TransactionService,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        use sqlx::sqlite::{SqliteJournalMode, SqliteSynchronous};
        use std::time::Duration;

        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            // Enable WAL mode for better concurrency
            .journal_mode(SqliteJournalMode::Wal)
            // Set busy timeout to 30 seconds (prevent "database is locked" errors)
            .busy_timeout(Duration::from_secs(30))
            // Use NORMAL synchronous mode (balance between safety and performance)
            .synchronous(SqliteSynchronous::Normal)
            // Optimize for better performance
            .pragma("cache_size", "-64000") // 64MB cache
            .pragma("temp_store", "memory");

        let pool = SqlitePool::connect_with(options).await?;

        log::info!("[Database] SQLite configured:");
        log::info!("  - Journal mode: WAL");
        log::info!("  - Busy timeout: 30s");
        log::info!("  - Synchronous: NORMAL");
        log::info!("  - Cache size: 64MB");

        // Get migrations before running
        let migrations_before: Vec<i64> =
            sqlx::query_scalar("SELECT version FROM _sqlx_migrations ORDER BY version")
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        // Get migrations after running
        let migrations_after: Vec<i64> =
            sqlx::query_scalar("SELECT version FROM _sqlx_migrations ORDER BY version")
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

        // Log only NEW migrations
        let new_migrations: Vec<i64> = migrations_after
            .iter()
            .filter(|v| !migrations_before.contains(v))
            .copied()
            .collect();

        if !new_migrations.is_empty() {
            log::info!("[Migrations] ✨ Applied new migrations: {:?}", new_migrations);
        } else {
            log::info!("[Migrations] ✓ All migrations up to date");
        }

        let pool = Arc::new(pool);

        Ok(Self {
            sessions: SessionRepository::new(pool.clone()),
            documents: DocumentRepository::new(pool.clone()),
            notes: NoteRepository::new(pool.clone()),
            reading_events: ReadingEventRepository::new(pool.clone()),
            session_documents: SessionDocumentRepository::new(pool.clone()),
            note_links: NoteLinkRepository::new(pool.clone()),
            folders: FolderRepository::new(pool.clone()),
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

    pub fn notes(&self) -> &NoteRepository {
        &self.notes
    }

    pub fn reading_events(&self) -> &ReadingEventRepository {
        &self.reading_events
    }

    pub fn session_documents(&self) -> &SessionDocumentRepository {
        &self.session_documents
    }

    pub fn note_links(&self) -> &NoteLinkRepository {
        &self.note_links
    }

    pub fn folders(&self) -> &FolderRepository {
        &self.folders
    }

    pub fn transactions(&self) -> &TransactionService {
        &self.transactions
    }

    // Keep for backward compatibility
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
