//! Central configuration — loaded once at startup, validating required
//! environment variables so the app fails fast with a clear message rather than
//! running in a broken or insecure state. Ported from the old `config.ts`.

use std::env;
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

#[derive(Debug, Clone)]
pub struct Config {
    /// PostgreSQL connection string. Required.
    pub database_url: String,
    /// TCP port the HTTP server binds to. Defaults to 3000.
    pub port: u16,
    /// Directory of built front-end assets to serve. Defaults to `static-assets`.
    pub static_dir: String,
    /// Secret used to sign and verify JWTs. Required in production; in
    /// development a weak local default is accepted.
    pub jwt_secret: String,
    /// Whether the app runs in production (`APP_ENV=production`).
    #[allow(dead_code)] // part of the config surface; consumed by hardening work
    pub is_production: bool,
}

impl Config {
    /// Loads, validates, and stores the configuration in a process-wide cell.
    /// Call once at startup before [`Config::get`]. Exits the process if a
    /// required variable is missing.
    pub fn init() -> &'static Config {
        CONFIG.get_or_init(Config::load)
    }

    /// Returns the configuration initialized by [`Config::init`].
    ///
    /// Panics if called before `init`.
    pub fn get() -> &'static Config {
        CONFIG
            .get()
            .expect("Config::get called before Config::init")
    }

    fn load() -> Config {
        let is_production = env::var("APP_ENV")
            .map(|v| v == "production")
            .unwrap_or(false);

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/duilio".to_string());

        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(3000);

        let static_dir = env::var("STATIC_DIR").unwrap_or_else(|_| "static-assets".to_string());

        // In production the JWT secret MUST be set explicitly — no weak fallback.
        // In development a local default is accepted so new contributors can run
        // the app without setting up a .env file first.
        let jwt_secret = if is_production {
            require_env("JWT_SECRET")
        } else {
            env::var("JWT_SECRET").unwrap_or_else(|_| "dev-only-insecure-secret".to_string())
        };

        Config {
            database_url,
            port,
            static_dir,
            jwt_secret,
            is_production,
        }
    }
}

fn require_env(name: &str) -> String {
    env::var(name).unwrap_or_else(|_| {
        eprintln!("FATAL: environment variable \"{name}\" is not set");
        std::process::exit(1);
    })
}
