use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tiny_http::{Response, Server, Header, StatusCode};

pub const SERVER_PORT: u16 = 43572;

pub fn start_http_server(app: AppHandle) {
    std::thread::spawn(move || {
        // Try to find an available port in range 43572-43582
        let mut server = None;
        let mut actual_port = SERVER_PORT;

        for port in SERVER_PORT..(SERVER_PORT + 10) {
            let addr = format!("127.0.0.1:{}", port);
            match Server::http(&addr) {
                Ok(s) => {
                    server = Some(s);
                    actual_port = port;
                    break;
                }
                Err(e) => {
                    if port == SERVER_PORT {
                        log::error!("[HTTP Server] Port {} busy, trying next port... ({})", port, e);
                    }
                    continue;
                }
            }
        }

        let server = match server {
            Some(s) => s,
            None => {
                log::error!("[HTTP Server] Failed to start: All ports {} to {} are busy", SERVER_PORT, SERVER_PORT + 9);
                log::error!("[HTTP Server] PDF streaming will not work. Please close other instances.");
                return;
            }
        };

        let addr = format!("127.0.0.1:{}", actual_port);
        log::info!("[HTTP Server] Started on http://{}", addr);
        log::info!("[HTTP Server] Security: Origin-based (tauri:// + localhost dev)");

        for request in server.incoming_requests() {
            let app_handle = app.clone();

            // Parse the request path
            let url_path = request.url().to_string();
            log::debug!("[HTTP Server] Request: {} {}", request.method(), url_path);

            // Security: Check Origin header (accept tauri:// and localhost dev server)
            let origin = request.headers().iter()
                .find(|h| h.field.equiv("Origin"))
                .map(|h| h.value.as_str());

            if let Some(origin_value) = origin {
                let is_valid_origin = origin_value.starts_with("tauri://")
                    || origin_value.starts_with("http://tauri.localhost")
                    || origin_value.starts_with("http://localhost:"); // Dev server

                if !is_valid_origin {
                    log::error!("[HTTP Server] Rejected request from unauthorized origin: {}", origin_value);
                    let response = Response::from_string("Forbidden: Invalid origin")
                        .with_status_code(StatusCode(403));
                    let _ = request.respond(response);
                    continue;
                }
            }

            // Handle CORS preflight (OPTIONS)
            if request.method().as_str() == "OPTIONS" {
                // Echo back the origin for dev/prod compatibility
                let cors_origin = origin.unwrap_or("tauri://localhost");

                let response = Response::from_string("")
                    .with_status_code(StatusCode(204))
                    .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], cors_origin.as_bytes()).unwrap())
                    .with_header(Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, OPTIONS"[..]).unwrap())
                    .with_header(Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Range, Content-Type"[..]).unwrap())
                    .with_header(Header::from_bytes(&b"Access-Control-Max-Age"[..], &b"86400"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }

            // Extract document ID from path like /documents/{document_id}
            if !url_path.starts_with("/documents/") {
                let response = Response::from_string("Not Found")
                    .with_status_code(StatusCode(404));
                let _ = request.respond(response);
                continue;
            }

            let document_id = &url_path[11..]; // Remove "/documents/"

            // Get the document file path from database
            let file_path = match get_document_path(&app_handle, document_id) {
                Ok(path) => path,
                Err(e) => {
                    log::error!("[HTTP Server] Error getting document path: {}", e);
                    let response = Response::from_string("Internal Server Error")
                        .with_status_code(StatusCode(500));
                    let _ = request.respond(response);
                    continue;
                }
            };

            if !file_path.exists() {
                let response = Response::from_string("File not found")
                    .with_status_code(StatusCode(404));
                let _ = request.respond(response);
                continue;
            }

            // Open the file
            let mut file = match File::open(&file_path) {
                Ok(f) => f,
                Err(e) => {
                    log::error!("[HTTP Server] Error opening file: {}", e);
                    let response = Response::from_string("Internal Server Error")
                        .with_status_code(StatusCode(500));
                    let _ = request.respond(response);
                    continue;
                }
            };

            let file_size = match file.metadata() {
                Ok(m) => m.len(),
                Err(e) => {
                    log::error!("[HTTP Server] Error getting file metadata: {}", e);
                    let response = Response::from_string("Internal Server Error")
                        .with_status_code(StatusCode(500));
                    let _ = request.respond(response);
                    continue;
                }
            };

            // CORS origin for responses (echo back the validated origin)
            let cors_origin = origin.unwrap_or("tauri://localhost");

            // Check for Range header
            let range_header = request.headers().iter()
                .find(|h| h.field.equiv("Range"));

            match range_header {
                Some(range) => {
                    // Parse range header (e.g., "bytes=0-1023")
                    let range_str = range.value.as_str();
                    if let Some((start, end)) = parse_range(range_str, file_size) {
                        let content_length = end - start + 1;

                        // Seek to start position
                        if let Err(e) = file.seek(SeekFrom::Start(start)) {
                            log::error!("[HTTP Server] Error seeking file: {}", e);
                            let response = Response::from_string("Internal Server Error")
                                .with_status_code(StatusCode(500));
                            let _ = request.respond(response);
                            continue;
                        }

                        log::debug!("[HTTP Server] Serving range: {}-{}/{} ({} bytes)", start, end, file_size, content_length);

                        // Return 206 Partial Content
                        let response = Response::new(StatusCode(206), vec![], file.take(content_length), Some(content_length as usize), None)
                            .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/pdf"[..]).unwrap())
                            .with_header(Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap())
                            .with_header(Header::from_bytes(
                                &b"Content-Range"[..],
                                format!("bytes {}-{}/{}", start, end, file_size).as_bytes()
                            ).unwrap())
                            .with_header(Header::from_bytes(
                                &b"Content-Length"[..],
                                content_length.to_string().as_bytes()
                            ).unwrap())
                            .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], cors_origin.as_bytes()).unwrap())
                            .with_header(Header::from_bytes(&b"Access-Control-Expose-Headers"[..], &b"Content-Range,Content-Length"[..]).unwrap());

                        let _ = request.respond(response);
                    } else {
                        // Invalid range
                        let response = Response::from_string("Range Not Satisfiable")
                            .with_status_code(StatusCode(416))
                            .with_header(Header::from_bytes(
                                &b"Content-Range"[..],
                                format!("bytes */{}", file_size).as_bytes()
                            ).unwrap());
                        let _ = request.respond(response);
                    }
                }
                None => {
                    // No range header, return full file
                    log::debug!("[HTTP Server] Serving full file: {} bytes", file_size);

                    let response = Response::new(StatusCode(200), vec![], file, Some(file_size as usize), None)
                        .with_header(Header::from_bytes(&b"Content-Type"[..], &b"application/pdf"[..]).unwrap())
                        .with_header(Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap())
                        .with_header(Header::from_bytes(
                            &b"Content-Length"[..],
                            file_size.to_string().as_bytes()
                        ).unwrap())
                        .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], cors_origin.as_bytes()).unwrap())
                        .with_header(Header::from_bytes(&b"Access-Control-Expose-Headers"[..], &b"Content-Length"[..]).unwrap());

                    let _ = request.respond(response);
                }
            }
        }
    });
}

fn parse_range(range_str: &str, file_size: u64) -> Option<(u64, u64)> {
    if file_size == 0 {
        return None;
    }
    let range_part = range_str.strip_prefix("bytes=")?;
    let (first, last) = range_part.split_once('-')?;
    let last_byte = file_size - 1;

    let (start, end) = if first.is_empty() {
        // bytes=-500: last 500 bytes
        let suffix: u64 = last.parse().ok()?;
        if suffix == 0 {
            return None;
        }
        (file_size.saturating_sub(suffix), last_byte)
    } else {
        let start: u64 = first.parse().ok()?;
        let end = if last.is_empty() { last_byte } else { last.parse::<u64>().ok()?.min(last_byte) };
        (start, end)
    };

    if start > end || start >= file_size {
        return None;
    }
    Some((start, end))
}

fn get_document_path(app: &AppHandle, document_id: &str) -> Result<PathBuf, String> {
    // Get document from database using the existing command
    use crate::database::Database;

    let db = app.state::<Database>();

    // Use Tauri's async runtime
    let result = tauri::async_runtime::block_on(async {
        sqlx::query_as::<_, (String,)>(
            "SELECT file_path FROM documents WHERE id = ?"
        )
        .bind(document_id)
        .fetch_one(db.pool())
        .await
    });

    match result {
        Ok((file_path,)) => Ok(PathBuf::from(file_path)),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::parse_range;

    #[test]
    fn zero_byte_file_has_no_satisfiable_range() {
        assert_eq!(parse_range("bytes=0-", 0), None);
        assert_eq!(parse_range("bytes=0-10", 0), None);
        assert_eq!(parse_range("bytes=-5", 0), None);
    }

    #[test]
    fn explicit_and_open_ranges() {
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(parse_range("bytes=900-", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=900-5000", 1000), Some((900, 999)));
    }

    #[test]
    fn suffix_range() {
        assert_eq!(parse_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=-5000", 1000), Some((0, 999)));
    }

    #[test]
    fn rejects_bad_ranges() {
        assert_eq!(parse_range("bytes=1000-", 1000), None);
        assert_eq!(parse_range("bytes=50-10", 1000), None);
        assert_eq!(parse_range("items=0-1", 1000), None);
        assert_eq!(parse_range("bytes=a-b", 1000), None);
        assert_eq!(parse_range("bytes=0-1,5-9", 1000), None);
    }
}
