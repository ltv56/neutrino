use super::DbResult;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageText {
    pub page_number: u32,
    pub text: String,
    pub items_json: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageHit {
    pub document_id: String,
    pub page_number: u32,
    pub snippet: String,
}

#[derive(Clone)]
pub struct DocumentPageRepository {
    pool: Arc<SqlitePool>,
}

impl DocumentPageRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub async fn replace_pages(&self, document_id: Uuid, pages: Vec<PageText>) -> DbResult<()> {
        let id = document_id.to_string();
        let mut tx = self.pool.begin().await?;

        sqlx::query("DELETE FROM document_pages_fts WHERE document_id = ?")
            .bind(&id)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM document_pages WHERE document_id = ?")
            .bind(&id)
            .execute(&mut *tx)
            .await?;

        for page in pages {
            sqlx::query("INSERT INTO document_pages (document_id, page_number, text, items_json) VALUES (?, ?, ?, ?)")
                .bind(&id)
                .bind(page.page_number as i64)
                .bind(&page.text)
                .bind(&page.items_json)
                .execute(&mut *tx)
                .await?;
            sqlx::query("INSERT INTO document_pages_fts (document_id, page_number, text) VALUES (?, ?, ?)")
                .bind(&id)
                .bind(page.page_number as i64)
                .bind(&page.text)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_page(&self, document_id: Uuid, page_number: u32) -> DbResult<Option<PageText>> {
        let row: Option<(i64, String, Option<String>)> = sqlx::query_as(
            "SELECT page_number, text, items_json FROM document_pages
             WHERE document_id = ? AND page_number = ?",
        )
        .bind(document_id.to_string())
        .bind(page_number as i64)
        .fetch_optional(&*self.pool)
        .await?;

        Ok(row.map(|(n, text, items_json)| PageText { page_number: n as u32, text, items_json }))
    }

    pub async fn search(&self, query: &str, limit: u32) -> DbResult<Vec<PageHit>> {
        let fts_query = crate::core::fts::to_prefix_query(query);
        if fts_query.is_empty() {
            return Ok(vec![]);
        }

        // join on document_pages hides index rows left behind by deleted documents
        let rows: Vec<(String, i64, String)> = sqlx::query_as(
            "SELECT f.document_id, f.page_number, snippet(document_pages_fts, 2, '', '', '...', 12)
             FROM document_pages_fts f
             JOIN document_pages p ON p.document_id = f.document_id AND p.page_number = f.page_number
             WHERE document_pages_fts MATCH ?
             ORDER BY rank
             LIMIT ?",
        )
        .bind(fts_query)
        .bind(limit as i64)
        .fetch_all(&*self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(document_id, n, snippet)| PageHit { document_id, page_number: n as u32, snippet })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup() -> (Arc<SqlitePool>, DocumentPageRepository) {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let pool = Arc::new(pool);
        (pool.clone(), DocumentPageRepository::new(pool))
    }

    async fn add_document(pool: &SqlitePool, title: &str) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO documents (id, title, file_path, content_type, created_at, updated_at)
             VALUES (?, ?, 'a.pdf', 'pdf', 'now', 'now')",
        )
        .bind(id.to_string())
        .bind(title)
        .execute(pool)
        .await
        .unwrap();
        id
    }

    fn page(n: u32, text: &str) -> PageText {
        PageText { page_number: n, text: text.to_string(), items_json: None }
    }

    #[tokio::test]
    async fn stores_and_returns_a_page() {
        let (pool, repo) = setup().await;
        let doc = add_document(&pool, "Paper").await;
        repo.replace_pages(doc, vec![page(1, "first page"), page(2, "second page")]).await.unwrap();

        assert_eq!(repo.get_page(doc, 2).await.unwrap(), Some(page(2, "second page")));
        assert_eq!(repo.get_page(doc, 3).await.unwrap(), None);
    }

    #[tokio::test]
    async fn search_finds_page_with_prefix_and_snippet() {
        let (pool, repo) = setup().await;
        let doc = add_document(&pool, "Paper").await;
        repo.replace_pages(doc, vec![page(1, "intro to graphs"), page(2, "transformers use attention")])
            .await
            .unwrap();

        let hits = repo.search("transf", 10).await.unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].document_id, doc.to_string());
        assert_eq!(hits[0].page_number, 2);
        assert!(hits[0].snippet.contains("transformers"));
    }

    #[tokio::test]
    async fn replace_drops_old_text_from_table_and_index() {
        let (pool, repo) = setup().await;
        let doc = add_document(&pool, "Paper").await;
        repo.replace_pages(doc, vec![page(1, "old words"), page(2, "more old")]).await.unwrap();
        repo.replace_pages(doc, vec![page(1, "fresh words")]).await.unwrap();

        assert!(repo.search("old", 10).await.unwrap().is_empty());
        assert_eq!(repo.search("fresh", 10).await.unwrap().len(), 1);
        assert_eq!(repo.get_page(doc, 2).await.unwrap(), None);
    }

    #[tokio::test]
    async fn search_spans_documents_and_respects_limit() {
        let (pool, repo) = setup().await;
        let a = add_document(&pool, "A").await;
        let b = add_document(&pool, "B").await;
        repo.replace_pages(a, vec![page(1, "attention is key"), page(2, "attention again")]).await.unwrap();
        repo.replace_pages(b, vec![page(1, "attention elsewhere")]).await.unwrap();

        assert_eq!(repo.search("attention", 10).await.unwrap().len(), 3);
        assert_eq!(repo.search("attention", 2).await.unwrap().len(), 2);
    }

    #[tokio::test]
    async fn deleted_documents_do_not_show_up_in_search() {
        let (pool, repo) = setup().await;
        let doc = add_document(&pool, "Paper").await;
        repo.replace_pages(doc, vec![page(1, "ephemeral content")]).await.unwrap();
        sqlx::query("DELETE FROM documents WHERE id = ?")
            .bind(doc.to_string())
            .execute(&*pool)
            .await
            .unwrap();

        assert!(repo.search("ephemeral", 10).await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn punctuation_only_query_returns_nothing_instead_of_failing() {
        let (_pool, repo) = setup().await;
        assert!(repo.search("\"-*", 10).await.unwrap().is_empty());
    }
}
