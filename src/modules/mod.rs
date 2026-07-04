use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};
use sqlx::{Type, types::Uuid};
pub mod auth;
pub mod health;
pub mod tags;
pub mod todos;

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[sqlx(transparent)]
pub struct EntityId(Uuid);

impl EntityId {
    pub fn new() -> Self {
        EntityId(Uuid::new_v4())
    }
}

impl From<Uuid> for EntityId {
    fn from(value: Uuid) -> Self {
        EntityId(value)
    }
}

pub(crate) fn internal_server_error<T>(msg: String) -> RequestResult<T> {
    RequestResult::Error((StatusCode::INTERNAL_SERVER_ERROR, ErrorResponse::new(msg)))
}

#[derive(Debug)]
pub struct FormatError;

impl TryFrom<String> for EntityId {
    type Error = FormatError;

    fn try_from(value: String) -> Result<Self, FormatError> {
        match value.parse::<uuid::Uuid>() {
            Ok(uuid) => Ok(EntityId::from(uuid)),
            Err(_) => Err(FormatError),
        }
    }
}

impl TryFrom<EntityId> for Uuid {
    type Error = uuid::Error;

    fn try_from(value: EntityId) -> Result<Self, Self::Error> {
        Ok(value.0)
    }
}

impl std::fmt::Display for EntityId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Serialize)]
pub(crate) struct ErrorResponse {
    message: String,
}

impl ErrorResponse {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

pub(crate) enum RequestResult<T> {
    Success((StatusCode, T)),
    Error((StatusCode, crate::modules::ErrorResponse)),
}

impl<T: Serialize> IntoResponse for RequestResult<T> {
    fn into_response(self) -> axum::response::Response {
        match self {
            RequestResult::Success((status, body)) => (status, Json(body)).into_response(),
            RequestResult::Error((status, err)) => (status, Json(err)).into_response(),
        }
    }
}
