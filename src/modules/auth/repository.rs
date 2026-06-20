use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, Pool, Postgres, types::Uuid};
use crate::modules::EntityId;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: EntityId,
    pub email: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn create(email: String, password: String) -> User {
        let hashed_password = bcrypt::hash(password, 10).unwrap();

        User {
            id: EntityId::from(Uuid::new_v4()),
            email,
            password_hash: hashed_password,
            created_at: Utc::now(),
        }
    }

    pub fn password_match(&self, password: String) -> bool {
        bcrypt::verify(password, &self.password_hash).unwrap_or(false)
    }
}

pub struct AuthRepository {
    pool: Pool<Postgres>,
}

impl AuthRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        AuthRepository { pool }
    }

    pub async fn get_by_email(&self, email: String) -> Result<Option<User>, Error> {
        sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, created_at
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create(&self, user: User) -> Result<User, Error> {
        let new_user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email, password_hash, created_at
            "#,
            user.id.0,
            user.email,
            user.password_hash
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(new_user)
    }
}
