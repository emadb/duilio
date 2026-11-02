use sqlx::{Error, Pool, Postgres};

use crate::modules::EntityId;
use crate::modules::import::trello::NewCard;
use crate::modules::todos::repository::TodoStatus;

/// The color of tags created by an import. It is the first color of the front-end palette.
const TAG_COLOR: &str = "#6366F1";

pub struct ImportRepository {
    pool: Pool<Postgres>,
}

impl ImportRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        ImportRepository { pool }
    }

    /// Inserts all cards in one transaction. It does not go through `apply_status`:
    /// imported Waiting cards have no `waiting_on`. Tags are reused by name.
    pub async fn insert_cards(&self, user_id: EntityId, cards: &[NewCard]) -> Result<(), Error> {
        let mut tx = self.pool.begin().await?;

        for card in cards {
            let todo_id = sqlx::query_scalar!(
                r#"
                INSERT INTO todos (user_id, title, description, status, status_changed_at, completed_at)
                VALUES ($1, $2, $3, $4, now(), $5)
                RETURNING id
                "#,
                user_id.0,
                card.title,
                card.description,
                card.status.clone() as TodoStatus,
                card.completed_at
            )
            .fetch_one(&mut *tx)
            .await?;

            for name in &card.tags {
                let tag_id = sqlx::query_scalar!(
                    r#"
                    INSERT INTO tags (user_id, name, color)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                    "#,
                    user_id.0,
                    name,
                    TAG_COLOR
                )
                .fetch_one(&mut *tx)
                .await?;

                sqlx::query!(
                    r#"INSERT INTO todo_tags (todo_id, tag_id) VALUES ($1, $2)"#,
                    todo_id,
                    tag_id
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await
    }
}
