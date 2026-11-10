use std::sync::OnceLock;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use crate::core::ai_error::{classify_status, should_try_next_model, AiErrorKind};

#[derive(Debug, Serialize, Deserialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GenerationConfig,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GenerationConfig {
    temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: i32,
    #[serde(rename = "responseMimeType")]
    response_mime_type: String,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: GeminiCandidateContent,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidateContent {
    parts: Vec<GeminiPart>,
}

const GEMINI_MODELS: [(&str, &str); 3] = [
    ("gemini-2.5-flash", "Gemini 2.5 Flash"),
    ("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite"),
    ("gemini-2.0-flash", "Gemini 2.0 Flash"),
];

struct GeminiError {
    kind: AiErrorKind,
    message: String,
}

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(60))
            .build()
            .expect("failed to build http client")
    })
}

async fn try_gemini_model(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<String, GeminiError> {
    let other = |message: String| GeminiError { kind: AiErrorKind::Other, message };
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model
    );

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: prompt.to_string() }],
        }],
        generation_config: GenerationConfig {
            temperature: 0.3,
            max_output_tokens: 2048,
            response_mime_type: "application/json".to_string(),
        },
    };

    let response = http_client()
        .post(&url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| other(format!("Failed to call Gemini API: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(GeminiError {
            kind: classify_status(status.as_u16()),
            message: format!("Gemini API error {}: {}", status, error_text),
        });
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| other(format!("Failed to parse Gemini response: {}", e)))?;

    let text = gemini_response
        .candidates
        .get(0)
        .and_then(|c| c.content.parts.get(0))
        .map(|p| p.text.clone())
        .ok_or_else(|| other("No response text from Gemini".to_string()))?;

    Ok(text)
}

#[tauri::command]
pub async fn call_gemini_api(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY not found in environment".to_string())?;

    let mut last_error = String::new();

    for (model, model_name) in &GEMINI_MODELS {
        log::debug!("[AI] Trying model: {}", model_name);

        match try_gemini_model(&api_key, model, &prompt).await {
            Ok(response) => {
                log::info!("[AI] ✓ Success with {}", model_name);
                return Ok(response);
            }
            Err(e) => {
                log::info!("[AI] ✗ {} failed: {}", model_name, e.message);
                if !should_try_next_model(e.kind) {
                    return Err(format!("Gemini rejected the API key: {}", e.message));
                }
                if e.kind == AiErrorKind::RateLimited {
                    log::warn!("[AI] Rate limited, trying next model...");
                }
                last_error = format!("{} failed: {}", model_name, e.message);
            }
        }
    }

    Err(format!("All Gemini models failed. Last error: {}", last_error))
}

#[tauri::command]
pub async fn test_gemini_connection() -> Result<String, String> {
    let test_prompt = "Respond with exactly: 'Connection successful!'";
    call_gemini_api(test_prompt.to_string()).await
}
