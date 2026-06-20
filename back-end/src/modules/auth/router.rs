use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::modules::{
    EntityId, ErrorResponse, RequestResult,
    auth::repository::{AuthRepository, User},
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

async fn login(State(pool): State<PgPool>, Json(payload): Json<LoginReq>) -> RequestResult<LoginRes> {
    let repo = AuthRepository::new(pool);
    match repo.get_by_email(payload.email).await {
        Ok(Some(user)) if user.password_match(payload.password) => {
            let token = crate::auth_middleware::create_token(user.id.clone());
            RequestResult::Success((
                StatusCode::OK,
                LoginRes {
                    token,
                    user: LoginUser { id: user.id, email: user.email },
                },
            ))
        }
        Ok(_) => RequestResult::Error((
            StatusCode::UNAUTHORIZED,
            ErrorResponse::new("Invalid credentials".to_string()),
        )),
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
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
            return RequestResult::Error((
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(e.to_string()),
            ));
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
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/register", post(register))
}
