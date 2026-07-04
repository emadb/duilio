use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{get, patch},
};
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Deserializer};
use sqlx::PgPool;
use sqlx::types::Uuid;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        EntityId, ErrorResponse, RequestResult, internal_server_error,
        todos::repository::{Todo, TodoRepository, TodoStatus},
    },
};

/// Parses a `dueDate` string. Accepts both a full RFC3339 timestamp
/// (e.g. `2026-06-21T00:00:00Z`) and a bare calendar date (`2026-06-21`, as
/// produced by the `<input type="date">` UI), treating the latter as midnight UTC.
fn parse_due_date<E: serde::de::Error>(s: &str) -> Result<DateTime<Utc>, E> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(dt.with_timezone(&Utc));
    }
    if let Ok(date) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        let midnight = date.and_hms_opt(0, 0, 0).expect("00:00:00 is always valid");
        return Ok(Utc.from_utc_datetime(&midnight));
    }
    Err(E::custom(format!(
        "invalid dueDate '{s}': expected YYYY-MM-DD or an RFC3339 timestamp"
    )))
}

/// Deserializes an optional `dueDate` for create: `null`/absent → `None`,
/// otherwise a date-only or RFC3339 string (see [`parse_due_date`]).
fn opt_due_date<'de, D>(de: D) -> Result<Option<DateTime<Utc>>, D::Error>
where
    D: Deserializer<'de>,
{
    match Option::<String>::deserialize(de)? {
        Some(s) if !s.is_empty() => parse_due_date(&s).map(Some),
        _ => Ok(None),
    }
}

/// Like [`opt_due_date`] but distinguishes "field absent" (`None`) from "field
/// present and null/empty" (`Some(None)`), so on update a `dueDate: null` clears
/// the value while an omitted `dueDate` leaves it untouched.
fn double_opt_due_date<'de, D>(de: D) -> Result<Option<Option<DateTime<Utc>>>, D::Error>
where
    D: Deserializer<'de>,
{
    opt_due_date(de).map(Some)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTodoReq {
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default, deserialize_with = "opt_due_date")]
    due_date: Option<DateTime<Utc>>,
    status: Option<TodoStatus>,
    #[serde(default)]
    important: bool,
    #[serde(default)]
    tag_ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTodoReq {
    title: Option<String>,
    description: Option<String>,
    #[serde(default, deserialize_with = "double_opt_due_date")]
    due_date: Option<Option<DateTime<Utc>>>,
    status: Option<TodoStatus>,
    important: Option<bool>,
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
        Err(e) => internal_server_error(e.to_string()),
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
            payload.important,
            &payload.tag_ids,
        )
        .await
    {
        Ok(todo) => RequestResult::Success((StatusCode::CREATED, todo)),
        Err(e) => internal_server_error(e.to_string()),
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
            payload.important,
            payload.tag_ids,
        )
        .await
    {
        Ok(Some(todo)) => RequestResult::Success((StatusCode::OK, todo)),
        Ok(None) => RequestResult::Error((
            StatusCode::NOT_FOUND,
            ErrorResponse::new(format!("Todo {} not found", id)),
        )),
        Err(e) => internal_server_error(e.to_string()),
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
            None,
        )
        .await
    {
        Ok(Some(todo)) => RequestResult::Success((StatusCode::OK, todo)),
        Ok(None) => RequestResult::Error((
            StatusCode::NOT_FOUND,
            ErrorResponse::new(format!("Todo {} not found", id)),
        )),
        Err(e) => internal_server_error(e.to_string()),
    }
}

// TODO: return RequestResult<()>
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_accepts_date_only() {
        let req: CreateTodoReq =
            serde_json::from_str(r#"{"title":"A","dueDate":"2026-06-21"}"#).unwrap();
        assert_eq!(
            req.due_date.unwrap().to_rfc3339(),
            "2026-06-21T00:00:00+00:00"
        );
    }

    #[test]
    fn create_accepts_rfc3339() {
        let req: CreateTodoReq =
            serde_json::from_str(r#"{"title":"A","dueDate":"2026-06-21T08:30:00Z"}"#).unwrap();
        assert_eq!(
            req.due_date.unwrap().to_rfc3339(),
            "2026-06-21T08:30:00+00:00"
        );
    }

    #[test]
    fn create_accepts_null_and_absent() {
        let a: CreateTodoReq = serde_json::from_str(r#"{"title":"A","dueDate":null}"#).unwrap();
        assert!(a.due_date.is_none());
        let b: CreateTodoReq = serde_json::from_str(r#"{"title":"A"}"#).unwrap();
        assert!(b.due_date.is_none());
    }

    #[test]
    fn update_distinguishes_absent_null_and_value() {
        // absent → outer None (leave untouched)
        let absent: UpdateTodoReq = serde_json::from_str(r#"{}"#).unwrap();
        assert!(absent.due_date.is_none());
        // null → Some(None) (clear)
        let null: UpdateTodoReq = serde_json::from_str(r#"{"dueDate":null}"#).unwrap();
        assert_eq!(null.due_date, Some(None));
        // date-only value → Some(Some(midnight))
        let val: UpdateTodoReq = serde_json::from_str(r#"{"dueDate":"2026-12-25"}"#).unwrap();
        assert_eq!(
            val.due_date.unwrap().unwrap().to_rfc3339(),
            "2026-12-25T00:00:00+00:00"
        );
    }
}
