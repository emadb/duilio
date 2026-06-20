use axum::{Json, Router, extract::State, http::StatusCode, middleware, routing::post};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::auth_middleware::{auth_middleware_admin};
use crate::modules::{RequestResult, auth::repository::{AuthRepository, User}};

#[derive(Deserialize)]
struct LoginReq {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginRes {
    user_id: crate::modules::EntityId,
    token: String,
}

#[derive(Deserialize)]
struct RegisterReq {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct RegisterRes {
    user_id: crate::modules::EntityId,
}

async fn login(State(pool): State<PgPool>, Json(payload): Json<LoginReq>) -> RequestResult<LoginRes> {
    let repo = AuthRepository::new(pool);
    match repo.get_by_email(payload.email).await {
        Ok(user) if user.password_match(payload.password) => {
            let token = crate::auth_middleware::create_token(user.id.clone());
            RequestResult::Success((StatusCode::OK, LoginRes { user_id: user.id, token }))
        }
        _ => RequestResult::Error((
            StatusCode::UNAUTHORIZED,
            crate::modules::ErrorResponse::new("wrong email or password".to_string()),
        )),
    }
}

async fn register(State(pool): State<PgPool>, Json(payload): Json<RegisterReq>) -> RequestResult<RegisterRes> {
    let repo = AuthRepository::new(pool);
    let user = User::create(payload.email, payload.password);
    match repo.create(user).await {
        Ok(user) => RequestResult::Success((StatusCode::OK, RegisterRes { user_id: user.id })),
        Err(e)   => RequestResult::Error((StatusCode::INTERNAL_SERVER_ERROR, crate::modules::ErrorResponse::new(e.to_string()))),
    }
}

pub fn build_routes() -> Router<PgPool> {
    let public_routes = Router::new()
        .route("/api/auth/login",    post(login))
        .route("/api/auth/register", post(register));

    let protected_routes = Router::new()
        .layer(middleware::from_fn(auth_middleware_admin));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
}
