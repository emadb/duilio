use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    http::StatusCode,
    middleware,
    routing::{get, patch},
};
use serde::Deserialize;
use sqlx::{PgPool, types::Uuid};

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        ErrorResponse, RequestResult, internal_server_error,
        tags::repository::{Tag, TagRepository},
    },
};

#[derive(Deserialize)]
struct CreateTagReq {
    name: String,
    color: String,
}

#[derive(Deserialize)]
struct UpdateTagReq {
    color: String,
}

/// A tag color is a hex string like `#F97316`.
fn is_hex_color(color: &str) -> bool {
    color.len() == 7 && color.starts_with('#') && color[1..].chars().all(|c| c.is_ascii_hexdigit())
}

fn invalid_color<T>() -> RequestResult<T> {
    RequestResult::Error((
        StatusCode::BAD_REQUEST,
        ErrorResponse::new("color must look like #RRGGBB".to_string()),
    ))
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
    if !is_hex_color(&payload.color) {
        return invalid_color();
    }

    let repo = TagRepository::new(pool);
    let name = payload.name.clone();
    match repo
        .create(claims.user_id, payload.name, payload.color)
        .await
    {
        Ok(Some(tag)) => RequestResult::Success((StatusCode::CREATED, tag)),
        Ok(None) => internal_server_error(format!("Tag \"{}\" already exists", name)),
        Err(e) => internal_server_error(e.to_string()),
    }
}

async fn update_tag(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTagReq>,
) -> RequestResult<Tag> {
    if !is_hex_color(&payload.color) {
        return invalid_color();
    }

    match TagRepository::new(pool)
        .update_color(claims.user_id, id, payload.color)
        .await
    {
        Ok(Some(tag)) => RequestResult::Success((StatusCode::OK, tag)),
        Ok(None) => RequestResult::Error((
            StatusCode::NOT_FOUND,
            ErrorResponse::new("Tag not found".to_string()),
        )),
        Err(e) => internal_server_error(e.to_string()),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/tags", get(list_tags).post(create_tag))
        .route("/api/tags/{id}", patch(update_tag))
        .layer(middleware::from_fn(auth_middleware_admin))
}

#[cfg(test)]
mod tests {
    use super::is_hex_color;

    #[test]
    fn accepts_a_six_digit_hex_color() {
        assert!(is_hex_color("#F97316"));
        assert!(is_hex_color("#a855f7"));
    }

    #[test]
    fn rejects_anything_else() {
        for bad in [
            "",
            "F97316",
            "#F9731",
            "#F973166",
            "#GGGGGG",
            "red",
            "#F97316; x",
        ] {
            assert!(!is_hex_color(bad), "{bad}");
        }
    }
}
