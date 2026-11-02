use std::collections::HashMap;

use chrono::{DateTime, NaiveDate, Utc};
use serde::Serialize;
use sqlx::{Error, Pool, Postgres};

use crate::modules::EntityId;
use crate::modules::todos::repository::TodoRepository;
use crate::modules::todos::{repository::TodoStatus, transitions::StatusState};
use crate::modules::weeks::log::{LogWeek, group_log};
use crate::modules::weeks::review::{
    Decision, Outcome, ReviewCard, ReviewError, is_reviewable, plan_review,
};
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

/// Why a review was not completed.
#[derive(Debug)]
pub enum CompleteError {
    AlreadyReviewed,
    Invalid(ReviewError),
    Db(Error),
}

impl From<Error> for CompleteError {
    fn from(e: Error) -> Self {
        CompleteError::Db(e)
    }
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

    /// Applies every decision and marks the current week as reviewed, in one
    /// transaction. A rejected review changes nothing.
    pub async fn complete(
        &self,
        user_id: EntityId,
        decisions: &[Decision],
        note: Option<String>,
    ) -> Result<Week, CompleteError> {
        let week = self.current(user_id.clone()).await?;
        let now = Utc::now();
        let mut tx = self.pool.begin().await?;

        let reviewed_at = sqlx::query_scalar!(
            r#"
            SELECT reviewed_at
            FROM weeks
            WHERE user_id = $1 AND week_start = $2
            FOR UPDATE
            "#,
            user_id.0,
            week.week_start
        )
        .fetch_one(&mut *tx)
        .await?;

        if reviewed_at.is_some() {
            return Err(CompleteError::AlreadyReviewed);
        }

        let rows = sqlx::query!(
            r#"
            SELECT
                id,
                status as "status: TodoStatus",
                status_changed_at,
                waiting_on,
                waiting_since,
                paused_until,
                completed_at,
                rollover_count
            FROM todos
            WHERE user_id = $1 AND status NOT IN ('idea', 'done')
            FOR UPDATE
            "#,
            user_id.0
        )
        .fetch_all(&mut *tx)
        .await?;

        let cards = rows
            .into_iter()
            .map(|r| ReviewCard {
                id: r.id,
                state: StatusState {
                    status: r.status,
                    status_changed_at: r.status_changed_at,
                    waiting_on: r.waiting_on,
                    waiting_since: r.waiting_since,
                    paused_until: r.paused_until,
                    completed_at: r.completed_at,
                    rollover_count: r.rollover_count,
                },
            })
            .filter(|c| is_reviewable(&c.state.status, c.state.paused_until, week.week_start))
            .collect();

        let plan =
            plan_review(cards, decisions, week.week_start, now).map_err(CompleteError::Invalid)?;

        for (id, outcome) in plan {
            match outcome {
                Outcome::Delete => {
                    sqlx::query!(
                        r#"DELETE FROM todos WHERE id = $1 AND user_id = $2"#,
                        id,
                        user_id.0
                    )
                    .execute(&mut *tx)
                    .await?;
                }
                Outcome::Update(state) => {
                    sqlx::query!(
                        r#"
                        UPDATE todos
                        SET status = $3,
                            status_changed_at = $4,
                            waiting_on = $5,
                            waiting_since = $6,
                            paused_until = $7,
                            completed_at = $8,
                            rollover_count = $9,
                            updated_at = now()
                        WHERE id = $1 AND user_id = $2
                        "#,
                        id,
                        user_id.0,
                        state.status as TodoStatus,
                        state.status_changed_at,
                        state.waiting_on,
                        state.waiting_since,
                        state.paused_until,
                        state.completed_at,
                        state.rollover_count
                    )
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        let note = note.unwrap_or_default();
        sqlx::query!(
            r#"
            UPDATE weeks
            SET reviewed_at = $3, note = $4
            WHERE user_id = $1 AND week_start = $2
            "#,
            user_id.0,
            week.week_start,
            now,
            note
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(Week {
            reviewed_at: Some(now),
            note,
            ..week
        })
    }

    /// Completed cards grouped by the week they were completed in, newest week first.
    pub async fn log(&self, user_id: EntityId) -> Result<Vec<LogWeek>, Error> {
        let timezone =
            sqlx::query_scalar!(r#"SELECT timezone FROM users WHERE id = $1"#, user_id.0)
                .fetch_one(&self.pool)
                .await?;
        let notes = sqlx::query!(
            r#"SELECT week_start, note FROM weeks WHERE user_id = $1 AND note <> ''"#,
            user_id.0
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|r| (r.week_start, r.note))
        .collect::<HashMap<_, _>>();
        let done = TodoRepository::new(self.pool.clone())
            .list_done(user_id)
            .await?;

        Ok(group_log(done, &notes, parse_tz(&timezone)))
    }
}
