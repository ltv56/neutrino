use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::{SqlitePool, Row};
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
        folder_id: Option<Uuid>,
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
        let folder_id_str = folder_id.map(|id| id.to_string());

        sqlx::query!(
            r#"
            INSERT INTO notes (id, session_id, document_id, folder_id, title, content, note_type, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            note_id_str,
            session_id_str,
            document_id_str,
            folder_id_str,
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
            folder_id,
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
            "SELECT id, session_id, document_id, folder_id, title, content, note_type, position, tags, created_at, updated_at
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
                folder_id: row
                    .folder_id
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
            "SELECT id, session_id, document_id, folder_id, title, content, note_type, position, tags, created_at, updated_at
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
            folder_id: row
                .folder_id
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
            "SELECT id, session_id, document_id, folder_id, title, content, note_type, position, tags, created_at, updated_at
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
                folder_id: row
                    .folder_id
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

    /// Search notes using Full-Text Search (FTS5) with session context and filters
    /// Query is automatically transformed for prefix matching (e.g., "hello" → "hello*")
    /// Returns NoteSearchResult with content_preview and session_name for UI rendering
    /// Supports filtering by: type_filter (note_type), in_filter (location filter)
    /// Supports negation for all filters via negate flags
    pub async fn search(
        &self,
        query: &str,
        type_filter: Option<&str>,
        type_negate: bool,
        in_filter: Option<&str>,
        in_negate: bool,
        current_session_id: Option<Uuid>,
    ) -> DbResult<Vec<NoteSearchResult>> {
        // Build WHERE clauses dynamically
        let mut where_clauses = Vec::new();
        let mut params: Vec<String> = Vec::new();

        // FTS query (if not empty after sanitization)
        let fts_query = if !query.trim().is_empty() {
            Some(crate::core::fts::to_prefix_query(query))
        } else {
            None
        };

        if let Some(ref fts_q) = fts_query {
            if !fts_q.is_empty() {
                where_clauses.push("notes_fts MATCH ?".to_string());
                params.push(fts_q.clone());
            }
        }

        // Type filter (match note_type)
        if let Some(type_val) = type_filter {
            if type_negate {
                where_clauses.push("n.note_type != ?".to_string());
            } else {
                where_clauses.push("n.note_type = ?".to_string());
            }
            params.push(type_val.to_string());
        }

        // In filter (location filter - replaces session filter)
        if let Some(in_val) = in_filter {
            match in_val {
                "current" => {
                    // Notes in current session
                    if let Some(current_id) = current_session_id {
                        if in_negate {
                            where_clauses.push("(n.session_id IS NULL OR n.session_id != ?)".to_string());
                        } else {
                            where_clauses.push("n.session_id = ?".to_string());
                        }
                        params.push(current_id.to_string());
                    } else {
                        // No current session
                        if in_negate {
                            // -in:current with no session → show all (no filter)
                        } else {
                            // in:current with no session → return empty
                            return Ok(Vec::new());
                        }
                    }
                }
                "other" => {
                    // Notes in other sessions (not current)
                    if let Some(current_id) = current_session_id {
                        if in_negate {
                            // NOT in other → in current OR orphan
                            where_clauses.push("(n.session_id IS NULL OR n.session_id = ?)".to_string());
                            params.push(current_id.to_string());
                        } else {
                            // in other → in a session AND not current
                            where_clauses.push("(n.session_id IS NOT NULL AND n.session_id != ?)".to_string());
                            params.push(current_id.to_string());
                        }
                    } else {
                        // No current session → "other" means any session
                        if in_negate {
                            where_clauses.push("n.session_id IS NULL".to_string());
                        } else {
                            where_clauses.push("n.session_id IS NOT NULL".to_string());
                        }
                    }
                }
                "vault" => {
                    // Notes NOT in any session (orphaned notes)
                    if in_negate {
                        where_clauses.push("n.session_id IS NOT NULL".to_string());
                    } else {
                        where_clauses.push("n.session_id IS NULL".to_string());
                    }
                }
                "sessions" => {
                    // Notes in any session (≥1)
                    if in_negate {
                        where_clauses.push("n.session_id IS NULL".to_string());
                    } else {
                        where_clauses.push("n.session_id IS NOT NULL".to_string());
                    }
                }
                _ => {
                    // Match session by name
                    if in_negate {
                        where_clauses.push("(n.session_id IS NULL OR s.title NOT LIKE ?)".to_string());
                    } else {
                        where_clauses.push("s.title LIKE ?".to_string());
                    }
                    params.push(format!("%{}%", in_val));
                }
            }
        }

        let where_sql = if where_clauses.is_empty() {
            "1=1".to_string()
        } else {
            where_clauses.join(" AND ")
        };

        // Build query dynamically
        let needs_fts_join = fts_query.as_ref().map(|q| !q.is_empty()).unwrap_or(false);
        let sql = format!(
            r#"
            SELECT n.id, n.session_id, n.document_id, n.title, n.content,
                   n.note_type, n.created_at, n.updated_at,
                   s.title as session_name
            FROM notes n
            {}
            LEFT JOIN research_sessions s ON n.session_id = s.id
            WHERE {}
            ORDER BY n.updated_at DESC
            "#,
            if needs_fts_join { "INNER JOIN notes_fts fts ON n.id = fts.id" } else { "" },
            where_sql
        );

        // Execute query with dynamic parameters
        // sql is built from fixed fragments only; user input goes through bind
        let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql));
        for param in params {
            query_builder = query_builder.bind(param);
        }

        let rows = query_builder
            .fetch_all(&*self.pool)
            .await?;

        let mut results = Vec::new();
        for row in rows {
            let note_id: String = row.try_get("id")?;
            let session_id: Option<String> = row.try_get("session_id").ok();
            let session_name: Option<String> = row.try_get("session_name").ok();
            let document_id: Option<String> = row.try_get("document_id").ok();
            let title: String = row.try_get("title")?;
            let content: String = row.try_get("content")?;
            let note_type: String = row.try_get("note_type")?;
            let created_at_str: String = row.try_get("created_at")?;
            let updated_at_str: String = row.try_get("updated_at")?;

            // Create content preview
            let preview: String = content
                .trim()
                .replace("\n", " ")
                .chars()
                .take(60)
                .collect();

            let content_preview = if content.len() > 60 {
                format!("{}...", preview)
            } else {
                preview
            };

            results.push(NoteSearchResult {
                id: Uuid::parse_str(&note_id).map_err(|_| DatabaseError::InvalidUuid {
                    value: note_id.clone(),
                })?,
                session_id: session_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()),
                session_name,
                document_id: document_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()),
                title,
                content_preview,
                note_type,
                created_at: DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
                updated_at: DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: updated_at_str.clone(),
                    })?,
            });
        }

        Ok(results)
    }
}

// Row structs so SQLx maps types correctly: all TEXT fields are Option<String>
#[derive(Debug)]
struct NoteRow {
    pub id: Option<String>,
    pub session_id: Option<String>,
    pub document_id: Option<String>,
    pub folder_id: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub note_type: Option<String>,
    pub position: Option<String>,
    pub tags: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
