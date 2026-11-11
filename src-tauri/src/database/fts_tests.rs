use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

async fn migrated_pool() -> SqlitePool {
    // single connection: every new connection to :memory: would be a separate db
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

async fn hits(pool: &SqlitePool, table: &str, term: &str) -> i64 {
    sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {table} WHERE {table} MATCH ?"))
        .bind(term)
        .fetch_one(pool)
        .await
        .unwrap()
}

#[tokio::test]
async fn note_triggers_keep_fts_in_sync() {
    let pool = migrated_pool().await;

    sqlx::query(
        "INSERT INTO notes (id, title, content, created_at, updated_at)
         VALUES ('n1', 'Attention', 'transformers use attention', 'now', 'now')",
    )
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(hits(&pool, "notes_fts", "transformers").await, 1);

    sqlx::query("UPDATE notes SET content = 'convolution only' WHERE id = 'n1'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(hits(&pool, "notes_fts", "transformers").await, 0);
    assert_eq!(hits(&pool, "notes_fts", "convolution").await, 1);

    sqlx::query("DELETE FROM notes WHERE id = 'n1'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(hits(&pool, "notes_fts", "convolution").await, 0);
}

#[tokio::test]
async fn document_triggers_keep_fts_in_sync() {
    let pool = migrated_pool().await;

    sqlx::query(
        "INSERT INTO documents (id, title, file_path, content_type, created_at, updated_at)
         VALUES ('d1', 'Graph Neural Networks', 'a.pdf', 'pdf', 'now', 'now')",
    )
    .execute(&pool)
    .await
    .unwrap();
    assert_eq!(hits(&pool, "documents_fts", "graph").await, 1);

    sqlx::query("UPDATE documents SET title = 'Diffusion Models' WHERE id = 'd1'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(hits(&pool, "documents_fts", "graph").await, 0);
    assert_eq!(hits(&pool, "documents_fts", "diffusion").await, 1);

    sqlx::query("DELETE FROM documents WHERE id = 'd1'")
        .execute(&pool)
        .await
        .unwrap();
    assert_eq!(hits(&pool, "documents_fts", "diffusion").await, 0);
}
