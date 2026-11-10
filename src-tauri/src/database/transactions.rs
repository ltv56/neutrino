use std::sync::Arc;
use sqlx::{SqlitePool, Transaction, Sqlite};
use uuid::Uuid;
use chrono::Utc;
use super::models::*;
use super::errors::DatabaseError;

type DbResult<T> = Result<T, DatabaseError>;

#[derive(Clone)]
pub struct TransactionService {
    pool: Arc<SqlitePool>,
}

impl TransactionService {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create_session_with_documents(
        &self,
        title: String,
        goal: Option<String>,
        documents: Vec<CreateDocumentRequest>,
    ) -> DbResult<ResearchSession> {
        let mut tx = self.pool.begin().await?;

        // Create session
        let session = self.create_session_tx(&mut tx, title, goal).await?;

        // Create documents and link them to session
        for doc_req in documents {
            let document = self.create_document_tx(&mut tx, doc_req).await?;
            self.link_document_to_session_tx(&mut tx, &session.id, &document.id).await?;
        }

        tx.commit().await.map_err(|e| DatabaseError::TransactionFailed {
            reason: e.to_string(),
        })?;

        Ok(session)
    }

    // Private transaction helper methods
    async fn create_session_tx(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        title: String,
        goal: Option<String>,
    ) -> DbResult<ResearchSession> {
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
        .execute(&mut **tx)
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

    async fn create_document_tx(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        doc_req: CreateDocumentRequest,
    ) -> DbResult<Document> {
        let document_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let document_id_str = document_id.to_string();

        sqlx::query!(
            r#"
            INSERT INTO documents (id, title, file_path, content_type, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            document_id_str,
            doc_req.title,
            doc_req.file_path,
            doc_req.content_type,
            now_str,
            now_str
        )
        .execute(&mut **tx)
        .await?;

        Ok(Document {
            id: document_id,
            title: doc_req.title,
            file_path: doc_req.file_path,
            content_type: doc_req.content_type,
            metadata: None,
            reading_progress: 0,
            created_at: now,
            updated_at: now,
        })
    }

    async fn link_document_to_session_tx(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        session_id: &Uuid,
        document_id: &Uuid,
    ) -> DbResult<()> {
        let now_str = Utc::now().to_rfc3339();
        let session_id_str = session_id.to_string();
        let document_id_str = document_id.to_string();

        sqlx::query!(
            r#"
            INSERT INTO session_documents (session_id, document_id, added_at)
            VALUES (?1, ?2, ?3)
            "#,
            session_id_str,
            document_id_str,
            now_str
        )
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

}

// Request DTOs
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub file_path: String,
    pub content_type: String,
}
