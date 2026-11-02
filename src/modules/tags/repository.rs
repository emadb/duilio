use crate::modules::EntityId;
use serde::Serialize;
use sqlx::{Error, Pool, Postgres, types::Uuid};

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
    /// already exists for that user. The insert is the check, so two requests at
    /// once cannot both create it.
    pub async fn create(
        &self,
        user_id: EntityId,
        name: String,
        color: String,
    ) -> Result<Option<Tag>, Error> {
        sqlx::query_as!(
            Tag,
            r#"
            INSERT INTO tags (user_id, name, color)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, name) DO NOTHING
            RETURNING id, name, color
            "#,
            user_id.0,
            name,
            color
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Sets the color of one of the user's tags. Returns `None` when the tag
    /// does not exist for this user.
    pub async fn update_color(
        &self,
        user_id: EntityId,
        id: Uuid,
        color: String,
    ) -> Result<Option<Tag>, Error> {
        sqlx::query_as!(
            Tag,
            r#"
            UPDATE tags
            SET color = $3
            WHERE id = $1 AND user_id = $2
            RETURNING id, name, color
            "#,
            id,
            user_id.0,
            color
        )
        .fetch_optional(&self.pool)
        .await
    }
}
