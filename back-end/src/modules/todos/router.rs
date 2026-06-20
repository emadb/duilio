use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, patch},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Deserializer};
use sqlx::PgPool;
use sqlx::types::Uuid;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        EntityId, ErrorResponse, RequestResult,
        todos::repository::{Todo, TodoRepository, TodoStatus},
    },
};

/// Distinguishes "field absent" (`None`) from "field present and null" (`Some(None)`)
/// so a `dueDate: null` clears the value while an omitted `dueDate` leaves it.
fn double_option<'de, T, D>(de: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Deserialize::deserialize(de).map(Some)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTodoReq {
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    due_date: Option<DateTime<Utc>>,
    status: Option<TodoStatus>,
    #[serde(default)]
    tag_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTodoReq {
    title: Option<String>,
    description: Option<String>,
    #[serde(default, deserialize_with = "double_option")]
    due_date: Option<Option<DateTime<Utc>>>,
    status: Option<TodoStatus>,
    tag_ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct UpdateStatusReq {
    status: TodoStatus,
}

async fn list_todos(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> RequestResult<Vec<Todo>> {
    let repo = TodoRepository::new(pool);
    match repo.list_by_user(claims.user_id).await {
        Ok(todos) => RequestResult::Success((StatusCode::OK, todos)),
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
    }
}

async fn create_todo(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateTodoReq>,
) -> RequestResult<Todo> {
    let repo = TodoRepository::new(pool);
    let status = payload.status.unwrap_or(TodoStatus::Todo);
    match repo
        .create(
            claims.user_id,
            payload.title,
            payload.description,
            payload.due_date,
            status,
            &payload.tag_ids,
        )
        .await
    {
        Ok(todo) => RequestResult::Success((StatusCode::CREATED, todo)),
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
    }
}

async fn update_todo(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTodoReq>,
) -> RequestResult<Todo> {
    let repo = TodoRepository::new(pool);
    match repo
        .update(
            EntityId::from(id),
            claims.user_id,
            payload.title,
            payload.description,
            payload.due_date,
            payload.status,
            payload.tag_ids,
        )
        .await
    {
        Ok(Some(todo)) => RequestResult::Success((StatusCode::OK, todo)),
        Ok(None) => RequestResult::Error((
            StatusCode::NOT_FOUND,
            ErrorResponse::new(format!("Todo {} not found", id)),
        )),
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
    }
}

async fn update_todo_status(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateStatusReq>,
) -> RequestResult<Todo> {
    let repo = TodoRepository::new(pool);
    match repo
        .update(
            EntityId::from(id),
            claims.user_id,
            None,
            None,
            None,
            Some(payload.status),
            None,
        )
        .await
    {
        Ok(Some(todo)) => RequestResult::Success((StatusCode::OK, todo)),
        Ok(None) => RequestResult::Error((
            StatusCode::NOT_FOUND,
            ErrorResponse::new(format!("Todo {} not found", id)),
        )),
        Err(e) => RequestResult::Error((
            StatusCode::INTERNAL_SERVER_ERROR,
            ErrorResponse::new(e.to_string()),
        )),
    }
}

async fn delete_todo(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Response {
    let repo = TodoRepository::new(pool);
    match repo.delete(EntityId::from(id), claims.user_id).await {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(format!("Todo {} not found", id))),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(e.to_string())),
        )
            .into_response(),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/todos", get(list_todos).post(create_todo))
        .route("/api/todos/{id}", patch(update_todo).delete(delete_todo))
        .route("/api/todos/{id}/status", patch(update_todo_status))
        .layer(middleware::from_fn(auth_middleware_admin))
}
