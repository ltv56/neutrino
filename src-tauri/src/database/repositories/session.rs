use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

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
            // Extract values first to avoid ownership issues
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

    pub async fn save_context_snapshot(&self, id: Uuid, snapshot: &crate::database::models::ContextSnapshot) -> DbResult<()> {
        let now_str = chrono::Utc::now().to_rfc3339();
        let id_str = id.to_string();
        let snapshot_json = serde_json::to_string(snapshot)
            .map_err(|e| DatabaseError::InternalError {
                message: format!("Failed to serialize context snapshot: {}", e),
            })?;

        let result = sqlx::query!(
            "UPDATE research_sessions SET context_state = ?, updated_at = ? WHERE id = ?",
            snapshot_json,
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

    pub async fn get_context_snapshot(&self, id: Uuid) -> DbResult<Option<crate::database::models::ContextSnapshot>> {
        let id_str = id.to_string();
        let row = sqlx::query!(
            "SELECT context_state FROM research_sessions WHERE id = ?",
            id_str
        )
        .fetch_optional(&*self.pool)
        .await?;

        let Some(row) = row else {
            return Ok(None);
        };

        let Some(context_state) = row.context_state else {
            return Ok(None);
        };

        let snapshot = serde_json::from_str(&context_state)
            .map_err(|e| DatabaseError::InternalError {
                message: format!("Failed to deserialize context snapshot: {}", e),
            })?;

        Ok(Some(snapshot))
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

// Row structs so SQLx maps types correctly: all TEXT fields are Option<String>
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
