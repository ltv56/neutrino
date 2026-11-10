#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum AiErrorKind {
    InvalidKey,
    RateLimited,
    Other,
}

pub fn classify_status(status: u16) -> AiErrorKind {
    match status {
        400 | 401 | 403 => AiErrorKind::InvalidKey,
        429 => AiErrorKind::RateLimited,
        _ => AiErrorKind::Other,
    }
}

// A bad key fails the same way on every model, so only the other kinds fall through.
pub fn should_try_next_model(kind: AiErrorKind) -> bool {
    kind != AiErrorKind::InvalidKey
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_problems() {
        for s in [400, 401, 403] {
            assert_eq!(classify_status(s), AiErrorKind::InvalidKey, "{s}");
        }
    }

    #[test]
    fn rate_limit() {
        assert_eq!(classify_status(429), AiErrorKind::RateLimited);
    }

    #[test]
    fn everything_else() {
        for s in [404, 500, 503] {
            assert_eq!(classify_status(s), AiErrorKind::Other, "{s}");
        }
    }

    #[test]
    fn fallback_policy() {
        assert!(!should_try_next_model(AiErrorKind::InvalidKey));
        assert!(should_try_next_model(AiErrorKind::RateLimited));
        assert!(should_try_next_model(AiErrorKind::Other));
    }
}
