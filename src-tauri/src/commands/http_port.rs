#[tauri::command]
pub fn get_http_server_port() -> Result<u16, String> {
    crate::http_server::active_port().ok_or_else(|| "PDF server is not running".to_string())
}
