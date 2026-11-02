use std::collections::HashSet;

use chrono::{DateTime, NaiveDate, Utc};
use serde::Deserialize;
use sqlx::types::Uuid;

use crate::modules::todos::{
    repository::{Todo, TodoStatus},
    transitions::{StatusInput, StatusState, TransitionError, apply_status, required_monday},
};

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

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Action {
    KeepTodo,
    KeepDoing,
    StillWaiting,
    ToIdeas,
    Pause,
    Delete,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub id: Uuid,
    pub action: Action,
    pub paused_until: Option<NaiveDate>,
}

/// A reviewable card as stored: its id and its status-dependent fields.
pub struct ReviewCard {
    pub id: Uuid,
    pub state: StatusState,
}

#[derive(Debug, PartialEq)]
pub enum Outcome {
    Update(StatusState),
    Delete,
}

#[derive(Debug, PartialEq)]
pub enum DecisionError {
    StillWaitingNeedsBlocked,
    PausedUntilNotLater,
    Transition(TransitionError),
}

impl From<TransitionError> for DecisionError {
    fn from(e: TransitionError) -> Self {
        DecisionError::Transition(e)
    }
}

impl DecisionError {
    pub fn message(&self) -> &'static str {
        match self {
            DecisionError::StillWaitingNeedsBlocked => {
                "still-waiting only applies to cards in Waiting on"
            }
            DecisionError::PausedUntilNotLater => "pausedUntil must be after the current week",
            DecisionError::Transition(e) => e.message(),
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum ReviewError {
    MissingDecisions(usize),
    UnknownCard(Uuid),
    DuplicateDecision(Uuid),
    Invalid(Uuid, DecisionError),
}

impl ReviewError {
    pub fn message(&self) -> String {
        match self {
            ReviewError::MissingDecisions(n) => format!("{n} card(s) have no decision"),
            ReviewError::UnknownCard(id) => format!("card {id} is not part of this review"),
            ReviewError::DuplicateDecision(id) => format!("card {id} has more than one decision"),
            ReviewError::Invalid(id, e) => format!("card {id}: {}", e.message()),
        }
    }
}

/// Applies one decision to one card.
pub fn apply_decision(
    state: StatusState,
    action: Action,
    paused_until: Option<NaiveDate>,
    week_start: NaiveDate,
    now: DateTime<Utc>,
) -> Result<Outcome, DecisionError> {
    match action {
        Action::Delete => Ok(Outcome::Delete),
        Action::KeepTodo => keep(state, TodoStatus::Todo, now),
        Action::KeepDoing => keep(state, TodoStatus::InProgress, now),
        Action::StillWaiting if state.status == TodoStatus::Blocked => Ok(Outcome::Update(state)),
        Action::StillWaiting => Err(DecisionError::StillWaitingNeedsBlocked),
        Action::ToIdeas => {
            let next = apply_status(state, TodoStatus::Idea, StatusInput::default(), now)?;

            Ok(Outcome::Update(next))
        }
        Action::Pause => pause(state, paused_until, week_start, now),
    }
}

fn keep(state: StatusState, to: TodoStatus, now: DateTime<Utc>) -> Result<Outcome, DecisionError> {
    let moved = apply_status(state, to, StatusInput::default(), now)?;

    Ok(Outcome::Update(StatusState {
        rollover_count: moved.rollover_count + 1,
        ..moved
    }))
}

fn pause(
    state: StatusState,
    paused_until: Option<NaiveDate>,
    week_start: NaiveDate,
    now: DateTime<Utc>,
) -> Result<Outcome, DecisionError> {
    let until = required_monday(paused_until)?;

    if until <= week_start {
        return Err(DecisionError::PausedUntilNotLater);
    }

    // A card whose pause ended is already Paused: `apply_status` would ignore it.
    if state.status == TodoStatus::Paused {
        return Ok(Outcome::Update(StatusState {
            paused_until: Some(until),
            status_changed_at: now,
            ..state
        }));
    }

    let input = StatusInput {
        paused_until: Some(until),
        ..StatusInput::default()
    };

    Ok(Outcome::Update(apply_status(
        state,
        TodoStatus::Paused,
        input,
        now,
    )?))
}

/// Checks that every card has exactly one decision, then applies them all.
/// Nothing is returned for a partial result: one error rejects the whole review.
pub fn plan_review(
    cards: Vec<ReviewCard>,
    decisions: &[Decision],
    week_start: NaiveDate,
    now: DateTime<Utc>,
) -> Result<Vec<(Uuid, Outcome)>, ReviewError> {
    let mut seen = HashSet::new();
    let known: HashSet<Uuid> = cards.iter().map(|c| c.id).collect();

    for d in decisions {
        if !known.contains(&d.id) {
            return Err(ReviewError::UnknownCard(d.id));
        }
        if !seen.insert(d.id) {
            return Err(ReviewError::DuplicateDecision(d.id));
        }
    }

    if seen.len() < cards.len() {
        return Err(ReviewError::MissingDecisions(cards.len() - seen.len()));
    }

    cards
        .into_iter()
        .map(|card| {
            let d = decisions
                .iter()
                .find(|d| d.id == card.id)
                .expect("every card has a decision");
            let outcome = apply_decision(card.state, d.action, d.paused_until, week_start, now)
                .map_err(|e| ReviewError::Invalid(card.id, e))?;

            Ok((card.id, outcome))
        })
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

    use chrono::TimeZone;

    fn now() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 11, 9, 8, 0, 0).unwrap()
    }

    fn state(status: TodoStatus) -> StatusState {
        StatusState {
            status,
            status_changed_at: Utc.with_ymd_and_hms(2026, 11, 1, 8, 0, 0).unwrap(),
            waiting_on: None,
            waiting_since: None,
            paused_until: None,
            completed_at: None,
            rollover_count: 2,
        }
    }

    fn waiting() -> StatusState {
        StatusState {
            waiting_on: Some("Marco".to_string()),
            waiting_since: Some(Utc.with_ymd_and_hms(2026, 11, 1, 8, 0, 0).unwrap()),
            ..state(TodoStatus::Blocked)
        }
    }

    fn decide(
        s: StatusState,
        a: Action,
        until: Option<NaiveDate>,
    ) -> Result<Outcome, DecisionError> {
        apply_decision(s, a, until, date(9), now())
    }

    fn updated(outcome: Result<Outcome, DecisionError>) -> StatusState {
        match outcome {
            Ok(Outcome::Update(s)) => s,
            other => panic!("expected an update, got {other:?}"),
        }
    }

    #[test]
    fn keep_todo_on_todo_bumps_rollover_only() {
        let before = state(TodoStatus::Todo);
        let after = updated(decide(before.clone(), Action::KeepTodo, None));

        assert_eq!(
            after,
            StatusState {
                rollover_count: 3,
                ..before
            }
        );
    }

    #[test]
    fn keep_todo_moves_a_doing_card_back() {
        let after = updated(decide(
            state(TodoStatus::InProgress),
            Action::KeepTodo,
            None,
        ));

        assert_eq!(after.status, TodoStatus::Todo);
        assert_eq!(after.rollover_count, 3);
        assert_eq!(after.status_changed_at, now());
    }

    #[test]
    fn keep_doing_bumps_rollover() {
        let after = updated(decide(
            state(TodoStatus::InProgress),
            Action::KeepDoing,
            None,
        ));

        assert_eq!(after.status, TodoStatus::InProgress);
        assert_eq!(after.rollover_count, 3);
    }

    #[test]
    fn keep_doing_clears_the_waiting_fields() {
        let after = updated(decide(waiting(), Action::KeepDoing, None));

        assert_eq!(after.status, TodoStatus::InProgress);
        assert_eq!(after.waiting_on, None);
        assert_eq!(after.waiting_since, None);
    }

    #[test]
    fn still_waiting_keeps_who_and_since() {
        let before = waiting();
        let after = updated(decide(before.clone(), Action::StillWaiting, None));

        assert_eq!(after, before);
    }

    #[test]
    fn still_waiting_is_rejected_outside_waiting_on() {
        let result = decide(state(TodoStatus::Todo), Action::StillWaiting, None);

        assert_eq!(result, Err(DecisionError::StillWaitingNeedsBlocked));
    }

    #[test]
    fn to_ideas_resets_rollover() {
        let after = updated(decide(state(TodoStatus::Todo), Action::ToIdeas, None));

        assert_eq!(after.status, TodoStatus::Idea);
        assert_eq!(after.rollover_count, 0);
    }

    #[test]
    fn pause_sets_the_return_week() {
        let after = updated(decide(
            state(TodoStatus::Todo),
            Action::Pause,
            Some(date(23)),
        ));

        assert_eq!(after.status, TodoStatus::Paused);
        assert_eq!(after.paused_until, Some(date(23)));
    }

    #[test]
    fn pause_again_replaces_the_return_week() {
        let due = StatusState {
            paused_until: Some(date(9)),
            ..state(TodoStatus::Paused)
        };
        let after = updated(decide(due, Action::Pause, Some(date(23))));

        assert_eq!(after.paused_until, Some(date(23)));
    }

    #[test]
    fn pause_needs_a_later_monday() {
        let todo = || state(TodoStatus::Todo);

        assert_eq!(
            decide(todo(), Action::Pause, None),
            Err(DecisionError::Transition(
                TransitionError::PausedUntilRequired
            ))
        );
        assert_eq!(
            decide(todo(), Action::Pause, Some(date(11))),
            Err(DecisionError::Transition(
                TransitionError::PausedUntilNotMonday
            ))
        );
        assert_eq!(
            decide(todo(), Action::Pause, Some(date(9))),
            Err(DecisionError::PausedUntilNotLater)
        );
    }

    #[test]
    fn delete_removes_the_card() {
        assert_eq!(
            decide(state(TodoStatus::Todo), Action::Delete, None),
            Ok(Outcome::Delete)
        );
    }

    fn card(n: u128) -> ReviewCard {
        ReviewCard {
            id: Uuid::from_u128(n),
            state: state(TodoStatus::Todo),
        }
    }

    fn keep_todo(n: u128) -> Decision {
        Decision {
            id: Uuid::from_u128(n),
            action: Action::KeepTodo,
            paused_until: None,
        }
    }

    fn plan(
        cards: Vec<ReviewCard>,
        decisions: Vec<Decision>,
    ) -> Result<Vec<(Uuid, Outcome)>, ReviewError> {
        plan_review(cards, &decisions, date(9), now())
    }

    #[test]
    fn a_full_decision_list_is_planned() {
        let planned = plan(vec![card(1), card(2)], vec![keep_todo(2), keep_todo(1)]).unwrap();

        assert_eq!(planned.len(), 2);
    }

    #[test]
    fn a_missing_decision_rejects_the_review() {
        let result = plan(vec![card(1), card(2)], vec![keep_todo(1)]);

        assert_eq!(result.unwrap_err(), ReviewError::MissingDecisions(1));
    }

    #[test]
    fn an_unknown_card_rejects_the_review() {
        let result = plan(vec![card(1)], vec![keep_todo(1), keep_todo(9)]);

        assert_eq!(
            result.unwrap_err(),
            ReviewError::UnknownCard(Uuid::from_u128(9))
        );
    }

    #[test]
    fn a_duplicate_decision_rejects_the_review() {
        let result = plan(vec![card(1), card(2)], vec![keep_todo(1), keep_todo(1)]);

        assert_eq!(
            result.unwrap_err(),
            ReviewError::DuplicateDecision(Uuid::from_u128(1))
        );
    }

    #[test]
    fn an_invalid_action_rejects_the_review() {
        let bad = Decision {
            action: Action::StillWaiting,
            ..keep_todo(1)
        };
        let result = plan(vec![card(1)], vec![bad]);

        assert_eq!(
            result.unwrap_err(),
            ReviewError::Invalid(Uuid::from_u128(1), DecisionError::StillWaitingNeedsBlocked)
        );
    }

    #[test]
    fn an_empty_review_is_valid() {
        assert_eq!(plan(vec![], vec![]), Ok(vec![]));
    }
}
