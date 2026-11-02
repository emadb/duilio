use chrono::{DateTime, Datelike, NaiveDate, Utc, Weekday};

use crate::modules::todos::repository::TodoStatus;

/// The status-dependent fields of a todo. Everything a status change can touch.
#[derive(Debug, Clone, PartialEq)]
pub struct StatusState {
    pub status: TodoStatus,
    pub status_changed_at: DateTime<Utc>,
    pub waiting_on: Option<String>,
    pub waiting_since: Option<DateTime<Utc>>,
    pub paused_until: Option<NaiveDate>,
    pub completed_at: Option<DateTime<Utc>>,
    pub rollover_count: i32,
}

/// Extra data the caller supplies with a status change.
#[derive(Debug, Clone, Default)]
pub struct StatusInput {
    pub waiting_on: Option<String>,
    pub paused_until: Option<NaiveDate>,
}

#[derive(Debug, PartialEq)]
pub enum TransitionError {
    WaitingOnRequired,
    PausedUntilRequired,
    PausedUntilNotMonday,
}

impl TransitionError {
    pub fn message(&self) -> &'static str {
        match self {
            TransitionError::WaitingOnRequired => "waitingOn is required for status blocked",
            TransitionError::PausedUntilRequired => "pausedUntil is required for status paused",
            TransitionError::PausedUntilNotMonday => "pausedUntil must be a Monday",
        }
    }
}

/// The state a card starts from before its first status is applied.
pub fn new_state(now: DateTime<Utc>) -> StatusState {
    StatusState {
        status: TodoStatus::Idea,
        status_changed_at: now,
        waiting_on: None,
        waiting_since: None,
        paused_until: None,
        completed_at: None,
        rollover_count: 0,
    }
}

/// Moves a todo to `to`. Setting the same status again changes nothing, except
/// the data of that status: a new `waiting_on` for a blocked card, or a new
/// `paused_until` for a paused one.
pub fn apply_status(
    state: StatusState,
    to: TodoStatus,
    input: StatusInput,
    now: DateTime<Utc>,
) -> Result<StatusState, TransitionError> {
    if state.status == to {
        return same_status(state, input, now);
    }

    let waiting_on = match to {
        TodoStatus::Blocked => Some(required_waiting_on(input.waiting_on)?),
        _ => None,
    };
    let paused_until = match to {
        TodoStatus::Paused => Some(required_monday(input.paused_until)?),
        _ => None,
    };

    Ok(StatusState {
        status: to.clone(),
        status_changed_at: now,
        waiting_since: waiting_on.as_ref().map(|_| now),
        waiting_on,
        paused_until,
        completed_at: (to == TodoStatus::Done).then_some(now),
        rollover_count: if to == TodoStatus::Idea {
            0
        } else {
            state.rollover_count
        },
    })
}

/// A card that stays in its status may still get new data for it.
/// A new person starts a new wait, so `waiting_since` restarts. The same name changes nothing.
fn same_status(
    state: StatusState,
    input: StatusInput,
    now: DateTime<Utc>,
) -> Result<StatusState, TransitionError> {
    match state.status {
        TodoStatus::Blocked => match input.waiting_on {
            Some(raw) => {
                let name = required_waiting_on(Some(raw))?;

                if state.waiting_on.as_deref() == Some(name.as_str()) {
                    return Ok(state);
                }

                Ok(StatusState {
                    waiting_on: Some(name),
                    waiting_since: Some(now),
                    ..state
                })
            }
            None => Ok(state),
        },
        TodoStatus::Paused => match input.paused_until {
            Some(date) => Ok(StatusState {
                paused_until: Some(required_monday(Some(date))?),
                ..state
            }),
            None => Ok(state),
        },
        _ => Ok(state),
    }
}

fn required_waiting_on(value: Option<String>) -> Result<String, TransitionError> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or(TransitionError::WaitingOnRequired)
}

pub fn required_monday(value: Option<NaiveDate>) -> Result<NaiveDate, TransitionError> {
    let date = value.ok_or(TransitionError::PausedUntilRequired)?;

    match date.weekday() {
        Weekday::Mon => Ok(date),
        _ => Err(TransitionError::PausedUntilNotMonday),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn at(day: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 11, day, 9, 0, 0).unwrap()
    }

    fn state(status: TodoStatus) -> StatusState {
        StatusState {
            status,
            status_changed_at: at(1),
            waiting_on: None,
            waiting_since: None,
            paused_until: None,
            completed_at: None,
            rollover_count: 2,
        }
    }

    fn monday() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, 9).unwrap()
    }

    #[test]
    fn same_status_changes_nothing() {
        let before = state(TodoStatus::Todo);
        let after = apply_status(
            before.clone(),
            TodoStatus::Todo,
            StatusInput::default(),
            at(5),
        );

        assert_eq!(after, Ok(before));
    }

    #[test]
    fn change_sets_status_changed_at() {
        let after = apply_status(
            state(TodoStatus::Todo),
            TodoStatus::InProgress,
            StatusInput::default(),
            at(5),
        )
        .unwrap();

        assert_eq!(after.status, TodoStatus::InProgress);
        assert_eq!(after.status_changed_at, at(5));
        assert_eq!(after.rollover_count, 2);
    }

    #[test]
    fn done_sets_completed_at_and_leaving_clears_it() {
        let done = apply_status(
            state(TodoStatus::InProgress),
            TodoStatus::Done,
            StatusInput::default(),
            at(5),
        )
        .unwrap();
        assert_eq!(done.completed_at, Some(at(5)));

        let reopened = apply_status(done, TodoStatus::Todo, StatusInput::default(), at(6)).unwrap();
        assert_eq!(reopened.completed_at, None);
    }

    #[test]
    fn blocked_requires_waiting_on() {
        for waiting_on in [None, Some("   ".to_string())] {
            let input = StatusInput {
                waiting_on,
                paused_until: None,
            };
            let result = apply_status(state(TodoStatus::Todo), TodoStatus::Blocked, input, at(5));

            assert_eq!(result, Err(TransitionError::WaitingOnRequired));
        }
    }

    #[test]
    fn blocked_sets_who_and_since_and_leaving_clears_them() {
        let input = StatusInput {
            waiting_on: Some(" Marco ".to_string()),
            paused_until: None,
        };
        let blocked =
            apply_status(state(TodoStatus::Todo), TodoStatus::Blocked, input, at(5)).unwrap();
        assert_eq!(blocked.waiting_on.as_deref(), Some("Marco"));
        assert_eq!(blocked.waiting_since, Some(at(5)));

        let back = apply_status(blocked, TodoStatus::Todo, StatusInput::default(), at(6)).unwrap();
        assert_eq!(back.waiting_on, None);
        assert_eq!(back.waiting_since, None);
    }

    #[test]
    fn paused_requires_a_monday() {
        let missing = apply_status(
            state(TodoStatus::Todo),
            TodoStatus::Paused,
            StatusInput::default(),
            at(5),
        );
        assert_eq!(missing, Err(TransitionError::PausedUntilRequired));

        let tuesday = StatusInput {
            waiting_on: None,
            paused_until: NaiveDate::from_ymd_opt(2026, 11, 10),
        };
        let not_monday = apply_status(state(TodoStatus::Todo), TodoStatus::Paused, tuesday, at(5));
        assert_eq!(not_monday, Err(TransitionError::PausedUntilNotMonday));
    }

    #[test]
    fn paused_sets_return_week_and_leaving_clears_it() {
        let input = StatusInput {
            waiting_on: None,
            paused_until: Some(monday()),
        };
        let paused =
            apply_status(state(TodoStatus::Todo), TodoStatus::Paused, input, at(5)).unwrap();
        assert_eq!(paused.paused_until, Some(monday()));

        let back = apply_status(paused, TodoStatus::Todo, StatusInput::default(), at(6)).unwrap();
        assert_eq!(back.paused_until, None);
    }

    #[test]
    fn idea_resets_rollover_count() {
        let after = apply_status(
            state(TodoStatus::Todo),
            TodoStatus::Idea,
            StatusInput::default(),
            at(5),
        )
        .unwrap();

        assert_eq!(after.rollover_count, 0);
    }

    fn blocked_by(name: &str) -> StatusState {
        StatusState {
            waiting_on: Some(name.to_string()),
            waiting_since: Some(at(2)),
            ..state(TodoStatus::Blocked)
        }
    }

    fn with_waiting_on(name: &str) -> StatusInput {
        StatusInput {
            waiting_on: Some(name.to_string()),
            ..StatusInput::default()
        }
    }

    #[test]
    fn blocked_card_takes_a_new_waiting_on() {
        let after = apply_status(
            blocked_by("Marco"),
            TodoStatus::Blocked,
            with_waiting_on("  Anna "),
            at(5),
        )
        .unwrap();

        assert_eq!(after.waiting_on.as_deref(), Some("Anna"));
        assert_eq!(after.waiting_since, Some(at(5)));
        assert_eq!(after.status_changed_at, at(1));
    }

    #[test]
    fn blocked_card_with_the_same_name_keeps_its_since() {
        let before = blocked_by("Marco");
        let after = apply_status(
            before.clone(),
            TodoStatus::Blocked,
            with_waiting_on("Marco"),
            at(5),
        );

        assert_eq!(after, Ok(before));
    }

    #[test]
    fn blocked_card_without_a_name_gets_one() {
        let imported = state(TodoStatus::Blocked);
        let after = apply_status(
            imported,
            TodoStatus::Blocked,
            with_waiting_on("Marco"),
            at(5),
        )
        .unwrap();

        assert_eq!(after.waiting_on.as_deref(), Some("Marco"));
        assert_eq!(after.waiting_since, Some(at(5)));
    }

    #[test]
    fn blocked_card_rejects_an_empty_new_name() {
        let after = apply_status(
            blocked_by("Marco"),
            TodoStatus::Blocked,
            with_waiting_on("   "),
            at(5),
        );

        assert_eq!(after, Err(TransitionError::WaitingOnRequired));
    }

    #[test]
    fn blocked_card_without_input_is_unchanged() {
        let before = blocked_by("Marco");
        let after = apply_status(
            before.clone(),
            TodoStatus::Blocked,
            StatusInput::default(),
            at(5),
        );

        assert_eq!(after, Ok(before));
    }

    #[test]
    fn paused_card_takes_a_new_return_week() {
        let paused = StatusState {
            paused_until: Some(monday()),
            ..state(TodoStatus::Paused)
        };
        let later = NaiveDate::from_ymd_opt(2026, 11, 23).unwrap();
        let input = StatusInput {
            paused_until: Some(later),
            ..StatusInput::default()
        };
        let after = apply_status(paused, TodoStatus::Paused, input, at(5)).unwrap();

        assert_eq!(after.paused_until, Some(later));
        assert_eq!(after.status_changed_at, at(1));
    }

    #[test]
    fn paused_card_rejects_a_return_week_that_is_not_a_monday() {
        let paused = StatusState {
            paused_until: Some(monday()),
            ..state(TodoStatus::Paused)
        };
        let input = StatusInput {
            paused_until: NaiveDate::from_ymd_opt(2026, 11, 11),
            ..StatusInput::default()
        };

        assert_eq!(
            apply_status(paused, TodoStatus::Paused, input, at(5)),
            Err(TransitionError::PausedUntilNotMonday)
        );
    }
}
