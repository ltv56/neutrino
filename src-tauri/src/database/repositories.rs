use std::sync::Arc;
use sqlx::{SqlitePool, Transaction, Sqlite};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use super::models::*;
use super::errors::DatabaseError;

type DbResult<T> = Result<T, DatabaseError>;

pub struct SessionRepository {
    pool: Arc<SqlitePool>,
}

impl SessionRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create(&self, title: String, goal: Option<String>) -> DbResult<ResearchSession> {
        let session_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO research_sessions (id, title, goal, phase, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            session_id.to_string(),
            title,
            goal,
            "exploration",
            now_str,
            now_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(ResearchSession {
            id: session_id,
            title,
            goal,
            phase: "exploration".to_string(),
            context_state: None,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_id(&self, id: Uuid) -> DbResult<Option<ResearchSession>> {
        let row = sqlx::query!(
            "SELECT id, title, goal, phase, context_state, created_at, updated_at 
             FROM research_sessions WHERE id = ?",
            id.to_string()
        )
        .fetch_optional(&*self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let session = ResearchSession {
            id: self.parse_uuid(&row.id.unwrap_or_default())?,
            title: row.title,
            goal: row.goal,
            phase: row.phase,
            context_state: row.context_state,
            created_at: self.parse_datetime(&row.created_at.unwrap_or_default())?,
            updated_at: self.parse_datetime(&row.updated_at.unwrap_or_default())?,
        };

        Ok(Some(session))
    }

    pub async fn find_all(&self) -> DbResult<Vec<ResearchSession>> {
        let rows = sqlx::query!(
            "SELECT id, title, goal, phase, context_state, created_at, updated_at 
             FROM research_sessions ORDER BY updated_at DESC"
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut sessions = Vec::new();
        for row in rows {
            let session = ResearchSession {
                id: self.parse_uuid(&row.id.unwrap_or_default())?,
                title: row.title,
                goal: row.goal,
                phase: row.phase,
                context_state: row.context_state,
                created_at: self.parse_datetime(&row.created_at.unwrap_or_default())?,
                updated_at: self.parse_datetime(&row.updated_at.unwrap_or_default())?,
            };
            sessions.push(session);
        }

        Ok(sessions)
    }

    pub async fn update_phase(&self, id: Uuid, phase: String) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        
        let result = sqlx::query!(
            "UPDATE research_sessions SET phase = ?, updated_at = ? WHERE id = ?",
            phase,
            now_str,
            id.to_string()
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::SessionNotFound { id });
        }

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> DbResult<bool> {
        let result = sqlx::query!(
            "DELETE FROM research_sessions WHERE id = ?",
            id.to_string()
        )
        .execute(&*self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // Helper methods
    fn parse_uuid(&self, uuid_str: &str) -> DbResult<Uuid> {
        Uuid::parse_str(uuid_str).map_err(|e| DatabaseError::InvalidUuid {
            value: uuid_str.to_string(),
            source: e,
        })
    }

    fn parse_datetime(&self, datetime_str: &str) -> DbResult<DateTime<Utc>> {
        DateTime::parse_from_rfc3339(datetime_str)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(|_| DatabaseError::InvalidDateTime {
                value: datetime_str.to_string(),
            })
    }
}

pub struct DocumentRepository {
    pool: Arc<SqlitePool>,
}

impl DocumentRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self, 
        session_id: Uuid, 
        title: String, 
        file_path: String, 
        content_type: String
    ) -> DbResult<Document> {
        let document_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        sqlx::query!(
            r#"
            INSERT INTO documents (id, session_id, title, file_path, content_type, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            document_id.to_string(),
            session_id.to_string(),
            title,
            file_path,
            content_type,
            now_str,
            now_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(Document {
            id: document_id,
            session_id,
            title,
            file_path,
            content_type,
            metadata: None,
            reading_progress: 0,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_session(&self, session_id: Uuid) -> DbResult<Vec<Document>> {
        let rows = sqlx::query!(
            "SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at 
             FROM documents WHERE session_id = ? ORDER BY created_at DESC",
            session_id.to_string()
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut documents = Vec::new();
        for row in rows {
            let doc = Document {
                id: Uuid::parse_str(&row.id.unwrap_or_default()).map_err(|e| DatabaseError::InvalidUuid {
                    value: row.id.unwrap_or_default(),
                    source: e,
                })?,
                session_id: Uuid::parse_str(&row.session_id.unwrap_or_default()).map_err(|e| DatabaseError::InvalidUuid {
                    value: row.session_id.unwrap_or_default(),
                    source: e,
                })?,
                title: row.title,
                file_path: row.file_path,
                content_type: row.content_type,
                metadata: row.metadata,
                reading_progress: row.reading_progress.unwrap_or(0),
                created_at: DateTime::parse_from_rfc3339(&row.created_at.unwrap_or_default())
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: row.created_at.unwrap_or_default(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(&row.updated_at.unwrap_or_default())
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: row.updated_at.unwrap_or_default(),
                    })?,
            };
            documents.push(doc);
        }

        Ok(documents)
    }

    pub async fn update_reading_progress(&self, id: Uuid, progress: i32) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        
        let result = sqlx::query!(
            "UPDATE documents SET reading_progress = ?, updated_at = ? WHERE id = ?",
            progress,
            now_str,
            id.to_string()
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::DocumentNotFound { id });
        }

        Ok(())
    }
}