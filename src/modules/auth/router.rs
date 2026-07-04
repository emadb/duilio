use std::sync::Arc;
use std::time::Duration;

use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};

use crate::modules::{
    EntityId, ErrorResponse, RequestResult,
    auth::repository::{AuthRepository, User},
    internal_server_error,
};

#[derive(Deserialize)]
struct LoginReq {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginUser {
    id: EntityId,
    email: String,
}

#[derive(Serialize)]
struct LoginRes {
    token: String,
    user: LoginUser,
}

#[derive(Deserialize)]
struct RegisterReq {
    email: String,
    password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RegisterRes {
    id: EntityId,
    email: String,
    created_at: DateTime<Utc>,
}

async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginReq>,
) -> RequestResult<LoginRes> {
    let repo = AuthRepository::new(pool);
    match repo.get_by_email(payload.email).await {
        Ok(Some(user)) if user.password_match(payload.password) => {
            let token = crate::auth_middleware::create_token(user.id.clone());
            RequestResult::Success((
                StatusCode::OK,
                LoginRes {
                    token,
                    user: LoginUser {
                        id: user.id,
                        email: user.email,
                    },
                },
            ))
        }
        Ok(_) => RequestResult::Error((
            StatusCode::UNAUTHORIZED,
            ErrorResponse::new("Invalid credentials".to_string()),
        )),
        Err(e) => internal_server_error(e.to_string()),
    }
}

async fn register(
    State(pool): State<PgPool>,
    Json(payload): Json<RegisterReq>,
) -> RequestResult<RegisterRes> {
    let repo = AuthRepository::new(pool);

    match repo.get_by_email(payload.email.clone()).await {
        Ok(Some(_)) => {
            return RequestResult::Error((
                StatusCode::BAD_REQUEST,
                ErrorResponse::new("User already exists".to_string()),
            ));
        }
        Ok(None) => {}
        Err(e) => {
            return internal_server_error(e.to_string());
        }
    }

    let user = User::create(payload.email, payload.password);
    match repo.create(user).await {
        Ok(user) => RequestResult::Success((
            StatusCode::CREATED,
            RegisterRes {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
            },
        )),
        Err(e) => internal_server_error(e.to_string()),
    }
}

pub fn build_routes() -> Router<PgPool> {
    // Throttle the auth endpoints to curb brute-force / credential-stuffing,
    // mirroring the old TS backend's 10-requests-per-minute limit. The GCRA
    // bucket allows a burst of 10 then replenishes one slot every 6 seconds
    // (≈10/min sustained). Keyed by client IP, reading the proxy's
    // X-Forwarded-For header (the app runs behind kamal-proxy) and falling back
    // to the peer IP.
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .period(Duration::from_secs(6))
            .burst_size(10)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("invalid rate-limit configuration"),
    );

    // Periodically evict stale per-IP entries so the limiter's memory doesn't
    // grow unbounded with distinct client IPs.
    let limiter = governor_conf.limiter().clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(120));
            limiter.retain_recent();
        }
    });

    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/register", post(register))
        .layer(GovernorLayer::new(governor_conf))
}
