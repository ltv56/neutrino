use std::path::PathBuf;

// NEUTRINO_DATA_DIR lets tests and dev runs use a scratch dir instead of the real app data.
pub fn pick_data_dir(override_dir: Option<&str>, default: PathBuf) -> PathBuf {
    match override_dir.map(str::trim) {
        Some(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => default,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn override_wins() {
        assert_eq!(pick_data_dir(Some("D:/scratch"), PathBuf::from("C:/real")), PathBuf::from("D:/scratch"));
    }

    #[test]
    fn missing_or_blank_override_uses_default() {
        let d = PathBuf::from("C:/real");
        assert_eq!(pick_data_dir(None, d.clone()), d);
        assert_eq!(pick_data_dir(Some(""), d.clone()), d);
        assert_eq!(pick_data_dir(Some("   "), d.clone()), d);
    }

    #[test]
    fn override_is_trimmed() {
        assert_eq!(pick_data_dir(Some("  D:/scratch "), PathBuf::from("x")), PathBuf::from("D:/scratch"));
    }
}
