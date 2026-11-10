use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use super::context_detection::{self, WindowContext};
use crate::core::listener_state::ListenerState;

#[cfg(target_os = "windows")]
use clipboard_master::{Master, ClipboardHandler, CallbackResult, Shutdown};

#[cfg(not(target_os = "windows"))]
type Shutdown = ();

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
    listener: Arc<Mutex<ListenerState<Shutdown>>>,
}

impl ClipboardMonitor {
    pub fn new() -> Self {
        Self {
            last_content: Arc::new(Mutex::new(None)),
            listener: Arc::new(Mutex::new(ListenerState::new())),
        }
    }

    #[cfg(target_os = "windows")]
    pub fn start(&self, app: AppHandle, _interval_ms: u64) {
        let epoch = match self.listener.lock().unwrap().begin() {
            Some(e) => e,
            None => {
                log::debug!("[ClipboardMonitor] Already running, start ignored");
                return;
            }
        };

        let last_content = Arc::clone(&self.last_content);
        let listener = Arc::clone(&self.listener);

        // Initialize with current clipboard to prevent emitting old content
        if let Ok(mut clipboard) = Clipboard::new() {
            if let Ok(text) = clipboard.get_text() {
                *last_content.lock().unwrap() = Some(text);
            }
        }

        std::thread::spawn(move || {
            let handler = ClipboardChangeHandler { app, last_content };

            match Master::new(handler) {
                Ok(mut master) => {
                    // a stopped or replaced listener gets its handle back and shuts down at once
                    let stale = listener.lock().unwrap().attach(epoch, master.shutdown_channel());
                    drop(stale);
                    log::info!("[ClipboardMonitor] Clipboard listener started (real-time)");
                    let _ = master.run();
                    log::info!("[ClipboardMonitor] Clipboard listener stopped");
                }
                Err(e) => {
                    log::error!("[ClipboardMonitor] Failed to start clipboard listener: {}", e);
                }
            }
            listener.lock().unwrap().finished(epoch);
        });
    }

    #[cfg(not(target_os = "windows"))]
    pub fn start(&self, _app: AppHandle, _interval_ms: u64) {
        log::error!("[ClipboardMonitor] Not supported on this platform");
    }

    pub fn stop(&self) {
        // dropping the handle wakes the listener thread and ends its loop
        let handle = self.listener.lock().unwrap().stop();
        drop(handle);
    }

    pub fn is_enabled(&self) -> bool {
        self.listener.lock().unwrap().is_running()
    }
}

#[cfg(target_os = "windows")]
struct ClipboardChangeHandler {
    app: AppHandle,
    last_content: Arc<Mutex<Option<String>>>,
}

#[cfg(target_os = "windows")]
impl ClipboardHandler for ClipboardChangeHandler {
    fn on_clipboard_change(&mut self) -> CallbackResult {
        // Read clipboard in separate thread to prevent blocking
        let app = self.app.clone();
        let last_content = Arc::clone(&self.last_content);

        std::thread::spawn(move || {
            // Create new Clipboard instance for each read
            let clipboard_result = Clipboard::new();
            if clipboard_result.is_err() {
                return;
            }

            let mut clipboard = clipboard_result.unwrap();

            match clipboard.get_text() {
                Ok(text) => {
                    let mut last = last_content.lock().unwrap();

                    if last.as_ref() != Some(&text) {
                        *last = Some(text.clone());

                        let content_type = detect_content_type(&text);
                        let context = context_detection::get_active_window_context().ok();

                        if let Some(ref ctx) = context {
                            log::debug!("[Clipboard] Detected copy from: {} - {}", ctx.app_name, ctx.window_title);
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
        });

        CallbackResult::Next
    }

    fn on_clipboard_error(&mut self, error: std::io::Error) -> CallbackResult {
        log::error!("[ClipboardMonitor] Error: {}", error);
        CallbackResult::Next
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

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use clipboard_master::{CallbackResult, ClipboardHandler, Master};
    use std::sync::mpsc;
    use std::time::Duration;

    struct Noop;
    impl ClipboardHandler for Noop {
        fn on_clipboard_change(&mut self) -> CallbackResult {
            CallbackResult::Next
        }
    }

    #[test]
    fn dropping_shutdown_handle_ends_listener_without_a_clipboard_change() {
        let (tx, rx) = mpsc::channel();
        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let mut master = Master::new(Noop).unwrap();
            tx.send(master.shutdown_channel()).unwrap();
            let _ = master.run();
            done_tx.send(()).unwrap();
        });
        let handle = rx.recv_timeout(Duration::from_secs(5)).unwrap();
        drop(handle);
        assert!(done_rx.recv_timeout(Duration::from_secs(5)).is_ok());
    }
}
