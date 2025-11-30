use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
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

    pub async fn create(
        &self,
        title: String,
        file_path: String,
        content_type: String,
    ) -> DbResult<Document> {
        self.create_with_metadata(title, file_path, content_type, None)
            .await
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

    /// Search documents using Full-Text Search (FTS5)
    /// Query syntax supports: "word", "phrase in quotes", word*, -exclude, column:word
    pub async fn search(&self, query: &str) -> DbResult<Vec<Document>> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

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
            query
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

// Row structs để SQLx có thể map đúng kiểu - tất cả TEXT fields đều là Option<String>
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
