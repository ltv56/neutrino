// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]
use tauri::Manager;
use std::env;

mod database;
mod debug;
mod commands;
mod documents;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Neutrino!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,

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

            // ========== PDF Management ==========
            commands::pdf_get_app_directories,
            commands::pdf_save_file,
            commands::pdf_import_from_path,
            commands::pdf_read_file,
            commands::pdf_delete_file,
            commands::pdf_extract_metadata,

            // ========== Transactions ==========
            commands::create_session_with_documents,

            // ========== Debug/Admin ==========
            commands::clear_all_data,
            commands::get_database_stats
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

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
                tauri::async_runtime::block_on(async move {
                    let db = database::Database::new(&database_url).await
                        .expect("Failed to initialize database");

                    app_handle.manage(db);
                });
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
