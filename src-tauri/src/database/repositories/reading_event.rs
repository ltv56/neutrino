use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

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

    pub async fn get_recent_by_session(
        &self,
        session_id: Uuid,
        event_type: &str,
        limit: i64,
    ) -> DbResult<Vec<ReadingEvent>> {
        let session_id_str = session_id.to_string();

        let rows = sqlx::query_as!(
            ReadingEventRow,
            r#"
            SELECT DISTINCT re.id, re.document_id, re.event_type, re.page_number,
                   re.position_data, re.content, re.note, re.metadata,
                   re.created_at, re.updated_at
            FROM reading_events re
            INNER JOIN session_documents sd ON re.document_id = sd.document_id
            WHERE sd.session_id = ? AND re.event_type = ?
            ORDER BY re.created_at DESC
            LIMIT ?
            "#,
            session_id_str,
            event_type,
            limit
        )
        .fetch_all(&*self.pool)
        .await?;

        self.parse_reading_event_rows(rows)
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
