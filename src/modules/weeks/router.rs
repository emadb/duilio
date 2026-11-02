use axum::{Extension, Router, extract::State, http::StatusCode, middleware, routing::get};
use sqlx::PgPool;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        RequestResult, internal_server_error,
        weeks::repository::{Week, WeekRepository},
    },
};

async fn current_week(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> RequestResult<Week> {
    let repo = WeekRepository::new(pool);
    match repo.current(claims.user_id).await {
        Ok(week) => RequestResult::Success((StatusCode::OK, week)),
        Err(e) => internal_server_error(e.to_string()),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/weeks/current", get(current_week))
        .layer(middleware::from_fn(auth_middleware_admin))
}
