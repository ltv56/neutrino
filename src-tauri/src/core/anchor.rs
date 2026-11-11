#![allow(dead_code)] // first consumer (highlight anchors) lands in the next slice

use serde::{Deserialize, Serialize};

const CONTEXT_CHARS: usize = 32;

// Offsets count Unicode scalar values (chars), not bytes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Anchor {
    pub page: u32,
    pub exact: String,
    pub prefix: String,
    pub suffix: String,
    pub start: usize,
    pub end: usize,
}

pub fn make_anchor(page: u32, page_text: &str, start: usize, end: usize) -> Option<Anchor> {
    let chars: Vec<char> = page_text.chars().collect();
    if start >= end || end > chars.len() {
        return None;
    }
    Some(Anchor {
        page,
        exact: chars[start..end].iter().collect(),
        prefix: chars[start.saturating_sub(CONTEXT_CHARS)..start].iter().collect(),
        suffix: chars[end..(end + CONTEXT_CHARS).min(chars.len())].iter().collect(),
        start,
        end,
    })
}

// Finds the passage again after the page text changed (re-import, other extractor).
pub fn resolve(page_text: &str, anchor: &Anchor) -> Option<(usize, usize)> {
    let chars: Vec<char> = page_text.chars().collect();
    let exact: Vec<char> = anchor.exact.chars().collect();
    let prefix: Vec<char> = anchor.prefix.chars().collect();
    let suffix: Vec<char> = anchor.suffix.chars().collect();
    let n = exact.len();
    if n == 0 || n > chars.len() {
        return None;
    }

    // best context overlap wins; the old position breaks ties
    (0..=chars.len() - n)
        .filter(|&i| chars[i..i + n] == exact[..])
        .max_by_key(|&i| {
            let before = common_suffix_len(&chars[..i], &prefix);
            let after = common_prefix_len(&chars[i + n..], &suffix);
            (before + after, std::cmp::Reverse(i.abs_diff(anchor.start)))
        })
        .map(|i| (i, i + n))
}

fn common_prefix_len(a: &[char], b: &[char]) -> usize {
    a.iter().zip(b).take_while(|(x, y)| x == y).count()
}

fn common_suffix_len(a: &[char], b: &[char]) -> usize {
    a.iter().rev().zip(b.iter().rev()).take_while(|(x, y)| x == y).count()
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEXT: &str = "Attention is all you need. The model uses attention heads. Attention is cheap.";

    fn span_of(text: &str, needle: &str, nth: usize) -> (usize, usize) {
        let byte = text.match_indices(needle).nth(nth).unwrap().0;
        let start = text[..byte].chars().count();
        (start, start + needle.chars().count())
    }

    #[test]
    fn make_captures_exact_and_context() {
        let (s, e) = span_of(TEXT, "attention heads", 0);
        let a = make_anchor(3, TEXT, s, e).unwrap();
        assert_eq!(a.exact, "attention heads");
        assert_eq!(a.prefix, "is all you need. The model uses ");
        assert_eq!(a.suffix, ". Attention is cheap.");
        assert_eq!((a.page, a.start, a.end), (3, s, e));
    }

    #[test]
    fn context_is_capped() {
        let long = "x".repeat(100) + "NEEDLE" + &"y".repeat(100);
        let a = make_anchor(1, &long, 100, 106).unwrap();
        assert_eq!(a.prefix.chars().count(), 32);
        assert_eq!(a.suffix.chars().count(), 32);
    }

    #[test]
    fn make_rejects_bad_ranges() {
        assert!(make_anchor(1, "abc", 2, 2).is_none());
        assert!(make_anchor(1, "abc", 2, 1).is_none());
        assert!(make_anchor(1, "abc", 1, 9).is_none());
    }

    #[test]
    fn resolve_same_text_returns_original_span() {
        let (s, e) = span_of(TEXT, "Attention", 1);
        let a = make_anchor(1, TEXT, s, e).unwrap();
        assert_eq!(resolve(TEXT, &a), Some((s, e)));
    }

    #[test]
    fn resolve_follows_the_passage_when_text_shifts() {
        let (s, e) = span_of(TEXT, "Attention", 1);
        let a = make_anchor(1, TEXT, s, e).unwrap();
        let shifted = format!("Header line added by another extractor. {TEXT}");
        let (ns, ne) = resolve(&shifted, &a).unwrap();
        assert_eq!(shifted.chars().skip(ns).take(ne - ns).collect::<String>(), "Attention");
        assert_eq!((ns, ne), span_of(&shifted, "Attention", 1));
    }

    #[test]
    fn resolve_uses_context_to_pick_between_repeats() {
        let (s, e) = span_of(TEXT, "Attention", 0);
        let a = make_anchor(1, TEXT, s, e).unwrap();
        let shifted = format!("Intro. {TEXT}");
        assert_eq!(resolve(&shifted, &a), Some(span_of(&shifted, "Attention", 0)));
    }

    #[test]
    fn resolve_returns_none_when_passage_is_gone() {
        let (s, e) = span_of(TEXT, "attention heads", 0);
        let a = make_anchor(1, TEXT, s, e).unwrap();
        assert_eq!(resolve("Completely different page.", &a), None);
    }

    #[test]
    fn works_with_multibyte_text() {
        let text = "Mô hình dùng cơ chế chú ý để dịch. Chú ý là tất cả.";
        let (s, e) = span_of(text, "cơ chế chú ý", 0);
        let a = make_anchor(2, text, s, e).unwrap();
        assert_eq!(a.exact, "cơ chế chú ý");
        let shifted = format!("Lời mở đầu. {text}");
        let (ns, ne) = resolve(&shifted, &a).unwrap();
        assert_eq!(shifted.chars().skip(ns).take(ne - ns).collect::<String>(), "cơ chế chú ý");
    }
}
