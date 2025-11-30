use crate::database::Database;
use serde::Serialize;

#[derive(Serialize)]
pub struct DatabaseStats {
    pub sessions_count: i64,
    pub documents_count: i64,
    pub notes_count: i64,
}

#[derive(Serialize)]
pub struct FTSDebugInfo {
    pub documents_count: i64,
    pub documents_fts_count: i64,
    pub notes_count: i64,
    pub notes_fts_count: i64,
    pub sample_documents: Vec<String>,
}

#[derive(Serialize)]
pub struct DatabaseIntegrityCheck {
    pub is_ok: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
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

#[tauri::command]
pub async fn vacuum_database(
    database: tauri::State<'_, Database>,
) -> Result<String, String> {
    use sqlx::Executor;

    let pool = database.pool();

    println!("[DatabaseVacuum] Starting VACUUM...");

    // VACUUM will rebuild the database file, removing all fragmentation
    pool.execute("VACUUM").await.map_err(|e| {
        eprintln!("[DatabaseVacuum] FAILED: {:?}", e);
        e.to_string()
    })?;

    println!("[DatabaseVacuum] VACUUM completed successfully");
    Ok("Database vacuumed successfully".to_string())
}

#[tauri::command]
pub async fn check_database_integrity(
    database: tauri::State<'_, Database>,
) -> Result<DatabaseIntegrityCheck, String> {
    use sqlx::Row;

    let pool = database.pool();
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    println!("[DatabaseIntegrity] Running integrity check...");

    // SQLite PRAGMA integrity_check (full check)
    match sqlx::query("PRAGMA integrity_check")
        .fetch_one(pool)
        .await
    {
        Ok(row) => {
            let result: String = row.try_get(0).unwrap_or_else(|_| "unknown".to_string());
            println!("[DatabaseIntegrity] PRAGMA integrity_check: {}", result);

            if result != "ok" {
                errors.push(format!("Database integrity check failed: {}", result));
            }
        }
        Err(e) => {
            let err_msg = format!("Failed to run integrity check: {}", e);
            eprintln!("[DatabaseIntegrity] {}", err_msg);
            errors.push(err_msg);
        }
    }

    // Check WAL checkpoint status
    match sqlx::query("PRAGMA wal_checkpoint(PASSIVE)")
        .fetch_one(pool)
        .await
    {
        Ok(row) => {
            let busy: i64 = row.try_get(0).unwrap_or(0);
            let log: i64 = row.try_get(1).unwrap_or(0);
            let checkpointed: i64 = row.try_get(2).unwrap_or(0);
            println!("[DatabaseIntegrity] WAL checkpoint - Busy: {}, Log: {}, Checkpointed: {}", busy, log, checkpointed);

            if log > 1000 {
                warnings.push(format!("WAL file has {} frames (consider checkpointing)", log));
            }
        }
        Err(e) => {
            warnings.push(format!("Could not check WAL: {}", e));
        }
    }

    // Check for orphaned notes (notes with invalid session_id or document_id)
    match sqlx::query(
        "SELECT COUNT(*) as count FROM notes
         WHERE session_id IS NOT NULL
         AND session_id NOT IN (SELECT id FROM research_sessions)"
    )
    .fetch_one(pool)
    .await
    {
        Ok(row) => {
            let count: i64 = row.get("count");
            if count > 0 {
                warnings.push(format!("Found {} orphaned notes (invalid session_id)", count));
            }
        }
        Err(e) => {
            warnings.push(format!("Could not check orphaned notes: {}", e));
        }
    }

    // Check database file size
    match sqlx::query("PRAGMA page_count")
        .fetch_one(pool)
        .await
    {
        Ok(row) => {
            let page_count: i64 = row.try_get(0).unwrap_or(0);
            println!("[DatabaseIntegrity] Page count: {}", page_count);

            if page_count == 0 {
                errors.push("Database appears to be empty or corrupted".to_string());
            }
        }
        Err(e) => {
            warnings.push(format!("Could not check page count: {}", e));
        }
    }

    let is_ok = errors.is_empty();

    println!("[DatabaseIntegrity] Check complete - OK: {}, Errors: {}, Warnings: {}",
             is_ok, errors.len(), warnings.len());

    Ok(DatabaseIntegrityCheck {
        is_ok,
        errors,
        warnings,
    })
}

#[tauri::command]
pub async fn get_fts_debug_info(
    database: tauri::State<'_, Database>,
) -> Result<FTSDebugInfo, String> {
    use sqlx::Row;

    let pool = database.pool();

    // Count documents
    let documents_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM documents")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    // Count documents_fts
    let documents_fts_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM documents_fts")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    // Count notes
    let notes_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM notes")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    // Count notes_fts
    let notes_fts_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM notes_fts")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?
        .get("count");

    // Get sample documents
    let sample_rows = sqlx::query("SELECT title FROM documents LIMIT 5")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let sample_documents: Vec<String> = sample_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("title").ok())
        .collect();

    println!("[FTSDebug] Documents: {}, FTS: {}", documents_count, documents_fts_count);
    println!("[FTSDebug] Notes: {}, FTS: {}", notes_count, notes_fts_count);
    println!("[FTSDebug] Sample documents: {:?}", sample_documents);

    Ok(FTSDebugInfo {
        documents_count,
        documents_fts_count,
        notes_count,
        notes_fts_count,
        sample_documents,
    })
}

#[tauri::command]
pub async fn rebuild_fts_index(
    database: tauri::State<'_, Database>,
) -> Result<String, String> {
    use sqlx::Executor;

    let pool = database.pool();

    println!("[FTSRebuild] Starting FTS rebuild...");

    // Rebuild documents_fts
    pool.execute("DELETE FROM documents_fts").await.map_err(|e| e.to_string())?;
    pool.execute(
        "INSERT INTO documents_fts(id, title, metadata)
         SELECT id, title, metadata FROM documents"
    ).await.map_err(|e| e.to_string())?;

    // Rebuild notes_fts
    pool.execute("DELETE FROM notes_fts").await.map_err(|e| e.to_string())?;
    pool.execute(
        "INSERT INTO notes_fts(id, title, content, tags)
         SELECT id, title, content, tags FROM notes"
    ).await.map_err(|e| e.to_string())?;

    println!("[FTSRebuild] FTS rebuild completed");
    Ok("FTS index rebuilt successfully".to_string())
}
