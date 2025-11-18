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
                        eprintln!("[HTTP Server] Port {} busy, trying next port... ({})", port, e);
                    }
                    continue;
                }
            }
        }

        let server = match server {
            Some(s) => s,
            None => {
                eprintln!("[HTTP Server] Failed to start: All ports {} to {} are busy", SERVER_PORT, SERVER_PORT + 9);
                eprintln!("[HTTP Server] PDF streaming will not work. Please close other instances.");
                return;
            }
        };

        let addr = format!("127.0.0.1:{}", actual_port);
        println!("[HTTP Server] Started on http://{}", addr);
        println!("[HTTP Server] Security: Origin-based (tauri:// + localhost dev)");

        for request in server.incoming_requests() {
            let app_handle = app.clone();

            // Parse the request path
            let url_path = request.url().to_string();
            println!("[HTTP Server] Request: {} {}", request.method(), url_path);

            // Security: Check Origin header (accept tauri:// and localhost dev server)
            let origin = request.headers().iter()
                .find(|h| h.field.equiv("Origin"))
                .map(|h| h.value.as_str());

            if let Some(origin_value) = origin {
                let is_valid_origin = origin_value.starts_with("tauri://")
                    || origin_value.starts_with("http://tauri.localhost")
                    || origin_value.starts_with("http://localhost:"); // Dev server

                if !is_valid_origin {
                    eprintln!("[HTTP Server] Rejected request from unauthorized origin: {}", origin_value);
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
                    eprintln!("[HTTP Server] Error getting document path: {}", e);
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
                    eprintln!("[HTTP Server] Error opening file: {}", e);
                    let response = Response::from_string("Internal Server Error")
                        .with_status_code(StatusCode(500));
                    let _ = request.respond(response);
                    continue;
                }
            };

            let file_size = match file.metadata() {
                Ok(m) => m.len(),
                Err(e) => {
                    eprintln!("[HTTP Server] Error getting file metadata: {}", e);
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
                            eprintln!("[HTTP Server] Error seeking file: {}", e);
                            let response = Response::from_string("Internal Server Error")
                                .with_status_code(StatusCode(500));
                            let _ = request.respond(response);
                            continue;
                        }

                        // Read the requested chunk
                        let mut buffer = vec![0u8; content_length as usize];
                        if let Err(e) = file.read_exact(&mut buffer) {
                            eprintln!("[HTTP Server] Error reading file: {}", e);
                            let response = Response::from_string("Internal Server Error")
                                .with_status_code(StatusCode(500));
                            let _ = request.respond(response);
                            continue;
                        }

                        println!("[HTTP Server] Serving range: {}-{}/{} ({} bytes)", start, end, file_size, content_length);

                        // Return 206 Partial Content
                        let response = Response::from_data(buffer)
                            .with_status_code(StatusCode(206))
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
                    let mut buffer = Vec::new();
                    if let Err(e) = file.read_to_end(&mut buffer) {
                        eprintln!("[HTTP Server] Error reading file: {}", e);
                        let response = Response::from_string("Internal Server Error")
                            .with_status_code(StatusCode(500));
                        let _ = request.respond(response);
                        continue;
                    }

                    println!("[HTTP Server] Serving full file: {} bytes", buffer.len());

                    let response = Response::from_data(buffer)
                        .with_status_code(StatusCode(200))
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
    // Parse "bytes=start-end" format
    if !range_str.starts_with("bytes=") {
        return None;
    }

    let range_part = &range_str[6..]; // Remove "bytes="
    let parts: Vec<&str> = range_part.split('-').collect();

    if parts.len() != 2 {
        return None;
    }

    let start = if parts[0].is_empty() {
        // bytes=-500 means last 500 bytes
        if let Ok(suffix_length) = parts[1].parse::<u64>() {
            file_size.saturating_sub(suffix_length)
        } else {
            return None;
        }
    } else {
        parts[0].parse::<u64>().ok()?
    };

    let end = if parts[1].is_empty() {
        // bytes=500- means from 500 to end
        file_size - 1
    } else {
        parts[1].parse::<u64>().ok()?.min(file_size - 1)
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
