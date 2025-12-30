use anyhow::Result;
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::database::models::{NoteLink, LinkTarget, NoteLinkWithSource, NoteLinkWithTarget, BacklinksResult};

#[derive(Clone)]
pub struct NoteLinkRepository {
    pool: Arc<SqlitePool>,
}

impl NoteLinkRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    /// Create a new link when user types [[link]]
    pub async fn create(
        &self,
        source_note_id: Uuid,
        link_text: String,
        link_type: String,
        source_position: Option<String>,
        context: Option<String>,
    ) -> Result<NoteLink> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            "INSERT INTO note_links (id, source_note_id, link_text, link_type, source_position, context, resolved, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)"
        )
        .bind(id.to_string())
        .bind(source_note_id.to_string())
        .bind(&link_text)
        .bind(&link_type)
        .bind(&source_position)
        .bind(&context)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&*self.pool)
        .await?;

        Ok(NoteLink {
            id,
            source_note_id,
            target_note_id: None,
            target_document_id: None,
            source_position,
            target_position: None,
            link_type,
            link_text,
            resolved: false,
            context,
            created_at: now,
            updated_at: now,
        })
    }

    /// Resolve a link by setting its target
    pub async fn resolve_link(
        &self,
        link_id: Uuid,
        target_note_id: Option<Uuid>,
        target_document_id: Option<Uuid>,
    ) -> Result<()> {
        let now = Utc::now();

        sqlx::query(
            "UPDATE note_links
             SET target_note_id = ?, target_document_id = ?, resolved = 1, updated_at = ?
             WHERE id = ?"
        )
        .bind(target_note_id.map(|id| id.to_string()))
        .bind(target_document_id.map(|id| id.to_string()))
        .bind(now.to_rfc3339())
        .bind(link_id.to_string())
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    /// Get all incoming links (backlinks) for a note
    pub async fn find_backlinks(&self, note_id: Uuid) -> Result<Vec<NoteLinkWithSource>> {
        let note_id_str = note_id.to_string();

        let rows = sqlx::query(
            "SELECT nl.id, nl.source_note_id, nl.target_note_id, nl.target_document_id,
                    nl.source_position, nl.target_position, nl.link_type, nl.link_text,
                    nl.resolved, nl.context, nl.created_at, nl.updated_at,
                    n.title as source_title, n.content as source_content
             FROM note_links nl
             INNER JOIN notes n ON nl.source_note_id = n.id
             WHERE nl.target_note_id = ? AND nl.resolved = 1
             ORDER BY nl.created_at DESC"
        )
        .bind(&note_id_str)
        .fetch_all(&*self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let id: String = row.get("id");
            let source_note_id: String = row.get("source_note_id");
            let target_note_id: Option<String> = row.get("target_note_id");
            let target_document_id: Option<String> = row.get("target_document_id");
            let link_type: String = row.get("link_type");
            let link_text: String = row.get("link_text");
            let resolved: bool = row.get("resolved");
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let source_title: String = row.get("source_title");
            let source_content: String = row.get("source_content");

            // Create preview
            let preview: String = source_content
                .trim()
                .replace("\n", " ")
                .chars()
                .take(100)
                .collect();
            let content_preview = if source_content.len() > 100 {
                format!("{}...", preview)
            } else {
                preview
            };

            results.push(NoteLinkWithSource {
                link: NoteLink {
                    id: Uuid::parse_str(&id)?,
                    source_note_id: Uuid::parse_str(&source_note_id)?,
                    target_note_id: target_note_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    target_document_id: target_document_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    source_position: row.get("source_position"),
                    target_position: row.get("target_position"),
                    link_type,
                    link_text,
                    resolved,
                    context: row.get("context"),
                    created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at)?.with_timezone(&Utc),
                },
                source_title,
                source_content_preview: content_preview,
            });
        }

        Ok(results)
    }

    /// Get all incoming links (backlinks) for a document
    pub async fn find_document_backlinks(&self, document_id: Uuid) -> Result<Vec<NoteLinkWithSource>> {
        let document_id_str = document_id.to_string();

        let rows = sqlx::query(
            "SELECT nl.id, nl.source_note_id, nl.target_note_id, nl.target_document_id,
                    nl.source_position, nl.target_position, nl.link_type, nl.link_text,
                    nl.resolved, nl.context, nl.created_at, nl.updated_at,
                    n.title as source_title, n.content as source_content
             FROM note_links nl
             INNER JOIN notes n ON nl.source_note_id = n.id
             WHERE nl.target_document_id = ? AND nl.resolved = 1
             ORDER BY nl.created_at DESC"
        )
        .bind(&document_id_str)
        .fetch_all(&*self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let id: String = row.get("id");
            let source_note_id: String = row.get("source_note_id");
            let target_note_id: Option<String> = row.get("target_note_id");
            let target_document_id: Option<String> = row.get("target_document_id");
            let link_type: String = row.get("link_type");
            let link_text: String = row.get("link_text");
            let resolved: bool = row.get("resolved");
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let source_title: String = row.get("source_title");
            let source_content: String = row.get("source_content");

            let preview: String = source_content
                .trim()
                .replace("\n", " ")
                .chars()
                .take(100)
                .collect();
            let content_preview = if source_content.len() > 100 {
                format!("{}...", preview)
            } else {
                preview
            };

            results.push(NoteLinkWithSource {
                link: NoteLink {
                    id: Uuid::parse_str(&id)?,
                    source_note_id: Uuid::parse_str(&source_note_id)?,
                    target_note_id: target_note_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    target_document_id: target_document_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    source_position: row.get("source_position"),
                    target_position: row.get("target_position"),
                    link_type,
                    link_text,
                    resolved,
                    context: row.get("context"),
                    created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at)?.with_timezone(&Utc),
                },
                source_title,
                source_content_preview: content_preview,
            });
        }

        Ok(results)
    }

    /// Get all outgoing links from a note
    pub async fn find_outgoing_links(&self, note_id: Uuid) -> Result<Vec<NoteLinkWithTarget>> {
        let note_id_str = note_id.to_string();

        let rows = sqlx::query(
            "SELECT nl.id, nl.source_note_id, nl.target_note_id, nl.target_document_id,
                    nl.source_position, nl.target_position, nl.link_type, nl.link_text,
                    nl.resolved, nl.context, nl.created_at, nl.updated_at,
                    n.title as target_note_title,
                    d.title as target_doc_title
             FROM note_links nl
             LEFT JOIN notes n ON nl.target_note_id = n.id
             LEFT JOIN documents d ON nl.target_document_id = d.id
             WHERE nl.source_note_id = ?
             ORDER BY nl.created_at DESC"
        )
        .bind(&note_id_str)
        .fetch_all(&*self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let id: String = row.get("id");
            let source_note_id: String = row.get("source_note_id");
            let target_note_id: Option<String> = row.get("target_note_id");
            let target_document_id: Option<String> = row.get("target_document_id");
            let link_type: String = row.get("link_type");
            let link_text: String = row.get("link_text");
            let resolved: bool = row.get("resolved");
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            let target_note_title: Option<String> = row.get("target_note_title");
            let target_doc_title: Option<String> = row.get("target_doc_title");

            let (target_title, target_type) = if target_note_title.is_some() {
                (target_note_title, Some("note".to_string()))
            } else if target_doc_title.is_some() {
                (target_doc_title, Some("document".to_string()))
            } else if !resolved {
                (None, Some("unresolved".to_string()))
            } else {
                (None, None)
            };

            results.push(NoteLinkWithTarget {
                link: NoteLink {
                    id: Uuid::parse_str(&id)?,
                    source_note_id: Uuid::parse_str(&source_note_id)?,
                    target_note_id: target_note_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    target_document_id: target_document_id.as_ref().and_then(|s| Uuid::parse_str(s).ok()),
                    source_position: row.get("source_position"),
                    target_position: row.get("target_position"),
                    link_type,
                    link_text,
                    resolved,
                    context: row.get("context"),
                    created_at: DateTime::parse_from_rfc3339(&created_at)?.with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&updated_at)?.with_timezone(&Utc),
                },
                target_title,
                target_type,
            });
        }

        Ok(results)
    }

    /// Search for potential link targets by title
    pub async fn search_targets(
        &self,
        query: &str,
        session_id: Option<Uuid>,
    ) -> Result<Vec<LinkTarget>> {
        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        // Search notes
        let note_query = if let Some(session_id) = session_id {
            sqlx::query(
                "SELECT id, title, content FROM notes
                 WHERE session_id = ? AND LOWER(title) LIKE ?
                 ORDER BY
                   CASE
                     WHEN LOWER(title) = ? THEN 1
                     WHEN LOWER(title) LIKE ? THEN 2
                     ELSE 3
                   END
                 LIMIT 10"
            )
            .bind(session_id.to_string())
            .bind(format!("%{}%", query_lower))
            .bind(&query_lower)
            .bind(format!("{}%", query_lower))
        } else {
            sqlx::query(
                "SELECT id, title, content FROM notes
                 WHERE LOWER(title) LIKE ?
                 ORDER BY
                   CASE
                     WHEN LOWER(title) = ? THEN 1
                     WHEN LOWER(title) LIKE ? THEN 2
                     ELSE 3
                   END
                 LIMIT 10"
            )
            .bind(format!("%{}%", query_lower))
            .bind(&query_lower)
            .bind(format!("{}%", query_lower))
        };

        let note_rows = note_query.fetch_all(&*self.pool).await?;
        for row in note_rows {
            let id: String = row.get("id");
            let title: String = row.get("title");
            let content: String = row.get("content");

            let preview: String = content
                .trim()
                .replace("\n", " ")
                .chars()
                .take(80)
                .collect();
            let content_preview = if content.len() > 80 {
                format!("{}...", preview)
            } else {
                preview
            };

            results.push(LinkTarget {
                id: Uuid::parse_str(&id)?,
                title,
                target_type: "note".to_string(),
                content_preview: Some(content_preview),
            });
        }

        // Search documents
        let doc_query = if let Some(session_id) = session_id {
            sqlx::query(
                "SELECT d.id, d.title FROM documents d
                 INNER JOIN session_documents sd ON d.id = sd.document_id
                 WHERE sd.session_id = ? AND LOWER(d.title) LIKE ?
                 ORDER BY
                   CASE
                     WHEN LOWER(d.title) = ? THEN 1
                     WHEN LOWER(d.title) LIKE ? THEN 2
                     ELSE 3
                   END
                 LIMIT 10"
            )
            .bind(session_id.to_string())
            .bind(format!("%{}%", query_lower))
            .bind(&query_lower)
            .bind(format!("{}%", query_lower))
        } else {
            sqlx::query(
                "SELECT id, title FROM documents
                 WHERE LOWER(title) LIKE ?
                 ORDER BY
                   CASE
                     WHEN LOWER(title) = ? THEN 1
                     WHEN LOWER(title) LIKE ? THEN 2
                     ELSE 3
                   END
                 LIMIT 10"
            )
            .bind(format!("%{}%", query_lower))
            .bind(&query_lower)
            .bind(format!("{}%", query_lower))
        };

        let doc_rows = doc_query.fetch_all(&*self.pool).await?;
        for row in doc_rows {
            let id: String = row.get("id");
            let title: String = row.get("title");

            results.push(LinkTarget {
                id: Uuid::parse_str(&id)?,
                title,
                target_type: "document".to_string(),
                content_preview: None,
            });
        }

        Ok(results)
    }

    /// Sync links for a note - delete old, insert new, and auto-resolve
    pub async fn sync_links_for_note(
        &self,
        note_id: Uuid,
        links: Vec<(String, String, Option<String>)>, // (link_text, link_type, context)
    ) -> Result<()> {
        // Delete all existing links from this note
        sqlx::query("DELETE FROM note_links WHERE source_note_id = ?")
            .bind(note_id.to_string())
            .execute(&*self.pool)
            .await?;

        // Insert new links and auto-resolve
        for (link_text, link_type, context) in links {
            let new_link = self.create(note_id, link_text.clone(), link_type, None, context).await?;

            // Try to auto-resolve the link
            self.auto_resolve_link(new_link.id, &link_text).await?;
        }

        Ok(())
    }

    /// Auto-resolve a link by finding matching note/document by title
    async fn auto_resolve_link(&self, link_id: Uuid, link_text: &str) -> Result<()> {
        // Strip .md extension for note matching (notes don't have .md in title)
        let note_search_text = if link_text.to_lowercase().ends_with(".md") {
            &link_text[..link_text.len() - 3]
        } else {
            link_text
        };

        // Search for matching note
        let note_rows = sqlx::query(
            "SELECT id FROM notes WHERE LOWER(title) = LOWER(?) LIMIT 1"
        )
        .bind(note_search_text)
        .fetch_all(&*self.pool)
        .await?;

        if !note_rows.is_empty() {
            let note_id: String = note_rows[0].get("id");
            if let Ok(note_uuid) = Uuid::parse_str(&note_id) {
                self.resolve_link(link_id, Some(note_uuid), None).await?;
                return Ok(());
            }
        }

        // Search for matching document
        let doc_rows = sqlx::query(
            "SELECT id FROM documents WHERE LOWER(title) = LOWER(?) LIMIT 1"
        )
        .bind(link_text)
        .fetch_all(&*self.pool)
        .await?;

        if !doc_rows.is_empty() {
            let doc_id: String = doc_rows[0].get("id");
            if let Ok(doc_uuid) = Uuid::parse_str(&doc_id) {
                self.resolve_link(link_id, None, Some(doc_uuid)).await?;
                return Ok(());
            }
        }

        Ok(())
    }

    /// Delete a link
    pub async fn delete(&self, link_id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM note_links WHERE id = ?")
            .bind(link_id.to_string())
            .execute(&*self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get backlinks result (both incoming and outgoing)
    pub async fn get_backlinks(&self, note_id: Uuid) -> Result<BacklinksResult> {
        let incoming = self.find_backlinks(note_id).await?;
        let outgoing = self.find_outgoing_links(note_id).await?;

        Ok(BacklinksResult { incoming, outgoing })
    }

    pub async fn get_document_backlinks(&self, document_id: Uuid) -> Result<BacklinksResult> {
        let incoming = self.find_document_backlinks(document_id).await?;
        let outgoing = Vec::new(); // Documents don't have outgoing links

        Ok(BacklinksResult { incoming, outgoing })
    }
}
