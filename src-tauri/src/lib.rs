// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![allow(dead_code)]
use tauri::{Manager, Emitter, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};

mod database;
mod debug;
mod commands;
mod documents;
mod http_server;
mod services;

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

#[tauri::command]
async fn toggle_window_visibility(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    if window.is_visible().map_err(|e| e.to_string())? {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn toggle_floating_note(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    // Check if floating note window already exists
    if let Some(window) = app.get_webview_window("floating-note") {
        // If exists, toggle visibility
        if window.is_visible().map_err(|e| e.to_string())? {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            // Detect context BEFORE showing window
            if let Ok(context) = services::context_detection::get_active_window_context() {
                println!("[FloatingNote] Detected context: {} - {}", context.app_name, context.window_title);
                // Emit context to frontend
                let _ = app.emit("floating-note-context", context);
            }

            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    } else {
        // Detect context BEFORE creating window
        if let Ok(context) = services::context_detection::get_active_window_context() {
            println!("[FloatingNote] Detected context: {} - {}", context.app_name, context.window_title);
            // Emit context to frontend
            let _ = app.emit("floating-note-context", context);
        }

        // Create new floating note window
        let window = WebviewWindowBuilder::new(
            &app,
            "floating-note",
            WebviewUrl::App("floating-note".into())
        )
        .title("Quick Capture")
        .inner_size(410.0, 583.0)
        .min_inner_size(320.0, 450.0)
        .resizable(true)
        .decorations(false)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;

        // Show window after creation
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ========== Context Detection & Clipboard ==========

#[tauri::command]
fn get_window_context() -> Result<services::context_detection::WindowContext, String> {
    services::context_detection::get_active_window_context()
}

use once_cell::sync::Lazy;
use std::sync::Mutex;

static CONTEXT_MONITOR: Lazy<Mutex<services::context_monitor::ContextMonitor>> =
    Lazy::new(|| Mutex::new(services::context_monitor::ContextMonitor::new()));

fn get_context_monitor() -> &'static Mutex<services::context_monitor::ContextMonitor> {
    &CONTEXT_MONITOR
}

static CLIPBOARD_MONITOR: Lazy<Mutex<services::clipboard_monitor::ClipboardMonitor>> =
    Lazy::new(|| Mutex::new(services::clipboard_monitor::ClipboardMonitor::new()));

fn get_clipboard_monitor() -> &'static Mutex<services::clipboard_monitor::ClipboardMonitor> {
    &CLIPBOARD_MONITOR
}

#[tauri::command]
fn start_context_monitor(app: tauri::AppHandle, interval_ms: Option<u64>) -> Result<(), String> {
    let monitor = get_context_monitor().lock().unwrap();
    monitor.start(app, interval_ms.unwrap_or(1000)); // Check every 1 second
    Ok(())
}

#[tauri::command]
fn stop_context_monitor() -> Result<(), String> {
    let monitor = get_context_monitor().lock().unwrap();
    monitor.stop();
    Ok(())
}

#[tauri::command]
fn is_context_monitor_enabled() -> bool {
    let monitor = get_context_monitor().lock().unwrap();
    monitor.is_enabled()
}

#[tauri::command]
fn start_clipboard_monitor(app: tauri::AppHandle, interval_ms: Option<u64>) -> Result<(), String> {
    let monitor = get_clipboard_monitor().lock().unwrap();
    monitor.start(app, interval_ms.unwrap_or(1000));
    Ok(())
}

#[tauri::command]
fn stop_clipboard_monitor() -> Result<(), String> {
    let monitor = get_clipboard_monitor().lock().unwrap();
    monitor.stop();
    Ok(())
}

#[tauri::command]
fn is_clipboard_monitor_enabled() -> bool {
    let monitor = get_clipboard_monitor().lock().unwrap();
    monitor.is_enabled()
}

#[tauri::command]
fn get_current_clipboard() -> Result<Option<String>, String> {
    use arboard::Clipboard;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    match clipboard.get_text() {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When second instance is launched, show the main window from tray
            println!("[Single Instance] Another instance detected, restoring window from tray");
            if let Some(window) = app.get_webview_window("main") {
                // Restore window visibility
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
                
                // Flash taskbar to get user attention (Windows)
                let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
                
                println!("[Single Instance] Window restored successfully");
            } else {
                eprintln!("[Single Instance] Could not find main window!");
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::{ShortcutState, Code, Modifiers};

                    // Only respond to key press, not release
                    if event.state == ShortcutState::Pressed {
                        // Check which shortcut was pressed
                        let is_main_window_shortcut = shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyN);
                        let is_floating_note_shortcut = shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyF);

                        if is_main_window_shortcut {
                            // Toggle main window (Ctrl+Alt+N)
                            if let Some(window) = app.get_webview_window("main") {
                                if let Ok(is_visible) = window.is_visible() {
                                    if is_visible {
                                        let _ = window.hide();
                                    } else {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                        let _ = window.unminimize();
                                    }
                                }
                            }
                        } else if is_floating_note_shortcut {
                            // Toggle floating note window (Ctrl+Shift+F)
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = toggle_floating_note(app_handle).await {
                                    eprintln!("[FloatingNote] Error: {}", e);
                                }
                            });
                        }
                    }
                })
                .build()
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_available_memory, // For future cache optimization
            show_main_window,
            toggle_window_visibility,
            toggle_floating_note,

            // ========== Context Detection & Clipboard ==========
            get_window_context,
            start_context_monitor,
            stop_context_monitor,
            is_context_monitor_enabled,
            start_clipboard_monitor,
            stop_clipboard_monitor,
            is_clipboard_monitor_enabled,
            get_current_clipboard,

            // ========== Session Management ==========
            commands::create_research_session,
            commands::get_research_sessions,
            commands::delete_research_session,
            commands::update_research_session,
            commands::save_context_snapshot,
            commands::get_context_snapshot,

            // ========== Document Management ==========
            commands::create_document,
            commands::check_duplicate_document,
            commands::delete_all_documents,
            commands::delete_document,
            commands::get_all_documents,
            commands::get_document_by_id,
            commands::get_documents_by_session,
            commands::update_document_reading_progress,
            commands::search_documents,
            commands::search_documents_with_context,

            // ========== Session-Document Relationships ==========
            commands::add_document_to_session,
            commands::remove_document_from_session,
            commands::update_session_document_notes,

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
            commands::get_recent_highlights_by_session,
            commands::link_highlight_to_note,
            commands::unlink_highlight_from_note,
            commands::get_highlights_by_linked_note,

            // ========== Note Management ==========
            commands::create_note,
            commands::get_note,
            commands::get_notes,
            commands::update_note,
            commands::delete_note,
            commands::search_notes,

            // ========== Folder Management ==========
            commands::create_folder,
            commands::get_folders,
            commands::get_folder,
            commands::update_folder,
            commands::delete_folder,

            // ========== Note Links (Bidirectional Linking) ==========
            commands::create_note_link,
            commands::resolve_note_link,
            commands::get_backlinks,
            commands::get_document_backlinks,
            commands::search_link_targets,
            commands::sync_note_links,
            commands::delete_note_link,

            // ========== Concepts & Cross-Reference ==========
            commands::create_concept,
            commands::link_concept_to_document,
            commands::link_concept_to_note,
            commands::get_cross_references,
            commands::get_all_concepts,

            // ========== Transactions ==========
            commands::create_session_with_documents,

            // ========== Debug/Admin ==========
            commands::clear_all_data,
            commands::get_database_stats,
            commands::check_database_integrity,
            commands::vacuum_database,
            commands::get_fts_debug_info,
            commands::rebuild_fts_index,

            // ========== AI Integration ==========
            commands::call_gemini_api,
            commands::test_gemini_connection,
        ])
        .setup(|app| {
            let setup_start = std::time::Instant::now();
            println!("[Setup] Starting...");

            // Load .env file for environment variables (like GEMINI_API_KEY)
            // Try src-tauri/.env first (production/secure), then fallback to root .env (dev)
            let env_path = std::path::Path::new("src-tauri/.env");
            if env_path.exists() {
                match dotenvy::from_path(env_path) {
                    Ok(_) => println!("[Setup] .env file loaded from src-tauri/.env"),
                    Err(e) => println!("[Setup] Warning: Could not load src-tauri/.env: {}", e),
                }
            } else if let Err(e) = dotenvy::dotenv() {
                println!("[Setup] Warning: Could not load .env file: {}", e);
            } else {
                println!("[Setup] .env file loaded from root");
            }

            println!("[Vite] Building UI...");

            // Initialize database SYNCHRONOUSLY before anything else
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let database_path = app_data_dir.join("neutrino.db");
            let database_url = format!("sqlite://{}", database_path.display());

            // Block and wait for database to be ready
            let db_start = std::time::Instant::now();
            let db = tauri::async_runtime::block_on(async {
                database::Database::new(&database_url).await
                    .expect("Failed to initialize database")
            });
            app.manage(db);
            println!("[Setup] Database initialized in {}ms", db_start.elapsed().as_millis());

            // Start HTTP server for PDF streaming
            http_server::start_http_server(app.handle().clone());
            println!("[Setup] HTTP server started");

            // Setup system tray
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>).unwrap();
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_item, &quit_item]).unwrap();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|_tray, event| {
                    if let TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            // Double-click to show window (handled by TrayIconEvent::DoubleClick in v2)
                        }
                    }
                })
                .build(app)?;
            println!("[Setup] System tray initialized");

            // Register global shortcuts using the correct API
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

            // Register Ctrl+Alt+N for main window
            let main_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyN);
            println!("[Setup] Registering global shortcut: Ctrl+Alt+N");
            match app.global_shortcut().register(main_shortcut) {
                Ok(_) => println!("[Setup] ✓ Global shortcut (Ctrl+Alt+N) registered successfully!"),
                Err(e) => eprintln!("[Setup] ✗ Failed to register shortcut: {}", e),
            }

            // Register Ctrl+Shift+F for floating note
            let floating_note_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyF);
            println!("[Setup] Registering global shortcut: Ctrl+Shift+F");
            match app.global_shortcut().register(floating_note_shortcut) {
                Ok(_) => println!("[Setup] ✓ Global shortcut (Ctrl+Shift+F) registered successfully!"),
                Err(e) => eprintln!("[Setup] ✗ Failed to register shortcut: {}", e),
            }

            // Context monitor is available but NOT started automatically
            // Start it manually from Debug Overlay for testing
            println!("[Setup] Context monitor available (start from Debug Overlay)");

            // Start clipboard monitor automatically (real-time event-driven)
            let clipboard_monitor = get_clipboard_monitor().lock().unwrap();
            clipboard_monitor.start(app.handle().clone(), 1000);
            println!("[Setup] Clipboard monitor started (real-time)");

            println!("[Setup] Complete in {}ms", setup_start.elapsed().as_millis());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Prevent app from exiting when window is closed
            // Instead, hide the window so app continues running in tray
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Don't close the window, just hide it
                // This keeps the app running in the background
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
