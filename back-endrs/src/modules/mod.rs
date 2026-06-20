use axum::{Json, http::StatusCode, response::IntoResponse};
use sqlx::{Type, types::Uuid};
use serde::{Serialize, Deserialize};
pub mod health;
pub mod auth;
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

impl From<Option<Uuid>> for EntityId {
    fn from(value: Option<Uuid>) -> Self {
        if let Some(v) = value {
            EntityId(v)
        } else {
            EntityId(Uuid::new_v4())
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
struct ErrorResponse {
    message: String
}

impl ErrorResponse {
    pub fn new(message: String) -> Self {
        Self{message}
    }
}

enum RequestResult<T> {
    Success((StatusCode, T)),
    Error((StatusCode, crate::modules::ErrorResponse)),
}

impl <T: Serialize>IntoResponse for RequestResult<T> {
    fn into_response(self) -> axum::response::Response {
        match self {
            RequestResult::Success((status, body)) => (status, Json(body)).into_response(),
            RequestResult::Error((status, err)) => (status, Json(err)).into_response(),
        }
    }
}

// ============================================
// CORE TRAITS (reusable across application)
// ============================================

/// Marker trait for commands - commands are just data structures
pub trait Command: Send + Sync {}

/// Links a command to its result type and defines execution contract
pub trait CommandHandler<C: Command> {
    type Result;
    type Error;

    async fn handle(&self, cmd: C) -> Result<Self::Result, Self::Error>;
}


