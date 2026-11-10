use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContentType {
    Text,
    Code,
    Url,
    FilePath,
    Unknown,
}

const CODE_LINE_STARTS: [&str; 12] = [
    "function ", "const ", "let ", "var ", "import ", "export ",
    "class ", "def ", "fn ", "public ", "private ", "return ",
];

const CODE_MARKERS: [&str; 6] = ["=>", "()", "){", ") {", "};", ");"];

// Bare words like "let" or "class" are common in prose, so a keyword only counts
// at the start of a line and together with a code-like symbol on that line.
fn looks_like_code(text: &str) -> bool {
    if CODE_MARKERS.iter().any(|m| text.contains(m)) {
        return true;
    }
    if text.contains('{') && text.contains('}') {
        return true;
    }
    text.lines().any(|line| {
        let line = line.trim_start();
        CODE_LINE_STARTS.iter().any(|k| line.starts_with(k))
            && line.contains(|c| matches!(c, '=' | '(' | '{' | ';'))
    })
}

pub fn detect_content_type(text: &str) -> ContentType {
    let trimmed = text.trim();

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return ContentType::Url;
    }

    if trimmed.contains(":\\") || trimmed.starts_with('/') || trimmed.starts_with("~/") {
        return ContentType::FilePath;
    }

    if looks_like_code(trimmed) {
        return ContentType::Code;
    }

    ContentType::Text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn urls() {
        assert_eq!(detect_content_type("https://example.com/a?b=1"), ContentType::Url);
        assert_eq!(detect_content_type("  http://localhost:3000 "), ContentType::Url);
    }

    #[test]
    fn file_paths() {
        assert_eq!(detect_content_type(r"C:\Users\me\paper.pdf"), ContentType::FilePath);
        assert_eq!(detect_content_type("/etc/hosts"), ContentType::FilePath);
        assert_eq!(detect_content_type("~/notes/a.md"), ContentType::FilePath);
    }

    #[test]
    fn code_snippets() {
        for s in [
            "const x = 1;",
            "fn main() {}",
            "def foo(x):\n    return x",
            "items.map(x => x * 2)",
            "{\"a\": 1}",
            "foo()",
            "import os\nprint(os.getcwd())",
        ] {
            assert_eq!(detect_content_type(s), ContentType::Code, "{s}");
        }
    }

    #[test]
    fn prose_with_code_words_stays_text() {
        for s in [
            "let me know when you are ready",
            "Import duties rose last year",
            "class notes are due Friday",
            "return to the main page",
            "A plain sentence.",
        ] {
            assert_eq!(detect_content_type(s), ContentType::Text, "{s}");
        }
    }
}
