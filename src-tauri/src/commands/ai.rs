use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AIInsights {
    pub generated_at: String,
    pub summary: Option<String>,
    pub struggle_areas: Option<Vec<String>>,
    pub suggestions: Option<Vec<String>>,
    pub learning_pattern: Option<String>,
}

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

async fn try_gemini_model(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<String, String> {
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

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Gemini API: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Gemini API error {}: {}", status, error_text));
    }

    let gemini_response: GeminiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

    let text = gemini_response
        .candidates
        .get(0)
        .and_then(|c| c.content.parts.get(0))
        .map(|p| p.text.clone())
        .ok_or_else(|| "No response text from Gemini".to_string())?;

    Ok(text)
}

#[tauri::command]
pub async fn call_gemini_api(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY not found in environment".to_string())?;

    // Fallback models in priority order
    let models = vec![
        ("gemini-2.5-flash", "Gemini 2.5 Flash"),
        ("gemini-2.5-flash-8b", "Gemini 2.5 Flash-Lite"),
        ("gemini-2.0-flash-exp", "Gemini 2.0 Flash"),
    ];

    let mut last_error = String::new();

    for (model, model_name) in &models {
        log::debug!("[AI] Trying model: {}", model_name);

        match try_gemini_model(&api_key, model, &prompt).await {
            Ok(response) => {
                log::info!("[AI] ✓ Success with {}", model_name);
                return Ok(response);
            }
            Err(e) => {
                log::info!("[AI] ✗ {} failed: {}", model_name, e);
                last_error = format!("{} failed: {}", model_name, e);

                // Check if it's a rate limit error (429) - try next model
                if e.contains("429") || e.contains("rate limit") || e.contains("quota") {
                    log::warn!("[AI] Rate limit detected, trying next model...");
                    continue;
                }

                // For other errors, also try next model
                continue;
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
