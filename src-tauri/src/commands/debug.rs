use crate::database::Database;
use serde::Serialize;

#[derive(Serialize)]
pub struct DatabaseStats {
    pub sessions_count: i64,
    pub documents_count: i64,
    pub notes_count: i64,
}

#[tauri::command]
pub async fn clear_all_data(
    database: tauri::State<'_, Database>,
) -> Result<(), String> {
    // WARNING: Only for development!
    #[cfg(debug_assertions)]
    {
        use sqlx::Executor;
        let pool = database.pool();

        // Clear tables in reverse dependency order
        pool.execute("DELETE FROM reading_events").await.ok();
        pool.execute("DELETE FROM document_links").await.ok();
        pool.execute("DELETE FROM concept_links").await.ok();
        pool.execute("DELETE FROM notes").await.ok();
        pool.execute("DELETE FROM documents").await.ok();
        pool.execute("DELETE FROM concepts").await.ok();
        pool.execute("DELETE FROM research_sessions").await.ok();

        Ok(())
    }

    #[cfg(not(debug_assertions))]
    {
        Err("Not available in production".to_string())
    }
}

#[tauri::command]
pub async fn get_database_stats(
    database: tauri::State<'_, Database>,
) -> Result<DatabaseStats, String> {
    use sqlx::Row;

    let pool = database.pool();

    let sessions_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM research_sessions")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    let documents_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM documents")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    let notes_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM notes")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    Ok(DatabaseStats {
        sessions_count,
        documents_count,
        notes_count,
    })
}
