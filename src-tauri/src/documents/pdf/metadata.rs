/// PDF metadata extraction
///
/// Handles PDF-specific operations like parsing metadata from PDF files.

use serde::{Serialize, Deserialize};
use lopdf::Document;

#[derive(Debug, Serialize, Deserialize)]
pub struct PDFMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub page_count: u32,
    pub created_date: Option<String>,
    pub modified_date: Option<String>,
}

/// Extract PDF metadata from file
pub fn extract_metadata(file_path: String) -> Result<PDFMetadata, String> {
    let doc = Document::load(&file_path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;

    // Get page count
    let page_count = doc.get_pages().len() as u32;

    // Try to get metadata from Info dictionary
    let mut title = None;
    let mut author = None;
    let mut created_date = None;
    let mut modified_date = None;

    if let Ok(info_dict) = doc.trailer.get(b"Info") {
        if let Ok(info_obj_id) = info_dict.as_reference() {
            if let Ok(info_obj) = doc.get_object(info_obj_id) {
                if let Ok(info_dict) = info_obj.as_dict() {
                    // Extract title
                    if let Ok(title_obj) = info_dict.get(b"Title") {
                        if let Ok(title_str) = title_obj.as_str() {
                            title = Some(String::from_utf8_lossy(title_str).to_string());
                        }
                    }

                    // Extract author
                    if let Ok(author_obj) = info_dict.get(b"Author") {
                        if let Ok(author_str) = author_obj.as_str() {
                            author = Some(String::from_utf8_lossy(author_str).to_string());
                        }
                    }

                    // Extract creation date
                    if let Ok(created_obj) = info_dict.get(b"CreationDate") {
                        if let Ok(created_str) = created_obj.as_str() {
                            created_date = Some(String::from_utf8_lossy(created_str).to_string());
                        }
                    }

                    // Extract modification date
                    if let Ok(modified_obj) = info_dict.get(b"ModDate") {
                        if let Ok(modified_str) = modified_obj.as_str() {
                            modified_date = Some(String::from_utf8_lossy(modified_str).to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(PDFMetadata {
        title,
        author,
        page_count,
        created_date,
        modified_date,
    })
}
