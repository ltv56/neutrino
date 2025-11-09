use crate::documents::storage::{save_pdf_file, read_pdf_file, delete_pdf_file, get_app_directories, import_pdf_from_path};
use crate::documents::storage::{SavedFileInfo, AppDirectories};
use crate::documents::pdf::metadata::{extract_metadata as extract_pdf_metadata, PDFMetadata};
use tauri::AppHandle;

#[tauri::command]
pub async fn pdf_get_app_directories(app: AppHandle) -> Result<AppDirectories, String> {
    get_app_directories(&app)
}

#[tauri::command]
pub async fn pdf_save_file(
    app: AppHandle,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<SavedFileInfo, String> {
    save_pdf_file(&app, file_name, file_data)
}

#[tauri::command]
pub async fn pdf_import_from_path(
    app: AppHandle,
    source_path: String,
) -> Result<SavedFileInfo, String> {
    import_pdf_from_path(&app, source_path)
}

#[tauri::command]
pub async fn pdf_read_file(file_path: String) -> Result<Vec<u8>, String> {
    read_pdf_file(file_path)
}

#[tauri::command]
pub async fn pdf_delete_file(app: AppHandle, file_path: String) -> Result<(), String> {
    delete_pdf_file(&app, file_path)
}

#[tauri::command]
pub async fn pdf_extract_metadata(file_path: String) -> Result<PDFMetadata, String> {
    extract_pdf_metadata(file_path)
}
