use chrono::NaiveDate;

use crate::modules::todos::repository::{Todo, TodoStatus};

/// A card needs a decision when it is open work, or when its pause has ended.
pub fn is_reviewable(
    status: &TodoStatus,
    paused_until: Option<NaiveDate>,
    week_start: NaiveDate,
) -> bool {
    match status {
        TodoStatus::Todo | TodoStatus::InProgress | TodoStatus::Blocked => true,
        TodoStatus::Paused => paused_until.is_none_or(|until| until <= week_start),
        TodoStatus::Idea | TodoStatus::Done => false,
    }
}

/// Keeps the cards that need a decision this week.
pub fn review_cards(todos: Vec<Todo>, week_start: NaiveDate) -> Vec<Todo> {
    todos
        .into_iter()
        .filter(|t| is_reviewable(&t.status, t.paused_until, week_start))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, d).unwrap()
    }

    #[test]
    fn open_statuses_are_reviewable() {
        for status in [
            TodoStatus::Todo,
            TodoStatus::InProgress,
            TodoStatus::Blocked,
        ] {
            assert!(is_reviewable(&status, None, date(9)));
        }
    }

    #[test]
    fn ideas_and_done_are_not_reviewable() {
        assert!(!is_reviewable(&TodoStatus::Idea, None, date(9)));
        assert!(!is_reviewable(&TodoStatus::Done, None, date(9)));
    }

    #[test]
    fn paused_card_returns_in_its_week() {
        assert!(is_reviewable(&TodoStatus::Paused, Some(date(9)), date(9)));
    }

    #[test]
    fn paused_card_returns_after_a_skipped_week() {
        assert!(is_reviewable(&TodoStatus::Paused, Some(date(2)), date(16)));
    }

    #[test]
    fn paused_card_stays_hidden_before_its_week() {
        assert!(!is_reviewable(&TodoStatus::Paused, Some(date(16)), date(9)));
    }
}
