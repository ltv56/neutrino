const SERVICE: &str = "neutrino";

fn entry(name: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, name).map_err(|e| e.to_string())
}

pub fn set_secret(name: &str, value: &str) -> Result<(), String> {
    entry(name)?.set_password(value).map_err(|e| e.to_string())
}

pub fn get_secret(name: &str) -> Result<Option<String>, String> {
    match entry(name)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete_secret(name: &str) -> Result<(), String> {
    match entry(name)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // talks to the real OS credential store; unique name, removed at the end
    #[test]
    fn roundtrip_overwrite_and_delete() {
        let name = format!("test-secret-{}", uuid::Uuid::new_v4());

        assert_eq!(get_secret(&name).unwrap(), None);

        set_secret(&name, "first").unwrap();
        assert_eq!(get_secret(&name).unwrap().as_deref(), Some("first"));

        set_secret(&name, "second").unwrap();
        assert_eq!(get_secret(&name).unwrap().as_deref(), Some("second"));

        delete_secret(&name).unwrap();
        assert_eq!(get_secret(&name).unwrap(), None);
    }

    #[test]
    fn deleting_a_missing_secret_is_ok() {
        let name = format!("test-secret-{}", uuid::Uuid::new_v4());
        assert!(delete_secret(&name).is_ok());
    }
}
