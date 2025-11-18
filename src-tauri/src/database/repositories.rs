use super::errors::DatabaseError;
use super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

type DbResult<T> = Result<T, DatabaseError>;

#[derive(Clone)]
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

        let session_id_str = session_id.to_string();

        sqlx::query!(
            r#"
            INSERT INTO research_sessions (id, title, goal, phase, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            session_id_str,
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
        let id_str = id.to_string();
        let row = sqlx::query_as!(
            ResearchSessionRow,
            "SELECT id, title, goal, phase, context_state, created_at, updated_at
             FROM research_sessions WHERE id = ?",
            id_str
        )
        .fetch_optional(&*self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        // Extract values trước khi sử dụng để tránh ownership issues
        let id_value = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
            value: "null".to_string(),
        })?;
        let created_at_value =
            row.created_at
                .as_ref()
                .ok_or_else(|| DatabaseError::InvalidDateTime {
                    value: "null".to_string(),
                })?;
        let updated_at_value =
            row.updated_at
                .as_ref()
                .ok_or_else(|| DatabaseError::InvalidDateTime {
                    value: "null".to_string(),
                })?;

        let session = ResearchSession {
            id: self.parse_uuid(id_value)?,
            title: row.title.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing title".to_string(),
            })?,
            goal: row.goal,
            phase: row.phase.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing phase".to_string(),
            })?,
            context_state: row.context_state,
            created_at: self.parse_datetime(created_at_value)?,
            updated_at: self.parse_datetime(updated_at_value)?,
        };

        Ok(Some(session))
    }

    pub async fn find_all(&self) -> DbResult<Vec<ResearchSession>> {
        let rows = sqlx::query_as!(
            ResearchSessionRow,
            "SELECT id, title, goal, phase, context_state, created_at, updated_at
             FROM research_sessions ORDER BY updated_at DESC"
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut sessions = Vec::new();
        for row in rows {
            // Extract values trước khi sử dụng để tránh ownership issues
            let id_value = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let created_at_value =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_value =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let session = ResearchSession {
                id: self.parse_uuid(id_value)?,
                title: row.title.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing title".to_string(),
                })?,
                goal: row.goal,
                phase: row.phase.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing phase".to_string(),
                })?,
                context_state: row.context_state,
                created_at: self.parse_datetime(created_at_value)?,
                updated_at: self.parse_datetime(updated_at_value)?,
            };
            sessions.push(session);
        }

        Ok(sessions)
    }

    pub async fn update(&self, id: Uuid, title: String, goal: Option<String>) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let id_str = id.to_string();

        let result = sqlx::query!(
            "UPDATE research_sessions SET title = ?, goal = ?, updated_at = ? WHERE id = ?",
            title,
            goal,
            now_str,
            id_str
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::SessionNotFound { id: id.to_string() });
        }

        Ok(())
    }

    pub async fn update_phase(&self, id: Uuid, phase: String) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let id_str = id.to_string();

        let result = sqlx::query!(
            "UPDATE research_sessions SET phase = ?, updated_at = ? WHERE id = ?",
            phase,
            now_str,
            id_str
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::SessionNotFound { id: id.to_string() });
        }

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> DbResult<bool> {
        let id_str = id.to_string();
        let result = sqlx::query!("DELETE FROM research_sessions WHERE id = ?", id_str)
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Helper methods
    fn parse_uuid(&self, uuid_str: &str) -> DbResult<Uuid> {
        Uuid::parse_str(uuid_str).map_err(|_e| DatabaseError::InvalidUuid {
            value: uuid_str.to_string(),
        })
    }

    fn parse_datetime(&self, datetime_str: &str) -> DbResult<DateTime<Utc>> {
        if datetime_str.is_empty() {
            return Ok(Utc::now());
        }
        DateTime::parse_from_rfc3339(datetime_str)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(|_| DatabaseError::InvalidDateTime {
                value: datetime_str.to_string(),
            })
    }
}

#[derive(Clone)]
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
        content_type: String,
    ) -> DbResult<Document> {
        self.create_with_metadata(Some(session_id), title, file_path, content_type, None)
            .await
    }

    pub async fn create_with_metadata(
        &self,
        session_id: Option<Uuid>,
        title: String,
        file_path: String,
        content_type: String,
        metadata: Option<String>,
    ) -> DbResult<Document> {
        let document_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let document_id_str = document_id.to_string();
        let session_id_str = session_id.map(|id| id.to_string());

        sqlx::query!(
            r#"
            INSERT INTO documents (id, session_id, title, file_path, content_type, metadata, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            document_id_str,
            session_id_str,
            title,
            file_path,
            content_type,
            metadata,
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
            metadata,
            reading_progress: 0,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_session(&self, session_id: Uuid) -> DbResult<Vec<Document>> {
        let session_id_str = session_id.to_string();
        let rows = sqlx::query_as!(
            DocumentRow,
            "SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
             FROM documents WHERE session_id = ? ORDER BY created_at DESC",
            session_id_str
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut documents = Vec::new();
        for row in rows {
            let doc_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let created_at_str =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_str =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let doc = Document {
                id: Uuid::parse_str(doc_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: doc_id.clone(),
                })?,
                session_id: row.session_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                title: row.title.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing title".to_string(),
                })?,
                file_path: row.file_path.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing file_path".to_string(),
                })?,
                content_type: row.content_type.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing content_type".to_string(),
                })?,
                metadata: row.metadata,
                reading_progress: row.reading_progress.unwrap_or(0) as i32,
                created_at: DateTime::parse_from_rfc3339(created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: updated_at_str.clone(),
                    })?,
            };
            documents.push(doc);
        }

        Ok(documents)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DbResult<Option<Document>> {
        let id_str = id.to_string();
        let row = sqlx::query_as!(
            DocumentRow,
            "SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
             FROM documents WHERE id = ?",
            id_str
        )
        .fetch_optional(&*self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let doc_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
            value: "null".to_string(),
        })?;
        let created_at_str =
            row.created_at
                .as_ref()
                .ok_or_else(|| DatabaseError::InvalidDateTime {
                    value: "null".to_string(),
                })?;
        let updated_at_str =
            row.updated_at
                .as_ref()
                .ok_or_else(|| DatabaseError::InvalidDateTime {
                    value: "null".to_string(),
                })?;

        let doc = Document {
            id: Uuid::parse_str(doc_id).map_err(|_| DatabaseError::InvalidUuid {
                value: doc_id.clone(),
            })?,
            session_id: row.session_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
            title: row.title.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing title".to_string(),
            })?,
            file_path: row.file_path.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing file_path".to_string(),
            })?,
            content_type: row.content_type.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing content_type".to_string(),
            })?,
            metadata: row.metadata,
            reading_progress: row.reading_progress.unwrap_or(0) as i32,
            created_at: DateTime::parse_from_rfc3339(created_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .map_err(|_| DatabaseError::InvalidDateTime {
                    value: created_at_str.clone(),
                })?,
            updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                .map(|dt| dt.with_timezone(&Utc))
                .map_err(|_| DatabaseError::InvalidDateTime {
                    value: updated_at_str.clone(),
                })?,
        };

        Ok(Some(doc))
    }

    pub async fn update_reading_progress(&self, id: Uuid, progress: i32) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let id_str = id.to_string();

        let progress_i64 = progress as i64;

        let result = sqlx::query!(
            "UPDATE documents SET reading_progress = ?, updated_at = ? WHERE id = ?",
            progress_i64,
            now_str,
            id_str
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::DocumentNotFound { id: id.to_string() });
        }

        Ok(())
    }

    // Get all documents
    pub async fn find_all(&self) -> DbResult<Vec<Document>> {
        let rows = sqlx::query_as!(
            DocumentRow,
            "SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
             FROM documents ORDER BY created_at DESC"
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut documents = Vec::new();
        for row in rows {
            let doc_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let created_at_str =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_str =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let doc = Document {
                id: Uuid::parse_str(doc_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: doc_id.clone(),
                })?,
                session_id: row.session_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                title: row.title.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing title".to_string(),
                })?,
                file_path: row.file_path.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing file_path".to_string(),
                })?,
                content_type: row.content_type.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing content_type".to_string(),
                })?,
                metadata: row.metadata,
                reading_progress: row.reading_progress.unwrap_or(0) as i32,
                created_at: DateTime::parse_from_rfc3339(created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: updated_at_str.clone(),
                    })?,
            };
            documents.push(doc);
        }

        Ok(documents)
    }

    // Check if document with same title exists (simple duplicate detection)
    pub async fn find_by_title(&self, title: &str) -> DbResult<Vec<Document>> {
        let rows = sqlx::query_as!(
            DocumentRow,
            "SELECT id, session_id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
             FROM documents WHERE title = ? ORDER BY created_at DESC",
            title
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut documents = Vec::new();
        for row in rows {
            let doc_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let created_at_str =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_str =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let doc = Document {
                id: Uuid::parse_str(doc_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: doc_id.clone(),
                })?,
                session_id: row.session_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                title: row.title.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing title".to_string(),
                })?,
                file_path: row.file_path.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing file_path".to_string(),
                })?,
                content_type: row.content_type.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing content_type".to_string(),
                })?,
                metadata: row.metadata,
                reading_progress: row.reading_progress.unwrap_or(0) as i32,
                created_at: DateTime::parse_from_rfc3339(created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: updated_at_str.clone(),
                    })?,
            };
            documents.push(doc);
        }

        Ok(documents)
    }

    // Delete all documents (for testing/clearing data)
    pub async fn delete_all(&self) -> DbResult<u64> {
        let result = sqlx::query!("DELETE FROM documents")
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected())
    }

    // Delete specific document by ID
    pub async fn delete(&self, id: Uuid) -> DbResult<bool> {
        let id_str = id.to_string();
        let result = sqlx::query!("DELETE FROM documents WHERE id = ?", id_str)
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct NoteRepository {
    pool: Arc<SqlitePool>,
}

impl NoteRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        session_id: Option<Uuid>,
        document_id: Option<Uuid>,
        title: String,
        content: String,
        note_type: String,
    ) -> DbResult<Note> {
        let note_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let note_id_str = note_id.to_string();
        let session_id_str = session_id.map(|id| id.to_string());
        let document_id_str = document_id.map(|id| id.to_string());

        sqlx::query!(
            r#"
            INSERT INTO notes (id, session_id, document_id, title, content, note_type, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            note_id_str,
            session_id_str,
            document_id_str,
            title,
            content,
            note_type,
            now_str,
            now_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(Note {
            id: note_id,
            session_id,
            document_id,
            title,
            content,
            note_type,
            position: None,
            tags: None,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_session(&self, session_id: Uuid) -> DbResult<Vec<Note>> {
        let session_id_str = session_id.to_string();
        let rows = sqlx::query_as!(
            NoteRow,
            "SELECT id, session_id, document_id, title, content, note_type, position, tags, created_at, updated_at
             FROM notes WHERE session_id = ? ORDER BY created_at DESC",
            session_id_str
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut notes = Vec::new();
        for row in rows {
            let note_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let created_at_str =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_str =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let note = Note {
                id: Uuid::parse_str(note_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: note_id.clone(),
                })?,
                session_id: row
                    .session_id
                    .as_ref()
                    .map(|s| {
                        Uuid::parse_str(s)
                            .map_err(|_| DatabaseError::InvalidUuid { value: s.to_string() })
                    })
                    .transpose()?,
                document_id: row
                    .document_id
                    .as_ref()
                    .map(|s| {
                        Uuid::parse_str(s)
                            .map_err(|_| DatabaseError::InvalidUuid { value: s.to_string() })
                    })
                    .transpose()?,
                title: row.title.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing title".to_string(),
                })?,
                content: row.content.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing content".to_string(),
                })?,
                note_type: row.note_type.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing note_type".to_string(),
                })?,
                position: row.position,
                tags: row.tags,
                created_at: DateTime::parse_from_rfc3339(created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: updated_at_str.clone(),
                    })?,
            };
            notes.push(note);
        }

        Ok(notes)
    }
}

#[derive(Clone)]
pub struct ReadingEventRepository {
    pool: Arc<SqlitePool>,
}

impl ReadingEventRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        document_id: Uuid,
        event_type: String,
        page_number: i32,
        position_data: Option<String>,
        content: Option<String>,
        note: Option<String>,
        metadata: Option<String>,
    ) -> DbResult<ReadingEvent> {
        let event_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let event_id_str = event_id.to_string();
        let document_id_str = document_id.to_string();
        let page_number_i64 = page_number as i64;

        sqlx::query!(
            r#"
            INSERT INTO reading_events (id, document_id, event_type, page_number, position_data, content, note, metadata, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            event_id_str,
            document_id_str,
            event_type,
            page_number_i64,
            position_data,
            content,
            note,
            metadata,
            now_str,
            now_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(ReadingEvent {
            id: event_id,
            document_id,
            event_type,
            page_number,
            position_data,
            content,
            note,
            metadata,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_document_and_page(
        &self,
        document_id: Uuid,
        page_number: i32,
    ) -> DbResult<Vec<ReadingEvent>> {
        let document_id_str = document_id.to_string();
        let page_number_i64 = page_number as i64;

        let rows = sqlx::query_as!(
            ReadingEventRow,
            "SELECT id, document_id, event_type, page_number, position_data, content, note, metadata, created_at, updated_at
             FROM reading_events WHERE document_id = ? AND page_number = ? ORDER BY created_at ASC",
            document_id_str,
            page_number_i64
        )
        .fetch_all(&*self.pool)
        .await?;

        self.parse_reading_event_rows(rows)
    }

    pub async fn find_by_document(&self, document_id: Uuid) -> DbResult<Vec<ReadingEvent>> {
        let document_id_str = document_id.to_string();

        let rows = sqlx::query_as!(
            ReadingEventRow,
            "SELECT id, document_id, event_type, page_number, position_data, content, note, metadata, created_at, updated_at
             FROM reading_events WHERE document_id = ? ORDER BY page_number ASC, created_at ASC",
            document_id_str
        )
        .fetch_all(&*self.pool)
        .await?;

        self.parse_reading_event_rows(rows)
    }

    pub async fn update_note(&self, id: Uuid, note: String) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let id_str = id.to_string();

        let result = sqlx::query!(
            "UPDATE reading_events SET note = ?, updated_at = ? WHERE id = ?",
            note,
            now_str,
            id_str
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::InternalError {
                message: format!("Reading event not found: {}", id),
            });
        }

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> DbResult<bool> {
        let id_str = id.to_string();
        let result = sqlx::query!("DELETE FROM reading_events WHERE id = ?", id_str)
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Helper to parse SQLite datetime format "YYYY-MM-DD HH:MM:SS" to UTC
    fn parse_sqlite_datetime(&self, datetime_str: &str) -> DbResult<DateTime<Utc>> {
        use chrono::NaiveDateTime;

        // Try RFC3339 first (for new records)
        if let Ok(dt) = DateTime::parse_from_rfc3339(datetime_str) {
            return Ok(dt.with_timezone(&Utc));
        }

        // Parse SQLite format "YYYY-MM-DD HH:MM:SS"
        NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%d %H:%M:%S")
            .map(|naive| DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc))
            .map_err(|_| DatabaseError::InvalidDateTime {
                value: datetime_str.to_string(),
            })
    }

    fn parse_reading_event_rows(&self, rows: Vec<ReadingEventRow>) -> DbResult<Vec<ReadingEvent>> {
        let mut events = Vec::new();
        for row in rows {
            let event_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
                value: "null".to_string(),
            })?;
            let document_id = row
                .document_id
                .as_ref()
                .ok_or_else(|| DatabaseError::InvalidUuid {
                    value: "null".to_string(),
                })?;
            let created_at_str =
                row.created_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;
            let updated_at_str =
                row.updated_at
                    .as_ref()
                    .ok_or_else(|| DatabaseError::InvalidDateTime {
                        value: "null".to_string(),
                    })?;

            let event = ReadingEvent {
                id: Uuid::parse_str(event_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: event_id.clone(),
                })?,
                document_id: Uuid::parse_str(document_id).map_err(|_| {
                    DatabaseError::InvalidUuid {
                        value: document_id.clone(),
                    }
                })?,
                event_type: row.event_type.ok_or_else(|| DatabaseError::InternalError {
                    message: "Missing event_type".to_string(),
                })?,
                page_number: row.page_number.unwrap_or(0) as i32,
                position_data: row.position_data,
                content: row.content,
                note: row.note,
                metadata: row.metadata,
                created_at: self.parse_sqlite_datetime(created_at_str)?,
                updated_at: self.parse_sqlite_datetime(updated_at_str)?,
            };
            events.push(event);
        }

        Ok(events)
    }
}

// Row structs để SQLx có thể map đúng kiểu - tất cả TEXT fields đều là Option<String>
#[derive(Debug)]
struct ResearchSessionRow {
    pub id: Option<String>,
    pub title: Option<String>,
    pub goal: Option<String>,
    pub phase: Option<String>,
    pub context_state: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug)]
struct DocumentRow {
    pub id: Option<String>,
    pub session_id: Option<String>,
    pub title: Option<String>,
    pub file_path: Option<String>,
    pub content_type: Option<String>,
    pub metadata: Option<String>,
    pub reading_progress: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug)]
struct NoteRow {
    pub id: Option<String>,
    pub session_id: Option<String>,
    pub document_id: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub note_type: Option<String>,
    pub position: Option<String>,
    pub tags: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug)]
struct ReadingEventRow {
    pub id: Option<String>,
    pub document_id: Option<String>,
    pub event_type: Option<String>,
    pub page_number: Option<i64>,
    pub position_data: Option<String>,
    pub content: Option<String>,
    pub note: Option<String>,
    pub metadata: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}