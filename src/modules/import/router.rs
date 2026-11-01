use axum::{
    Extension, Router,
    extract::{DefaultBodyLimit, Query, State},
    http::StatusCode,
    middleware,
    routing::post,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{
    auth_middleware::{Claims, auth_middleware_admin},
    modules::{
        ErrorResponse, RequestResult,
        import::{
            repository::ImportRepository,
            trello::{Counts, count_cards, map_trello},
        },
        internal_server_error,
    },
};

/// A Trello export of a big board is larger than the axum default of 2 MB.
const MAX_BODY: usize = 20 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportQuery {
    #[serde(default)]
    dry_run: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportResponse {
    dry_run: bool,
    total: usize,
    counts: Counts,
    archived: usize,
    unknown_lists: Vec<String>,
    /// No deduplication in v1: a second import adds every card again.
    warning: &'static str,
}

/// The body is the Trello board export, as JSON text. With `?dryRun=true` nothing is written.
async fn import_trello(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ImportQuery>,
    body: String,
) -> RequestResult<ImportResponse> {
    let import = match map_trello(&body) {
        Ok(import) => import,
        Err(e) => {
            return RequestResult::Error((
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(format!("Not a Trello board export: {e}")),
            ));
        }
    };

    if !query.dry_run {
        let repo = ImportRepository::new(pool);
        if let Err(e) = repo.insert_cards(claims.user_id, &import.cards).await {
            return internal_server_error(e.to_string());
        }
    }

    RequestResult::Success((
        StatusCode::OK,
        ImportResponse {
            dry_run: query.dry_run,
            total: import.cards.len(),
            counts: count_cards(&import.cards),
            archived: import.archived,
            unknown_lists: import.unknown_lists,
            warning: "Duilio does not detect duplicates: importing the same board again adds every card again.",
        },
    ))
}

pub fn build_routes() -> Router<PgPool> {
    Router::new()
        .route("/api/import/trello", post(import_trello))
        .layer(DefaultBodyLimit::max(MAX_BODY))
        .layer(middleware::from_fn(auth_middleware_admin))
}
