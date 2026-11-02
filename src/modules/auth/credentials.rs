/// The shortest password the sign-up form accepts. The API enforces the same rule.
const MIN_PASSWORD: usize = 6;
/// bcrypt reads only the first 72 bytes: a longer password would be cut silently.
const MAX_PASSWORD_BYTES: usize = 72;

/// Checks the sign-up data and returns the email without surrounding spaces.
pub fn check_registration(email: &str, password: &str) -> Result<String, &'static str> {
    let email = email.trim();

    if email.is_empty() {
        return Err("Email is required");
    }
    if !looks_like_email(email) {
        return Err("Email is not valid");
    }
    if password.is_empty() {
        return Err("Password is required");
    }
    if password.chars().count() < MIN_PASSWORD {
        return Err("Password must have at least 6 characters");
    }
    if password.len() > MAX_PASSWORD_BYTES {
        return Err("Password is too long (72 bytes at most)");
    }

    Ok(email.to_string())
}

/// A basic shape check: one `@`, text before it, and a domain with a dot inside.
fn looks_like_email(email: &str) -> bool {
    let Some((local, domain)) = email.split_once('@') else {
        return false;
    };

    !local.is_empty()
        && !email.chars().any(char::is_whitespace)
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_a_normal_email_and_password() {
        assert_eq!(
            check_registration("a@x.com", "secret1"),
            Ok("a@x.com".to_string())
        );
    }

    #[test]
    fn trims_the_email() {
        assert_eq!(
            check_registration("  a@x.com ", "secret1"),
            Ok("a@x.com".to_string())
        );
    }

    #[test]
    fn requires_an_email() {
        for email in ["", "   "] {
            assert_eq!(
                check_registration(email, "secret1"),
                Err("Email is required")
            );
        }
    }

    #[test]
    fn rejects_an_email_without_the_right_shape() {
        for email in [
            "plain",
            "@x.com",
            "a@",
            "a@x",
            "a@.com",
            "a@x.",
            "a b@x.com",
            "a@@x.com",
            "a@x@y.com",
        ] {
            assert_eq!(
                check_registration(email, "secret1"),
                Err("Email is not valid"),
                "{email}"
            );
        }
    }

    #[test]
    fn requires_a_password() {
        assert_eq!(
            check_registration("a@x.com", ""),
            Err("Password is required")
        );
    }

    #[test]
    fn rejects_a_short_password() {
        assert_eq!(
            check_registration("a@x.com", "12345"),
            Err("Password must have at least 6 characters")
        );
    }

    #[test]
    fn rejects_a_password_that_bcrypt_would_cut() {
        let long = "x".repeat(73);

        assert_eq!(
            check_registration("a@x.com", &long),
            Err("Password is too long (72 bytes at most)")
        );
        assert!(check_registration("a@x.com", &"x".repeat(72)).is_ok());
    }
}
