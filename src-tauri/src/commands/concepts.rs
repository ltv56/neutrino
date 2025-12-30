use crate::database::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CrossReference {
    pub concept_name: String,
    pub documents: Vec<CrossReferenceDocument>,
    pub notes: Vec<CrossReferenceNote>,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CrossReferenceDocument {
    pub document_id: String,
    pub document_title: String,
    pub relationship: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CrossReferenceNote {
    pub note_id: String,
    pub note_title: String,
    pub relationship: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConceptData {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub domain: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn create_concept(
    db: State<'_, Database>,
    name: String,
    description: Option<String>,
    domain: Option<String>,
) -> Result<ConceptData, String> {
    let mut conn = db.pool().acquire().await.map_err(|e| e.to_string())?;

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let updated_at = created_at.clone();

    sqlx::query!(
        r#"
        INSERT INTO concepts (id, name, description, domain, evolution_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?)
        "#,
        id,
        name,
        description,
        domain,
        created_at,
        updated_at
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ConceptData {
        id,
        name,
        description,
        domain,
        created_at,
        updated_at,
    })
}

#[tauri::command]
pub async fn link_concept_to_document(
    db: State<'_, Database>,
    concept_id: String,
    document_id: String,
    relationship: String,
    confidence: f64,
) -> Result<String, String> {
    let mut conn = db.pool().acquire().await.map_err(|e| e.to_string())?;

    let link_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    sqlx::query!(
        r#"
        INSERT INTO concept_links (id, concept_id, document_id, note_id, position, relationship, confidence, created_at)
        VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)
        "#,
        link_id,
        concept_id,
        document_id,
        relationship,
        confidence,
        created_at
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(link_id)
}

#[tauri::command]
pub async fn link_concept_to_note(
    db: State<'_, Database>,
    concept_id: String,
    note_id: String,
    relationship: String,
    confidence: f64,
) -> Result<String, String> {
    let mut conn = db.pool().acquire().await.map_err(|e| e.to_string())?;

    let link_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    sqlx::query!(
        r#"
        INSERT INTO concept_links (id, concept_id, document_id, note_id, position, relationship, confidence, created_at)
        VALUES (?, ?, NULL, ?, NULL, ?, ?, ?)
        "#,
        link_id,
        concept_id,
        note_id,
        relationship,
        confidence,
        created_at
    )
    .execute(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    Ok(link_id)
}

#[tauri::command]
pub async fn get_cross_references(
    db: State<'_, Database>,
    document_id: String,
) -> Result<Vec<CrossReference>, String> {
    let mut conn = db.pool().acquire().await.map_err(|e| e.to_string())?;

    // Find concepts linked to this document
    let concept_ids = sqlx::query!(
        r#"
        SELECT DISTINCT concept_id, relationship, confidence
        FROM concept_links
        WHERE document_id = ?
        "#,
        document_id
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    let mut cross_refs = Vec::new();

    for concept_link in concept_ids {
        // Get concept details
        let concept = sqlx::query!(
            r#"
            SELECT id, name, description, domain, evolution_data, created_at, updated_at
            FROM concepts
            WHERE id = ?
            "#,
            concept_link.concept_id
        )
        .fetch_one(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

        // Find other documents linked to this concept
        let linked_docs = sqlx::query!(
            r#"
            SELECT cl.document_id, cl.relationship, d.title
            FROM concept_links cl
            JOIN documents d ON cl.document_id = d.id
            WHERE cl.concept_id = ? AND cl.document_id != ? AND cl.document_id IS NOT NULL
            "#,
            concept_link.concept_id,
            document_id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

        // Find notes linked to this concept
        let linked_notes = sqlx::query!(
            r#"
            SELECT cl.note_id, cl.relationship, n.title
            FROM concept_links cl
            JOIN notes n ON cl.note_id = n.id
            WHERE cl.concept_id = ? AND cl.note_id IS NOT NULL
            "#,
            concept_link.concept_id
        )
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

        let documents: Vec<CrossReferenceDocument> = linked_docs
            .into_iter()
            .filter_map(|row| {
                Some(CrossReferenceDocument {
                    document_id: row.document_id?,
                    document_title: row.title,
                    relationship: row.relationship,
                })
            })
            .collect();

        let notes: Vec<CrossReferenceNote> = linked_notes
            .into_iter()
            .filter_map(|row| {
                Some(CrossReferenceNote {
                    note_id: row.note_id?,
                    note_title: row.title,
                    relationship: row.relationship,
                })
            })
            .collect();

        // Only add if there are related documents or notes
        if !documents.is_empty() || !notes.is_empty() {
            cross_refs.push(CrossReference {
                concept_name: concept.name,
                documents,
                notes,
                confidence: concept_link.confidence.unwrap_or(0.0),
            });
        }
    }

    Ok(cross_refs)
}

#[tauri::command]
pub async fn get_all_concepts(
    db: State<'_, Database>,
) -> Result<Vec<ConceptData>, String> {
    let mut conn = db.pool().acquire().await.map_err(|e| e.to_string())?;

    let concepts = sqlx::query!(
        r#"
        SELECT id, name, description, domain, created_at, updated_at
        FROM concepts
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    let results: Vec<ConceptData> = concepts
        .into_iter()
        .filter_map(|row| {
            Some(ConceptData {
                id: row.id?,
                name: row.name,
                description: row.description,
                domain: row.domain,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
        })
        .collect();

    Ok(results)
}
