use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time;

use super::context_detection::{get_active_window_context, WindowContext};

pub struct ContextMonitor {
    last_context: Arc<Mutex<Option<WindowContext>>>,
    enabled: Arc<Mutex<bool>>,
}

impl ContextMonitor {
    pub fn new() -> Self {
        Self {
            last_context: Arc::new(Mutex::new(None)),
            enabled: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start(&self, app: AppHandle, interval_ms: u64) {
        let last_context = Arc::clone(&self.last_context);
        let enabled = Arc::clone(&self.enabled);

        // Set enabled to true
        *enabled.lock().unwrap() = true;

        // Use Tauri's async runtime
        tauri::async_runtime::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(interval_ms));

            loop {
                interval.tick().await;

                // Check if monitoring is enabled
                if !*enabled.lock().unwrap() {
                    continue;
                }

                // Try to get current window context
                match get_active_window_context() {
                    Ok(context) => {
                        let mut last = last_context.lock().unwrap();

                        // Check if context changed (different app or window)
                        let context_changed = match last.as_ref() {
                            Some(prev) => {
                                prev.app_name != context.app_name
                                || prev.window_title != context.window_title
                            }
                            None => true,
                        };

                        if context_changed {
                            *last = Some(context.clone());

                            // Emit event to frontend
                            let _ = app.emit("context-changed", context);
                        }
                    }
                    Err(_) => {
                        // Reset if can't detect
                        let mut last = last_context.lock().unwrap();
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
