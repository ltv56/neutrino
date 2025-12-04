use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardContent {
    pub content: String,
    pub content_type: ContentType,
    pub timestamp: i64,
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
}

impl ClipboardMonitor {
    pub fn new() -> Self {
        Self {
            last_content: Arc::new(Mutex::new(None)),
            enabled: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start(&self, app: AppHandle, interval_ms: u64) {
        let last_content = Arc::clone(&self.last_content);
        let enabled = Arc::clone(&self.enabled);

        // Set enabled to true
        *enabled.lock().unwrap() = true;

        // Use Tauri's async runtime instead of tokio::spawn
        tauri::async_runtime::spawn(async move {
            let mut clipboard = Clipboard::new().expect("Failed to initialize clipboard");
            let mut interval = time::interval(Duration::from_millis(interval_ms));

            loop {
                interval.tick().await;

                // Check if monitoring is enabled
                if !*enabled.lock().unwrap() {
                    continue;
                }

                // Try to read clipboard
                match clipboard.get_text() {
                    Ok(text) => {
                        let mut last = last_content.lock().unwrap();

                        // Check if content changed
                        if last.as_ref() != Some(&text) {
                            *last = Some(text.clone());

                            // Detect content type
                            let content_type = detect_content_type(&text);

                            let clipboard_content = ClipboardContent {
                                content: text,
                                content_type,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };

                            // Emit event to frontend
                            let _ = app.emit("clipboard-changed", clipboard_content);
                        }
                    }
                    Err(_) => {
                        // Clipboard might be empty or contain non-text data
                        // Reset last content if we can't read
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

    // Check if it's a URL
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return ContentType::Url;
    }

    // Check if it's a file path (Windows or Unix)
    if trimmed.contains(":\\") || trimmed.starts_with("/") || trimmed.starts_with("~/") {
        return ContentType::FilePath;
    }

    // Check if it looks like code (contains common code patterns)
    let code_indicators = [
        "function ", "const ", "let ", "var ", "import ", "export ",
        "class ", "def ", "fn ", "=>", "{", "}", "[]", "()",
        "if (", "for (", "while (", "return ", "public ", "private "
    ];

    if code_indicators.iter().any(|&indicator| trimmed.contains(indicator)) {
        return ContentType::Code;
    }

    // Default to text
    ContentType::Text
}
