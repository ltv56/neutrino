// Prefix query for FTS5; strips operator chars so user input can't break the syntax.
pub fn to_prefix_query(query: &str) -> String {
    query
        .split_whitespace()
        .filter_map(|word| {
            let cleaned: String = word
                .chars()
                .filter(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            (!cleaned.is_empty()).then(|| format!("{}*", cleaned))
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefixes_each_word() {
        assert_eq!(to_prefix_query("hello world"), "hello* world*");
    }

    #[test]
    fn strips_fts_operators() {
        assert_eq!(to_prefix_query("foo-bar \"baz\" (x)"), "foobar* baz* x*");
    }

    #[test]
    fn empty_and_symbol_only_input() {
        assert_eq!(to_prefix_query("   "), "");
        assert_eq!(to_prefix_query("-- ** \"\""), "");
    }

    #[test]
    fn keeps_unicode_and_underscore() {
        assert_eq!(to_prefix_query("café_1 Việt"), "café_1* Việt*");
    }
}
