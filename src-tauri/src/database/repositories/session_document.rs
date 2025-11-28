use anyhow::Result;
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::database::models::{SessionDocument, Document};

#[derive(Clone)]
pub struct SessionDocumentRepository {
    pool: Arc<SqlitePool>,
}

impl SessionDocumentRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    /// Add a document to a session
    pub async fn add_to_session(
        &self,
        session_id: Uuid,
        document_id: Uuid,
        notes: Option<String>,
    ) -> Result<SessionDocument> {
        let added_at = Utc::now();

        sqlx::query(
            "INSERT INTO session_documents (session_id, document_id, added_at, notes)
             VALUES (?, ?, ?, ?)"
        )
        .bind(session_id.to_string())
        .bind(document_id.to_string())
        .bind(added_at.to_rfc3339())
        .bind(&notes)
        .execute(&*self.pool)
        .await?;

        Ok(SessionDocument {
            session_id,
            document_id,
            added_at,
            notes,
        })
    }

    /// Remove a document from a session
    pub async fn remove_from_session(
        &self,
        session_id: Uuid,
        document_id: Uuid,
    ) -> Result<bool> {
        let result = sqlx::query(
            "DELETE FROM session_documents
             WHERE session_id = ? AND document_id = ?"
        )
        .bind(session_id.to_string())
        .bind(document_id.to_string())
        .execute(&*self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get all documents in a session
    pub async fn find_documents_by_session(&self, session_id: Uuid) -> Result<Vec<Document>> {
        let session_id_str = session_id.to_string();
        let rows = sqlx::query_as!(
            DocumentRow,
            "SELECT d.id, d.title, d.file_path, d.content_type, d.metadata,
                    d.reading_progress, d.created_at, d.updated_at
             FROM documents d
             INNER JOIN session_documents sd ON d.id = sd.document_id
             WHERE sd.session_id = ?
             ORDER BY sd.added_at DESC",
            session_id_str
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut documents = Vec::new();
        for row in rows {
            let doc_id = row.id.as_ref().ok_or_else(|| anyhow::anyhow!("Missing id"))?;
            let created_at_str = row.created_at.as_ref().ok_or_else(|| anyhow::anyhow!("Missing created_at"))?;
            let updated_at_str = row.updated_at.as_ref().ok_or_else(|| anyhow::anyhow!("Missing updated_at"))?;

            let doc = Document {
                id: Uuid::parse_str(doc_id)?,
                title: row.title.ok_or_else(|| anyhow::anyhow!("Missing title"))?,
                file_path: row.file_path.ok_or_else(|| anyhow::anyhow!("Missing file_path"))?,
                content_type: row.content_type.ok_or_else(|| anyhow::anyhow!("Missing content_type"))?,
                metadata: row.metadata,
                reading_progress: row.reading_progress.unwrap_or(0) as i32,
                created_at: DateTime::parse_from_rfc3339(created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))?,
                updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))?,
            };
            documents.push(doc);
        }

        Ok(documents)
    }

    /// Get all sessions that contain a specific document
    pub async fn find_sessions_by_document(&self, document_id: Uuid) -> Result<Vec<Uuid>> {
        let rows = sqlx::query(
            "SELECT session_id
             FROM session_documents
             WHERE document_id = ?"
        )
        .bind(document_id.to_string())
        .fetch_all(&*self.pool)
        .await?;

        let session_ids = rows
            .iter()
            .map(|row| {
                Uuid::parse_str(&row.get::<String, _>("session_id"))
                    .map_err(|e| anyhow::anyhow!("Failed to parse session_id: {}", e))
            })
            .collect::<Result<Vec<_>>>()?;

        Ok(session_ids)
    }

    /// Check if a document is in a session
    pub async fn is_in_session(
        &self,
        session_id: Uuid,
        document_id: Uuid,
    ) -> Result<bool> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM session_documents
             WHERE session_id = ? AND document_id = ?"
        )
        .bind(session_id.to_string())
        .bind(document_id.to_string())
        .fetch_one(&*self.pool)
        .await?;

        Ok(count > 0)
    }

    /// Update notes for a document in a session
    pub async fn update_notes(
        &self,
        session_id: Uuid,
        document_id: Uuid,
        notes: Option<String>,
    ) -> Result<bool> {
        let result = sqlx::query(
            "UPDATE session_documents
             SET notes = ?
             WHERE session_id = ? AND document_id = ?"
        )
        .bind(&notes)
        .bind(session_id.to_string())
        .bind(document_id.to_string())
        .execute(&*self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}

// Row struct for SQLx mapping
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
