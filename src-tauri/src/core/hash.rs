use std::io::{self, Read};

pub fn sha256_hex(reader: &mut impl Read) -> io::Result<String> {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_vectors() {
        assert_eq!(
            sha256_hex(&mut "abc".as_bytes()).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            sha256_hex(&mut "".as_bytes()).unwrap(),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn large_input_is_read_in_chunks() {
        let data = vec![7u8; 1_000_000];
        let whole = sha256_hex(&mut data.as_slice()).unwrap();
        assert_eq!(whole.len(), 64);
        assert_eq!(whole, sha256_hex(&mut data.as_slice()).unwrap());
    }
}
