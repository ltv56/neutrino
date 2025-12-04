use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowContext {
    pub app_name: String,
    pub window_title: String,
    pub timestamp: i64,
}

#[cfg(target_os = "windows")]
pub fn get_active_window_context() -> Result<WindowContext, String> {
    use windows::Win32::Foundation::{HWND, MAX_PATH};
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_WIN32};
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
    use windows::core::PWSTR;

    unsafe {
        // Get foreground window handle
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return Err("No foreground window found".to_string());
        }

        // Get window title
        let mut title_buffer = [0u16; 512];
        let title_len = GetWindowTextW(hwnd, &mut title_buffer);
        let window_title = if title_len > 0 {
            String::from_utf16_lossy(&title_buffer[..title_len as usize])
        } else {
            String::new()
        };

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        // Get process name
        let app_name = if process_id != 0 {
            match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) {
                Ok(process_handle) => {
                    let mut path_buffer = [0u16; MAX_PATH as usize];
                    let mut size = MAX_PATH;

                    match QueryFullProcessImageNameW(
                        process_handle,
                        PROCESS_NAME_WIN32,
                        PWSTR(path_buffer.as_mut_ptr()),
                        &mut size,
                    ) {
                        Ok(_) => {
                            let full_path = String::from_utf16_lossy(&path_buffer[..size as usize]);
                            // Extract just the executable name
                            full_path
                                .split('\\')
                                .last()
                                .unwrap_or("Unknown")
                                .to_string()
                        }
                        Err(_) => "Unknown".to_string(),
                    }
                }
                Err(_) => "Unknown".to_string(),
            }
        } else {
            "Unknown".to_string()
        };

        Ok(WindowContext {
            app_name,
            window_title,
            timestamp: chrono::Utc::now().timestamp_millis(),
        })
    }
}

#[cfg(target_os = "macos")]
pub fn get_active_window_context() -> Result<WindowContext, String> {
    // TODO: Implement for macOS using NSWorkspace
    Err("macOS context detection not yet implemented".to_string())
}

#[cfg(target_os = "linux")]
pub fn get_active_window_context() -> Result<WindowContext, String> {
    // TODO: Implement for Linux using X11
    Err("Linux context detection not yet implemented".to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn get_active_window_context() -> Result<WindowContext, String> {
    Err("Unsupported platform".to_string())
}
