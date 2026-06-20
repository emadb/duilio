use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, Pool, Postgres};
use crate::modules::EntityId;

#[derive(sqlx::Type, Debug, Serialize, Deserialize, Clone)]
#[sqlx(type_name = "todo_status", rename_all = "lowercase")]
pub enum TodoStatus {
    Todo,
    InProgress,
    Done
}

impl std::fmt::Display for TodoStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TodoStatus::Todo   => write!(f, "todo"),
            TodoStatus::InProgress => write!(f, "in-progress"),
            TodoStatus::Done => write!(f, "done"),
        }
    }
}

#[derive(Debug)]
pub enum TodoError {
    ValidationError(String),
    DatabaseError(sqlx::Error),
}


impl std::str::FromStr for TodoStatus {
    type Err = TodoError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "todo"   => Ok(TodoStatus::Todo),
            "in-progress" => Ok(TodoStatus::InProgress),
            "done" => Ok(TodoStatus::Done),
            _ => Err(TodoError::ValidationError(format!("Unknown status: {}", s))),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Todo {
    pub id: EntityId,
    // pub user_id: EntityId,
    pub title: String,
    pub description: String,
    pub due_date: Option<DateTime<Utc>>,
    pub status: TodoStatus,
    // pub tags: Vec<Tag>
}

#[derive(Serialize, Deserialize)]
pub struct Tag(String);

pub struct TodoRepository {
    pool: Pool<Postgres>,
}

impl TodoRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        TodoRepository{pool}
    }
    pub async fn get_all(&self, user_id: EntityId) -> Result<Vec<Todo>, Error> {
        sqlx::query_as!(Todo, r#"
            SELECT
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus"
            FROM todos
            WHERE user_id = $1"#, user_id.0)
            .fetch_all(&self.pool)
            .await
   }
}