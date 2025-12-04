use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time;
use super::context_detection::{self, WindowContext};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardContent {
    pub content: String,
    pub content_type: ContentType,
    pub timestamp: i64,
    pub context: Option<WindowContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContentType {
    Text,
    Code,
    Url,
    FilePath,
    Unknown,
}

pub struct ClipboardMonitor {
    last_content: Arc<Mutex<Option<String>>>,
    enabled: Arc<Mutex<bool>>,
    generation: Arc<Mutex<u64>>, // Track which loop is current
}

impl ClipboardMonitor {
    pub fn new() -> Self {
        Self {
            last_content: Arc::new(Mutex::new(None)),
            enabled: Arc::new(Mutex::new(false)),
            generation: Arc::new(Mutex::new(0)),
        }
    }

    pub fn start(&self, app: AppHandle, interval_ms: u64) {
        let last_content = Arc::clone(&self.last_content);
        let enabled = Arc::clone(&self.enabled);
        let generation = Arc::clone(&self.generation);

        let current_gen = {
            let mut gen_lock = generation.lock().unwrap();
            *gen_lock += 1;
            *gen_lock
        };

        // Initialize with current clipboard to prevent emitting old content
        if let Ok(mut clipboard) = Clipboard::new() {
            if let Ok(text) = clipboard.get_text() {
                *last_content.lock().unwrap() = Some(text);
            }
        }

        *enabled.lock().unwrap() = true;

        tauri::async_runtime::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(interval_ms));

            loop {
                interval.tick().await;

                if *generation.lock().unwrap() != current_gen {
                    break;
                }

                if !*enabled.lock().unwrap() {
                    break;
                }

                // Create new instance each read to prevent heap corruption
                let clipboard_result = Clipboard::new();
                if clipboard_result.is_err() {
                    continue;
                }

                let mut clipboard = clipboard_result.unwrap();

                match clipboard.get_text() {
                    Ok(text) => {
                        let mut last = last_content.lock().unwrap();

                        if last.as_ref() != Some(&text) {
                            *last = Some(text.clone());

                            let content_type = detect_content_type(&text);

                            // NOTE: Context may be inaccurate if user switched apps after copying
                            let context = context_detection::get_active_window_context().ok();

                            if let Some(ref ctx) = context {
                                println!("[Clipboard] Detected copy from: {} - {}", ctx.app_name, ctx.window_title);
                            }

                            let clipboard_content = ClipboardContent {
                                content: text,
                                content_type,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                                context,
                            };

                            let _ = app.emit("clipboard-changed", clipboard_content);
                        }
                    }
                    Err(_) => {
                        let mut last = last_content.lock().unwrap();
                        *last = None;
                    }
                }
            }
        });
    }

    pub fn stop(&self) {
        *self.enabled.lock().unwrap() = false;
    }

    pub fn is_enabled(&self) -> bool {
        *self.enabled.lock().unwrap()
    }
}

fn detect_content_type(text: &str) -> ContentType {
    let trimmed = text.trim();

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return ContentType::Url;
    }

    if trimmed.contains(":\\") || trimmed.starts_with("/") || trimmed.starts_with("~/") {
        return ContentType::FilePath;
    }

    let code_indicators = [
        "function ", "const ", "let ", "var ", "import ", "export ",
        "class ", "def ", "fn ", "=>", "{", "}", "[]", "()",
        "if (", "for (", "while (", "return ", "public ", "private "
    ];

    if code_indicators.iter().any(|&indicator| trimmed.contains(indicator)) {
        return ContentType::Code;
    }

    ContentType::Text
}
