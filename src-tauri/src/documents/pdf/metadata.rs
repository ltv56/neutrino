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

#[cfg(test)]
mod tests {
    use super::*;

    fn pdf_with(extra_obj: &str) -> Vec<u8> {
        let mut objs: Vec<String> = vec![
            "<< /Type /Catalog /Pages 2 0 R >>".into(),
            "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>".into(),
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>".into(),
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>".into(),
            "<< /Title (Attention Paper) /Author (A. Author) /CreationDate (D:20240101000000Z) >>".into(),
        ];
        if !extra_obj.is_empty() {
            objs.push(extra_obj.to_string());
        }
        let mut out = String::from("%PDF-1.4\n");
        let mut offsets = vec![];
        for (i, body) in objs.iter().enumerate() {
            offsets.push(out.len());
            out.push_str(&format!("{} 0 obj\n{}\nendobj\n", i + 1, body));
        }
        let xref = out.len();
        out.push_str(&format!("xref\n0 {}\n0000000000 65535 f \n", objs.len() + 1));
        for o in offsets {
            out.push_str(&format!("{:010} 00000 n \n", o));
        }
        out.push_str(&format!(
            "trailer\n<< /Size {} /Root 1 0 R /Info 5 0 R >>\nstartxref\n{}\n%%EOF\n",
            objs.len() + 1,
            xref
        ));
        out.into_bytes()
    }

    fn write_temp(bytes: &[u8]) -> String {
        let path = std::env::temp_dir().join(format!("neutrino-meta-{}.pdf", uuid::Uuid::new_v4()));
        std::fs::write(&path, bytes).unwrap();
        path.to_string_lossy().to_string()
    }

    #[test]
    fn reads_title_author_and_page_count() {
        let path = write_temp(&pdf_with(""));
        let meta = extract_metadata(path.clone()).unwrap();
        std::fs::remove_file(path).ok();
        assert_eq!(meta.page_count, 2);
        assert_eq!(meta.title.as_deref(), Some("Attention Paper"));
        assert_eq!(meta.author.as_deref(), Some("A. Author"));
        assert_eq!(meta.created_date.as_deref(), Some("D:20240101000000Z"));
    }

    #[test]
    fn garbage_is_an_error_not_a_panic() {
        let path = write_temp(b"this is not a pdf");
        let res = extract_metadata(path.clone());
        std::fs::remove_file(path).ok();
        assert!(res.is_err());
    }

    // RUSTSEC-2026-0187: deeply nested objects overflowed the stack in lopdf < 0.42
    #[test]
    fn deeply_nested_object_does_not_crash() {
        let depth = 200_000;
        let nested = format!("{}{}", "[".repeat(depth), "]".repeat(depth));
        let path = write_temp(&pdf_with(&nested));
        let _ = extract_metadata(path.clone());
        std::fs::remove_file(path).ok();
    }
}
