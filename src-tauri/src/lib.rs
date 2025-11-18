// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![allow(dead_code)]
use tauri::Manager;

mod database;
mod debug;
mod commands;
mod documents;
mod http_server;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Neutrino!", name)
}

// Optional: Get available system memory for cache auto-adjustment
// Currently not used, but kept for future debugging/optimization
#[tauri::command]
fn get_available_memory() -> u64 {
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_memory();
    sys.available_memory() // Returns bytes
}

#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    println!("[Vite] Build complete");
    println!("[App] Showing window...");

    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window.show().map_err(|e| e.to_string())?;

    #[cfg(debug_assertions)]
    {
        window.open_devtools();
        println!("[Setup] DevTools opened");
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_available_memory, // For future cache optimization
            show_main_window,

            // ========== Session Management ==========
            commands::create_research_session,
            commands::get_research_sessions,
            commands::delete_research_session,
            commands::update_research_session,

            // ========== Document Management ==========
            commands::create_document,
            commands::check_duplicate_document,
            commands::delete_all_documents,
            commands::delete_document,
            commands::get_all_documents,
            commands::get_document_by_id,
            commands::get_documents_by_session,
            commands::update_document_reading_progress,

            // ========== PDF Management ==========
            commands::pdf_get_app_directories,
            commands::pdf_save_file,
            commands::pdf_import_from_path,
            commands::pdf_read_file,
            commands::pdf_delete_file,
            commands::pdf_extract_metadata,

            // ========== Reading Events (Highlights) ==========
            commands::create_highlight,
            commands::get_highlights_by_page,
            commands::get_highlights_by_document,
            commands::update_highlight_note,
            commands::delete_highlight,

            // ========== Note Management ==========
            commands::create_note,
            commands::get_note,
            commands::get_notes,
            commands::update_note,
            commands::delete_note,

            // ========== Transactions ==========
            commands::create_session_with_documents,

            // ========== Debug/Admin ==========
            commands::clear_all_data,
        ])
        .setup(|app| {
            let setup_start = std::time::Instant::now();
            println!("[Setup] Starting...");

            println!("[Vite] Building UI...");

            // Initialize database sync
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let database_path = app_data_dir.join("neutrino.db");
            let database_url = format!("sqlite://{}", database_path.display());

            // Initialize database in background
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let db_start = std::time::Instant::now();
                tauri::async_runtime::block_on(async move {
                    let db = database::Database::new(&database_url).await
                        .expect("Failed to initialize database");

                    app_handle.manage(db);
                    println!("[Setup] Database initialized in {}ms", db_start.elapsed().as_millis());
                });
            });

            // Start HTTP server for PDF streaming
            http_server::start_http_server(app.handle().clone());
            println!("[Setup] HTTP server started");

            println!("[Setup] Complete in {}ms", setup_start.elapsed().as_millis());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
