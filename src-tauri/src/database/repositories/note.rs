use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

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

    pub async fn find_by_id(&self, id: Uuid) -> DbResult<Option<Note>> {
        let id_str = id.to_string();
        let row = sqlx::query_as!(
            NoteRow,
            "SELECT id, session_id, document_id, title, content, note_type, position, tags, created_at, updated_at
             FROM notes WHERE id = ?",
            id_str
        )
        .fetch_optional(&*self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let note_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
            value: "null".to_string(),
        })?;
        let created_at_str = row.created_at.as_ref().ok_or_else(|| DatabaseError::InvalidDateTime {
            value: "null".to_string(),
        })?;
        let updated_at_str = row.updated_at.as_ref().ok_or_else(|| DatabaseError::InvalidDateTime {
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

        Ok(Some(note))
    }

    pub async fn find_all(&self) -> DbResult<Vec<Note>> {
        let rows = sqlx::query_as!(
            NoteRow,
            "SELECT id, session_id, document_id, title, content, note_type, position, tags, created_at, updated_at
             FROM notes ORDER BY updated_at DESC"
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

    pub async fn update(&self, id: Uuid, title: String, content: String) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let id_str = id.to_string();

        let result = sqlx::query!(
            "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
            title,
            content,
            now_str,
            id_str
        )
        .execute(&*self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(DatabaseError::InternalError {
                message: format!("Note not found: {}", id),
            });
        }

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> DbResult<bool> {
        let id_str = id.to_string();
        let result = sqlx::query!("DELETE FROM notes WHERE id = ?", id_str)
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Search notes using Full-Text Search (FTS5)
    /// Query syntax supports: "word", "phrase in quotes", word*, -exclude, column:word
    pub async fn search(&self, query: &str) -> DbResult<Vec<Note>> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let rows = sqlx::query_as!(
            NoteRow,
            r#"
            SELECT n.id, n.session_id, n.document_id, n.title, n.content,
                   n.note_type, n.position, n.tags, n.created_at, n.updated_at
            FROM notes n
            INNER JOIN notes_fts fts ON n.id = fts.id
            WHERE notes_fts MATCH ?
            ORDER BY rank
            "#,
            query
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

// Row structs để SQLx có thể map đúng kiểu - tất cả TEXT fields đều là Option<String>
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
