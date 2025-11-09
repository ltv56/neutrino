/// Document storage management
///
/// Handles file I/O operations for all document types.
/// This is a generic layer that works with any file format.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedFileInfo {
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppDirectories {
    pub app_data: String,
    pub documents: String,
}

/// Get app directories for document storage
pub fn get_app_directories(app: &AppHandle) -> Result<AppDirectories, String> {
    let app_dir = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    Ok(AppDirectories {
        app_data: app_dir.to_string_lossy().to_string(),
        documents: app_dir.join("documents").to_string_lossy().to_string(),
    })
}

/// Save PDF file to app storage
pub fn save_pdf_file(
    app: &AppHandle,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<SavedFileInfo, String> {
    let app_dir = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let documents_dir = app_dir.join("documents");

    // Create directory if not exists
    std::fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

    // Generate unique filename with UUID
    let uuid = uuid::Uuid::new_v4();
    let extension = std::path::Path::new(&file_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("pdf");

    // Sanitize filename (remove extension)
    let name_without_ext = std::path::Path::new(&file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("document");

    let unique_name = format!("{}_{}.{}", uuid, name_without_ext, extension);
    let file_path = documents_dir.join(&unique_name);

    // Get file size
    let size = file_data.len() as u64;

    // Write file
    std::fs::write(&file_path, file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(SavedFileInfo {
        path: file_path.to_string_lossy().to_string(),
        size,
    })
}

/// Read PDF file from storage
pub fn read_pdf_file(file_path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

/// Delete PDF file from storage
pub fn delete_pdf_file(app: &AppHandle, file_path: String) -> Result<(), String> {
    let app_dir = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let file = PathBuf::from(&file_path);

    // Security: Ensure file is within app directory
    if !file.starts_with(&app_dir) {
        return Err("Invalid file path: file must be within app directory".to_string());
    }

    std::fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete file: {}", e))
}

/// Import PDF file from external path (for file browser)
pub fn import_pdf_from_path(
    app: &AppHandle,
    source_path: String,
) -> Result<SavedFileInfo, String> {
    // Read file from source
    let file_data = std::fs::read(&source_path)
        .map_err(|e| format!("Failed to read source file: {}", e))?;

    // Get filename from path
    let file_name = PathBuf::from(&source_path)
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or("Invalid file name")?
        .to_string();

    // Use existing save_pdf_file function
    save_pdf_file(app, file_name, file_data)
}
