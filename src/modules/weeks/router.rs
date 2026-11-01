use axum::{
    Extension, Json, Router,
    extract::State,
    http::StatusCode,
    middleware,
    routing::{get, post},
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        ErrorResponse, RequestResult, internal_server_error,
        todos::repository::{Todo, TodoRepository},
        weeks::{
            log::LogWeek,
            repository::{CompleteError, Week, WeekRepository},
            review::{Decision, review_cards},
        },
    },
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewResponse {
    week_start: NaiveDate,
    needs_review: bool,
    cards: Vec<Todo>,
}

#[derive(Deserialize)]
struct CompleteReq {
    decisions: Vec<Decision>,
    note: Option<String>,
}

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

/// One review covers every skipped week: the cards do not depend on past weeks.
async fn review(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> RequestResult<ReviewResponse> {
    let week = match WeekRepository::new(pool.clone())
        .current(claims.user_id.clone())
        .await
    {
        Ok(week) => week,
        Err(e) => return internal_server_error(e.to_string()),
    };

    if week.reviewed_at.is_some() {
        return RequestResult::Success((StatusCode::OK, empty(week.week_start)));
    }

    match TodoRepository::new(pool).list_active(claims.user_id).await {
        Ok(todos) => {
            let cards = review_cards(todos, week.week_start);

            RequestResult::Success((
                StatusCode::OK,
                ReviewResponse {
                    week_start: week.week_start,
                    needs_review: !cards.is_empty(),
                    cards,
                },
            ))
        }
        Err(e) => internal_server_error(e.to_string()),
    }
}

async fn complete_review(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CompleteReq>,
) -> RequestResult<Week> {
    let repo = WeekRepository::new(pool);
    match repo
        .complete(claims.user_id, &payload.decisions, payload.note)
        .await
    {
        Ok(week) => RequestResult::Success((StatusCode::OK, week)),
        Err(CompleteError::AlreadyReviewed) => RequestResult::Error((
            StatusCode::CONFLICT,
            ErrorResponse::new("This week is already reviewed".to_string()),
        )),
        Err(CompleteError::Invalid(e)) => {
            RequestResult::Error((StatusCode::BAD_REQUEST, ErrorResponse::new(e.message())))
        }
        Err(CompleteError::Db(e)) => internal_server_error(e.to_string()),
    }
}

async fn log(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> RequestResult<Vec<LogWeek>> {
    match WeekRepository::new(pool).log(claims.user_id).await {
        Ok(weeks) => RequestResult::Success((StatusCode::OK, weeks)),
        Err(e) => internal_server_error(e.to_string()),
    }
}

fn empty(week_start: NaiveDate) -> ReviewResponse {
    ReviewResponse {
        week_start,
        needs_review: false,
        cards: Vec::new(),
    }
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/weeks/current", get(current_week))
        .route("/api/log", get(log))
        .route("/api/review", get(review))
        .route("/api/review/complete", post(complete_review))
        .layer(middleware::from_fn(auth_middleware_admin))
}
