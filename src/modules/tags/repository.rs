use serde::Serialize;
use sqlx::{Error, Pool, Postgres};
use crate::modules::EntityId;

#[derive(Debug, Serialize, Clone)]
pub struct Tag {
    pub id: EntityId,
    pub name: String,
    pub color: String,
}

pub struct TagRepository {
    pool: Pool<Postgres>,
}

impl TagRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        TagRepository { pool }
    }

    pub async fn list_by_user(&self, user_id: EntityId) -> Result<Vec<Tag>, Error> {
        sqlx::query_as!(
            Tag,
            r#"
            SELECT id, name, color
            FROM tags
            WHERE user_id = $1
            ORDER BY name
            "#,
            user_id.0
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Creates a tag for the user. Returns `None` when a tag with the same name
    /// already exists for that user (mirrors the TS repository's duplicate check).
    pub async fn create(
        &self,
        user_id: EntityId,
        name: String,
        color: String,
    ) -> Result<Option<Tag>, Error> {
        let existing = sqlx::query_scalar!(
            r#"SELECT id FROM tags WHERE user_id = $1 AND name = $2 LIMIT 1"#,
            user_id.0,
            name
        )
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            return Ok(None);
        }

        let tag = sqlx::query_as!(
            Tag,
            r#"
            INSERT INTO tags (user_id, name, color)
            VALUES ($1, $2, $3)
            RETURNING id, name, color
            "#,
            user_id.0,
            name,
            color
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Some(tag))
    }
}
