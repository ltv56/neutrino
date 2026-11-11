use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct DocumentRepository {
    pool: Arc<SqlitePool>,
}

impl DocumentRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn set_doc_hash(&self, id: Uuid, hash: &str) -> DbResult<()> {
        sqlx::query("UPDATE documents SET doc_hash = ? WHERE id = ?")
            .bind(hash)
            .bind(id.to_string())
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_doc_hash(&self, id: Uuid) -> DbResult<Option<String>> {
        let row: Option<(Option<String>,)> = sqlx::query_as("SELECT doc_hash FROM documents WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&*self.pool)
            .await?;
        Ok(row.and_then(|(h,)| h))
    }

    pub async fn create_with_metadata(
        &self,
        title: String,
        file_path: String,
        content_type: String,
        metadata: Option<String>,
    ) -> DbResult<Document> {
        let document_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let document_id_str = document_id.to_string();

        sqlx::query!(
            r#"
            INSERT INTO documents (id, title, file_path, content_type, metadata, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            document_id_str,
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
            title,
            file_path,
            content_type,
            metadata,
            reading_progress: 0,
            created_at: now,
            updated_at: now,
        })
    }

    // Removed: find_by_session - now handled by SessionDocumentRepository

    pub async fn find_by_id(&self, id: Uuid) -> DbResult<Option<Document>> {
        let id_str = id.to_string();
        let row = sqlx::query_as!(
            DocumentRow,
            "SELECT id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
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
            "SELECT id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
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
            "SELECT id, title, file_path, content_type, metadata, reading_progress, created_at, updated_at
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

    /// Search documents with session context for command palette
    /// Returns documents grouped by session association
    /// Supports filtering by: file_filter, path_filter, type_filter, in_filter
    /// Supports negation for all filters via negate flags
    pub async fn search_with_session_context(
        &self,
        query: &str,
        file_filter: Option<&str>,
        file_negate: bool,
        path_filter: Option<&str>,
        path_negate: bool,
        type_filter: Option<&str>,
        type_negate: bool,
        in_filter: Option<&str>,
        in_negate: bool,
        current_session_id: Option<Uuid>,
    ) -> DbResult<Vec<DocumentSearchResult>> {
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
                where_clauses.push("documents_fts MATCH ?".to_string());
                params.push(fts_q.clone());
            }
        }

        // File filter (match title or file_path)
        if let Some(file) = file_filter {
            let pattern = format!("%{}%", file);
            if file_negate {
                where_clauses.push("(d.title NOT LIKE ? AND d.file_path NOT LIKE ?)".to_string());
            } else {
                where_clauses.push("(d.title LIKE ? OR d.file_path LIKE ?)".to_string());
            }
            params.push(pattern.clone());
            params.push(pattern);
        }

        // Path filter (match file_path)
        if let Some(path) = path_filter {
            if path_negate {
                where_clauses.push("d.file_path NOT LIKE ?".to_string());
            } else {
                where_clauses.push("d.file_path LIKE ?".to_string());
            }
            params.push(format!("%{}%", path));
        }

        // Type filter (match content_type)
        if let Some(type_val) = type_filter {
            if type_negate {
                where_clauses.push("d.content_type != ?".to_string());
            } else {
                where_clauses.push("d.content_type = ?".to_string());
            }
            params.push(type_val.to_string());
        }

        // In filter (location filter - replaces session filter)
        if let Some(in_val) = in_filter {
            match in_val {
                "current" => {
                    // Documents in current session
                    if let Some(current_id) = current_session_id {
                        if in_negate {
                            where_clauses.push("(sd.session_id IS NULL OR sd.session_id != ?)".to_string());
                        } else {
                            where_clauses.push("sd.session_id = ?".to_string());
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
                    // Documents in other sessions (not current)
                    if let Some(current_id) = current_session_id {
                        if in_negate {
                            // NOT in other → in current OR in vault
                            where_clauses.push("(sd.session_id IS NULL OR sd.session_id = ?)".to_string());
                            params.push(current_id.to_string());
                        } else {
                            // in other → in a session AND not current
                            where_clauses.push("(sd.session_id IS NOT NULL AND sd.session_id != ?)".to_string());
                            params.push(current_id.to_string());
                        }
                    } else {
                        // No current session → "other" means any session
                        if in_negate {
                            where_clauses.push("sd.session_id IS NULL".to_string());
                        } else {
                            where_clauses.push("sd.session_id IS NOT NULL".to_string());
                        }
                    }
                }
                "vault" => {
                    // Documents NOT in any session
                    if in_negate {
                        where_clauses.push("sd.session_id IS NOT NULL".to_string());
                    } else {
                        where_clauses.push("sd.session_id IS NULL".to_string());
                    }
                }
                "sessions" => {
                    // Documents in any session (≥1)
                    if in_negate {
                        where_clauses.push("sd.session_id IS NULL".to_string());
                    } else {
                        where_clauses.push("sd.session_id IS NOT NULL".to_string());
                    }
                }
                _ => {
                    // Match session by name
                    if in_negate {
                        where_clauses.push("(sd.session_id IS NULL OR s.title NOT LIKE ?)".to_string());
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
            SELECT DISTINCT d.id, d.title, d.content_type,
                   sd.session_id, s.title as session_name,
                   d.created_at
            FROM documents d
            {}
            LEFT JOIN session_documents sd ON d.id = sd.document_id
            LEFT JOIN research_sessions s ON sd.session_id = s.id
            WHERE {}
            ORDER BY d.created_at DESC
            "#,
            if needs_fts_join { "INNER JOIN documents_fts fts ON d.id = fts.id" } else { "" },
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
            let id_str: String = row.try_get("id")?;
            let title: String = row.try_get("title")?;
            let content_type: String = row.try_get("content_type")?;
            let session_id: Option<String> = row.try_get("session_id").ok();
            let session_name: Option<String> = row.try_get("session_name").ok();
            let created_at_str: String = row.try_get("created_at")?;

            results.push(DocumentSearchResult {
                id: Uuid::parse_str(&id_str).map_err(|_| DatabaseError::InvalidUuid {
                    value: id_str.clone(),
                })?,
                title,
                content_type,
                session_id: session_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()),
                session_name,
                created_at: DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|_| DatabaseError::InvalidDateTime {
                        value: created_at_str.clone(),
                    })?,
            });
        }

        Ok(results)
    }

    /// Search documents using Full-Text Search (FTS5)
    /// Query is automatically transformed for prefix matching (e.g., "hello" → "hello*")
    pub async fn search(&self, query: &str) -> DbResult<Vec<Document>> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        // Transform user query to FTS5 prefix search
        let fts_query = crate::core::fts::to_prefix_query(query);

        let rows = sqlx::query_as!(
            DocumentRow,
            r#"
            SELECT d.id, d.title, d.file_path, d.content_type,
                   d.metadata, d.reading_progress, d.created_at, d.updated_at
            FROM documents d
            INNER JOIN documents_fts fts ON d.id = fts.id
            WHERE documents_fts MATCH ?
            ORDER BY rank
            "#,
            fts_query
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
}

// Row structs so SQLx maps types correctly: all TEXT fields are Option<String>
#[derive(Debug)]
struct DocumentRow {
    pub id: Option<String>,
    pub title: Option<String>,
    pub file_path: Option<String>,
    pub content_type: Option<String>,
    pub metadata: Option<String>,
    pub reading_progress: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}


#[cfg(test)]
mod hash_tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn doc_hash_roundtrip() {
        let pool = SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let repo = DocumentRepository::new(Arc::new(pool));

        let doc = repo.create_with_metadata("Paper".into(), "a.pdf".into(), "pdf".into(), None).await.unwrap();
        assert_eq!(repo.get_doc_hash(doc.id).await.unwrap(), None);

        repo.set_doc_hash(doc.id, "abc123").await.unwrap();
        assert_eq!(repo.get_doc_hash(doc.id).await.unwrap().as_deref(), Some("abc123"));
        assert_eq!(repo.get_doc_hash(Uuid::new_v4()).await.unwrap(), None);
    }
}
