use std::collections::HashMap;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, Pool, Postgres, types::Uuid};

use crate::modules::EntityId;
use crate::modules::tags::repository::Tag;
use crate::modules::todos::transitions::{
    StatusInput, StatusState, TransitionError, apply_status, new_state,
};

#[derive(sqlx::Type, Debug, Serialize, Deserialize, Clone, PartialEq)]
#[sqlx(type_name = "todo_status")]
#[serde(rename_all = "kebab-case")]
pub enum TodoStatus {
    #[sqlx(rename = "idea")]
    Idea,
    #[sqlx(rename = "todo")]
    Todo,
    #[sqlx(rename = "in-progress")]
    InProgress,
    #[sqlx(rename = "blocked")]
    Blocked,
    #[sqlx(rename = "paused")]
    Paused,
    #[sqlx(rename = "done")]
    Done,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: EntityId,
    pub title: String,
    pub description: String,
    pub due_date: Option<DateTime<Utc>>,
    pub status: TodoStatus,
    pub important: bool,
    pub status_changed_at: DateTime<Utc>,
    pub waiting_on: Option<String>,
    pub waiting_since: Option<DateTime<Utc>>,
    pub paused_until: Option<NaiveDate>,
    pub completed_at: Option<DateTime<Utc>>,
    pub rollover_count: i32,
    pub tags: Vec<Tag>,
}

/// A todo row as stored in the database, before its tags are attached.
struct TodoRow {
    id: EntityId,
    title: String,
    description: String,
    due_date: Option<DateTime<Utc>>,
    status: TodoStatus,
    important: bool,
    status_changed_at: DateTime<Utc>,
    waiting_on: Option<String>,
    waiting_since: Option<DateTime<Utc>>,
    paused_until: Option<NaiveDate>,
    completed_at: Option<DateTime<Utc>>,
    rollover_count: i32,
}

impl TodoRow {
    fn state(&self) -> StatusState {
        StatusState {
            status: self.status.clone(),
            status_changed_at: self.status_changed_at,
            waiting_on: self.waiting_on.clone(),
            waiting_since: self.waiting_since,
            paused_until: self.paused_until,
            completed_at: self.completed_at,
            rollover_count: self.rollover_count,
        }
    }

    fn into_todo(self, tags: Vec<Tag>) -> Todo {
        Todo {
            id: self.id,
            title: self.title,
            description: self.description,
            due_date: self.due_date,
            status: self.status,
            important: self.important,
            status_changed_at: self.status_changed_at,
            waiting_on: self.waiting_on,
            waiting_since: self.waiting_since,
            paused_until: self.paused_until,
            completed_at: self.completed_at,
            rollover_count: self.rollover_count,
            tags,
        }
    }
}

/// Why a create or update did not happen.
#[derive(Debug)]
pub enum SaveError {
    Invalid(TransitionError),
    Db(Error),
}

impl From<Error> for SaveError {
    fn from(e: Error) -> Self {
        SaveError::Db(e)
    }
}

impl From<TransitionError> for SaveError {
    fn from(e: TransitionError) -> Self {
        SaveError::Invalid(e)
    }
}

pub struct TodoRepository {
    pool: Pool<Postgres>,
}

impl TodoRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        TodoRepository { pool }
    }

    pub async fn list_by_user(&self, user_id: EntityId) -> Result<Vec<Todo>, Error> {
        let rows = sqlx::query_as!(
            TodoRow,
            r#"
            SELECT
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus",
                important,
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            FROM todos
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
            user_id.0
        )
        .fetch_all(&self.pool)
        .await?;

        let todo_ids: Vec<Uuid> = rows.iter().map(|r| r.id.0).collect();
        let mut tags_map = self.tags_for_todos(&todo_ids).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let tags = tags_map.remove(&row.id.0).unwrap_or_default();
                row.into_todo(tags)
            })
            .collect())
    }

    /// Cards that are neither ideas nor done, the oldest status change first.
    pub async fn list_active(&self, user_id: EntityId) -> Result<Vec<Todo>, Error> {
        let rows = sqlx::query_as!(
            TodoRow,
            r#"
            SELECT
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus",
                important,
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            FROM todos
            WHERE user_id = $1 AND status NOT IN ('idea', 'done')
            ORDER BY status_changed_at ASC
            "#,
            user_id.0
        )
        .fetch_all(&self.pool)
        .await?;

        let todo_ids: Vec<Uuid> = rows.iter().map(|r| r.id.0).collect();
        let mut tags_map = self.tags_for_todos(&todo_ids).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let tags = tags_map.remove(&row.id.0).unwrap_or_default();
                row.into_todo(tags)
            })
            .collect())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        &self,
        user_id: EntityId,
        title: String,
        description: String,
        due_date: Option<DateTime<Utc>>,
        status: TodoStatus,
        status_input: StatusInput,
        important: bool,
        tag_ids: &[String],
    ) -> Result<Todo, SaveError> {
        let now = Utc::now();
        let state = apply_status(new_state(now), status, status_input, now)?;

        let row = sqlx::query_as!(
            TodoRow,
            r#"
            INSERT INTO todos (
                user_id, title, description, due_date, status, important,
                status_changed_at, waiting_on, waiting_since, paused_until,
                completed_at, rollover_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus",
                important,
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            "#,
            user_id.0,
            title,
            description,
            due_date,
            state.status as TodoStatus,
            important,
            state.status_changed_at,
            state.waiting_on,
            state.waiting_since,
            state.paused_until,
            state.completed_at,
            state.rollover_count
        )
        .fetch_one(&self.pool)
        .await?;

        if !tag_ids.is_empty() {
            self.sync_todo_tags(row.id.0, user_id.0, tag_ids).await?;
        }

        let tags = self.tags_for_todo(row.id.0).await?;
        Ok(row.into_todo(tags))
    }

    /// Partial update mirroring the TS repository: `None` fields keep their
    /// current value; for `due_date`, `Some(None)` clears the value while a plain
    /// `None` leaves it untouched. A status change goes through
    /// [`apply_status`], which sets or clears the status-dependent fields.
    /// Returns `None` when the todo doesn't exist for this user.
    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        &self,
        id: EntityId,
        user_id: EntityId,
        title: Option<String>,
        description: Option<String>,
        due_date: Option<Option<DateTime<Utc>>>,
        status: Option<TodoStatus>,
        status_input: StatusInput,
        important: Option<bool>,
        tag_ids: Option<Vec<String>>,
    ) -> Result<Option<Todo>, SaveError> {
        let existing = sqlx::query_as!(
            TodoRow,
            r#"
            SELECT
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus",
                important,
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            FROM todos
            WHERE id = $1 AND user_id = $2
            "#,
            id.0,
            user_id.0
        )
        .fetch_optional(&self.pool)
        .await?;

        let Some(existing) = existing else {
            return Ok(None);
        };

        let state = match status {
            Some(to) => apply_status(existing.state(), to, status_input, Utc::now())?,
            None => existing.state(),
        };
        let new_title = title.unwrap_or(existing.title);
        let new_description = description.unwrap_or(existing.description);
        let new_due_date = match due_date {
            Some(value) => value,
            None => existing.due_date,
        };
        let new_important = important.unwrap_or(existing.important);

        let row = sqlx::query_as!(
            TodoRow,
            r#"
            UPDATE todos
            SET title = $3,
                description = $4,
                due_date = $5,
                status = $6,
                important = $7,
                status_changed_at = $8,
                waiting_on = $9,
                waiting_since = $10,
                paused_until = $11,
                completed_at = $12,
                rollover_count = $13,
                updated_at = now()
            WHERE id = $1 AND user_id = $2
            RETURNING
                id,
                title,
                description,
                due_date,
                status as "status: TodoStatus",
                important,
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            "#,
            id.0,
            user_id.0,
            new_title,
            new_description,
            new_due_date,
            state.status as TodoStatus,
            new_important,
            state.status_changed_at,
            state.waiting_on,
            state.waiting_since,
            state.paused_until,
            state.completed_at,
            state.rollover_count
        )
        .fetch_one(&self.pool)
        .await?;

        if let Some(tag_ids) = tag_ids {
            self.sync_todo_tags(id.0, user_id.0, &tag_ids).await?;
        }

        let tags = self.tags_for_todo(id.0).await?;
        Ok(Some(row.into_todo(tags)))
    }

    pub async fn delete(&self, id: EntityId, user_id: EntityId) -> Result<bool, Error> {
        let result = sqlx::query!(
            r#"DELETE FROM todos WHERE id = $1 AND user_id = $2"#,
            id.0,
            user_id.0
        )
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    async fn tags_for_todo(&self, todo_id: Uuid) -> Result<Vec<Tag>, Error> {
        let mut map = self.tags_for_todos(&[todo_id]).await?;
        Ok(map.remove(&todo_id).unwrap_or_default())
    }

    async fn tags_for_todos(&self, todo_ids: &[Uuid]) -> Result<HashMap<Uuid, Vec<Tag>>, Error> {
        let mut map: HashMap<Uuid, Vec<Tag>> = HashMap::new();
        if todo_ids.is_empty() {
            return Ok(map);
        }

        let rows = sqlx::query!(
            r#"
            SELECT tt.todo_id, t.id, t.name, t.color
            FROM todo_tags tt
            INNER JOIN tags t ON tt.tag_id = t.id
            WHERE tt.todo_id = ANY($1)
            "#,
            todo_ids
        )
        .fetch_all(&self.pool)
        .await?;

        for row in rows {
            map.entry(row.todo_id).or_default().push(Tag {
                id: EntityId::from(row.id),
                name: row.name,
                color: row.color,
            });
        }
        Ok(map)
    }

    /// Replaces the todo's tags with the given ids, keeping only tags that belong
    /// to the user (matching the TS `syncTodoTags`).
    async fn sync_todo_tags(
        &self,
        todo_id: Uuid,
        user_id: Uuid,
        tag_ids: &[String],
    ) -> Result<(), Error> {
        let requested: Vec<Uuid> = tag_ids
            .iter()
            .filter_map(|id| id.parse::<Uuid>().ok())
            .collect();

        let valid_ids: Vec<Uuid> = if requested.is_empty() {
            Vec::new()
        } else {
            sqlx::query_scalar!(
                r#"SELECT id FROM tags WHERE id = ANY($1) AND user_id = $2"#,
                &requested,
                user_id
            )
            .fetch_all(&self.pool)
            .await?
        };

        sqlx::query!(r#"DELETE FROM todo_tags WHERE todo_id = $1"#, todo_id)
            .execute(&self.pool)
            .await?;

        if !valid_ids.is_empty() {
            sqlx::query!(
                r#"
                INSERT INTO todo_tags (todo_id, tag_id)
                SELECT $1, * FROM UNNEST($2::uuid[])
                "#,
                todo_id,
                &valid_ids
            )
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}
