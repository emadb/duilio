use axum::{Extension, Json, Router, extract::State, http::StatusCode, middleware, routing::get};
use serde::Deserialize;
use sqlx::PgPool;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{RequestResult, internal_server_error, tags::repository::{Tag, TagRepository}},
};

#[derive(Deserialize)]
struct CreateTagReq {
    name: String,
    color: String,
}

async fn list_tags(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> RequestResult<Vec<Tag>> {
    let repo = TagRepository::new(pool);
    match repo.list_by_user(claims.user_id).await {
        Ok(tags) => RequestResult::Success((StatusCode::OK, tags)),
        Err(e) => internal_server_error(e.to_string()),
    }
}

async fn create_tag(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateTagReq>,
) -> RequestResult<Tag> {
    let repo = TagRepository::new(pool);
    let name = payload.name.clone();
    match repo.create(claims.user_id, payload.name, payload.color).await {
        Ok(Some(tag)) => RequestResult::Success((StatusCode::CREATED, tag)),
        Ok(None) => internal_server_error(format!("Tag \"{}\" already exists", name)),
        Err(e) => internal_server_error(e.to_string()),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/tags", get(list_tags).post(create_tag))
        .layer(middleware::from_fn(auth_middleware_admin))
}
