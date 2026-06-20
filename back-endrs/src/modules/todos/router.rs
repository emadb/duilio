use axum::{Extension, Router, extract::State, http::StatusCode, middleware, routing::get};
use serde::Serialize;
use sqlx::PgPool;

use crate::{auth_middleware::{Claims, auth_middleware_admin}, modules::{EntityId, RequestResult, todos::repository::TodoRepository}};


// TODO
// GET /api/todos --> get todo by user
// POST /api/todos --> crete todo
// PATCH /api/todos/:id --> update data
// PATCH /api/todos/:id/status --> update status
// DELETE /api/todos/:id --> delete todo

#[derive(Serialize)]
struct GetTodosRes {
    todos: Vec<TodoRes>
}

#[derive(Serialize)]
struct TodoRes {
    pub id: EntityId,
    pub title: String,
    pub description: String,
    pub due_date: String,
    pub status: String,
    // pub tags: Vec<String>
}

async fn todos(State(pool): State<PgPool>, Extension(claims): Extension<Claims>) -> RequestResult<GetTodosRes> {
    let repo = TodoRepository::new(pool);
    match repo.get_all(claims.user_id).await {
        Ok(todos) =>  {

            let todos = todos.iter().map(move |s| {
                TodoRes{
                    id: s.id.clone(),
                    title: s.title.clone(),
                    description: s.description.clone(),
                    due_date: if s.due_date.is_some() { s.due_date.unwrap().to_string() } else { String::from("-")},
                    status: s.status.to_string(),
                    // tags: s.tags.clone(),
                }
            }).collect();

            RequestResult::Success((StatusCode::OK, GetTodosRes{todos}))
        },
        Err(e) => RequestResult::Error((StatusCode::INTERNAL_SERVER_ERROR, crate::modules::ErrorResponse::new(e.to_string())))
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/todos", get(todos))
        .layer(middleware::from_fn(auth_middleware_admin))
}