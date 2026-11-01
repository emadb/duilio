use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::{Error, Pool, Postgres};

use crate::modules::EntityId;
use crate::modules::weeks::week::{parse_tz, week_of, week_start_instant};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Week {
    pub week_start: NaiveDate,
    /// The instant the week starts in the user's time zone.
    pub starts_at: DateTime<Utc>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub note: String,
}

pub struct WeekRepository {
    pool: Pool<Postgres>,
}

impl WeekRepository {
    pub fn new(pool: Pool<Postgres>) -> Self {
        WeekRepository { pool }
    }

    /// Returns the user's current week, creating its row on first access.
    pub async fn current(&self, user_id: EntityId) -> Result<Week, Error> {
        let timezone =
            sqlx::query_scalar!(r#"SELECT timezone FROM users WHERE id = $1"#, user_id.0)
                .fetch_one(&self.pool)
                .await?;
        let tz = parse_tz(&timezone);
        let week_start = week_of(Utc::now(), tz);

        sqlx::query!(
            r#"
            INSERT INTO weeks (user_id, week_start)
            VALUES ($1, $2)
            ON CONFLICT (user_id, week_start) DO NOTHING
            "#,
            user_id.0,
            week_start
        )
        .execute(&self.pool)
        .await?;

        let row = sqlx::query!(
            r#"
            SELECT reviewed_at, note
            FROM weeks
            WHERE user_id = $1 AND week_start = $2
            "#,
            user_id.0,
            week_start
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Week {
            week_start,
            starts_at: week_start_instant(week_start, tz),
            reviewed_at: row.reviewed_at,
            note: row.note,
        })
    }
}
