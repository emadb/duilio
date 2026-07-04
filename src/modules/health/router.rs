use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Serialize)]
pub struct HealthCheck {
    message: String,
    value: i32,
}

pub fn build_routes() -> Router<PgPool> {
    async fn handler(State(pool): State<PgPool>) -> impl IntoResponse {
        let res = sqlx::query_scalar::<_, i32>("select 1")
            .fetch_one(&pool)
            .await;
        match res {
            Ok(value) => (
                StatusCode::OK,
                Json(HealthCheck {
                    message: "ok".to_string(),
                    value,
                }),
            ),
            Err(_) => (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthCheck {
                    message: "Database not available".to_string(),
                    value: 0,
                }),
            ),
        }
    }

    Router::new().route("/health", get(handler))
}
