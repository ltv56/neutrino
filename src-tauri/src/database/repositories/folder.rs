use super::{DbResult, DatabaseError};
use super::super::models::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct FolderRepository {
    pool: Arc<SqlitePool>,
}

impl FolderRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        name: String,
        parent_folder_id: Option<Uuid>,
    ) -> DbResult<Folder> {
        let folder_id = Uuid::new_v4();
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        let folder_id_str = folder_id.to_string();
        let parent_folder_id_str = parent_folder_id.map(|id| id.to_string());

        sqlx::query!(
            r#"
            INSERT INTO folders (id, name, parent_folder_id, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            "#,
            folder_id_str,
            name,
            parent_folder_id_str,
            now_str,
            now_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(Folder {
            id: folder_id,
            name,
            parent_folder_id,
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_all(&self) -> DbResult<Vec<Folder>> {
        let rows = sqlx::query_as!(
            FolderRow,
            "SELECT id, name, parent_folder_id, created_at, updated_at
             FROM folders ORDER BY name ASC"
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut folders = Vec::new();
        for row in rows {
            folders.push(self.row_to_folder(row)?);
        }

        Ok(folders)
    }

    pub async fn find_by_id(&self, folder_id: Uuid) -> DbResult<Option<Folder>> {
        let folder_id_str = folder_id.to_string();
        let row = sqlx::query_as!(
            FolderRow,
            "SELECT id, name, parent_folder_id, created_at, updated_at
             FROM folders WHERE id = ?",
            folder_id_str
        )
        .fetch_optional(&*self.pool)
        .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_folder(row)?)),
            None => Ok(None),
        }
    }

    pub async fn find_by_parent(&self, parent_folder_id: Option<Uuid>) -> DbResult<Vec<Folder>> {
        let parent_folder_id_str = parent_folder_id.map(|id| id.to_string());
        let rows = sqlx::query_as!(
            FolderRow,
            "SELECT id, name, parent_folder_id, created_at, updated_at
             FROM folders WHERE parent_folder_id IS ? ORDER BY name ASC",
            parent_folder_id_str
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut folders = Vec::new();
        for row in rows {
            folders.push(self.row_to_folder(row)?);
        }

        Ok(folders)
    }

    pub async fn update(&self, folder_id: Uuid, name: String) -> DbResult<()> {
        let folder_id_str = folder_id.to_string();
        let now_str = Utc::now().to_rfc3339();

        sqlx::query!(
            "UPDATE folders SET name = ?, updated_at = ? WHERE id = ?",
            name,
            now_str,
            folder_id_str
        )
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete(&self, folder_id: Uuid) -> DbResult<bool> {
        let folder_id_str = folder_id.to_string();
        let result = sqlx::query!("DELETE FROM folders WHERE id = ?", folder_id_str)
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_folder(&self, row: FolderRow) -> DbResult<Folder> {
        let folder_id = row.id.as_ref().ok_or_else(|| DatabaseError::InvalidUuid {
            value: "null".to_string(),
        })?;
        let created_at_str = row.created_at.as_ref().ok_or_else(|| DatabaseError::InvalidDateTime {
            value: "null".to_string(),
        })?;
        let updated_at_str = row.updated_at.as_ref().ok_or_else(|| DatabaseError::InvalidDateTime {
            value: "null".to_string(),
        })?;

        Ok(Folder {
            id: Uuid::parse_str(folder_id).map_err(|_| DatabaseError::InvalidUuid {
                value: folder_id.clone(),
            })?,
            name: row.name.ok_or_else(|| DatabaseError::InternalError {
                message: "Missing name".to_string(),
            })?,
            parent_folder_id: row
                .parent_folder_id
                .as_ref()
                .map(|s| {
                    Uuid::parse_str(s)
                        .map_err(|_| DatabaseError::InvalidUuid { value: s.to_string() })
                })
                .transpose()?,
            created_at: DateTime::parse_from_rfc3339(created_at_str)
                .map_err(|_| DatabaseError::InvalidDateTime {
                    value: created_at_str.clone(),
                })?
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(updated_at_str)
                .map_err(|_| DatabaseError::InvalidDateTime {
                    value: updated_at_str.clone(),
                })?
                .with_timezone(&Utc),
        })
    }
}

#[derive(Debug)]
struct FolderRow {
    pub id: Option<String>,
    pub name: Option<String>,
    pub parent_folder_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
