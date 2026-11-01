use std::collections::{BTreeMap, HashMap};

use chrono::{Duration, NaiveDate};
use chrono_tz::Tz;
use serde::Serialize;

use crate::modules::todos::repository::Todo;
use crate::modules::weeks::week::week_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogWeek {
    pub week_start: NaiveDate,
    pub count: usize,
    pub note: String,
    pub cards: Vec<Todo>,
}

/// Groups done cards by the week they were completed in, newest week first.
///
/// `review_notes` maps the week of a review to its note. The note describes the
/// week before the review, so it is shown on that earlier week. A week with a
/// note and no card still appears.
pub fn group_log(
    done: Vec<Todo>,
    review_notes: &HashMap<NaiveDate, String>,
    tz: Tz,
) -> Vec<LogWeek> {
    let mut weeks: BTreeMap<NaiveDate, Vec<Todo>> = BTreeMap::new();

    for card in done {
        if let Some(at) = card.completed_at {
            weeks.entry(week_of(at, tz)).or_default().push(card);
        }
    }
    for (reviewed_week, note) in review_notes {
        if !note.trim().is_empty() {
            weeks.entry(*reviewed_week - Duration::days(7)).or_default();
        }
    }

    weeks
        .into_iter()
        .rev()
        .map(|(week_start, mut cards)| {
            cards.sort_by_key(|c| std::cmp::Reverse(c.completed_at));

            LogWeek {
                week_start,
                count: cards.len(),
                note: review_notes
                    .get(&(week_start + Duration::days(7)))
                    .cloned()
                    .unwrap_or_default(),
                cards,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::EntityId;
    use crate::modules::todos::repository::TodoStatus;
    use chrono::{DateTime, TimeZone, Utc};
    use chrono_tz::Europe::Rome;

    fn utc(m: u32, d: u32, h: u32, min: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, m, d, h, min, 0).unwrap()
    }

    fn date(m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, m, d).unwrap()
    }

    fn done(title: &str, at: DateTime<Utc>) -> Todo {
        Todo {
            id: EntityId::new(),
            title: title.to_string(),
            description: String::new(),
            due_date: None,
            status: TodoStatus::Done,
            important: false,
            status_changed_at: at,
            waiting_on: None,
            waiting_since: None,
            paused_until: None,
            completed_at: Some(at),
            rollover_count: 0,
            tags: vec![],
        }
    }

    fn titles(week: &LogWeek) -> Vec<&str> {
        week.cards.iter().map(|c| c.title.as_str()).collect()
    }

    #[test]
    fn sunday_and_monday_night_in_rome_fall_in_different_weeks() {
        // 22:30 UTC Sunday 1 Nov is 23:30 in Rome. 23:30 UTC is 00:30 Monday 2 Nov in Rome.
        let cards = vec![
            done("sunday", utc(11, 1, 22, 30)),
            done("monday", utc(11, 1, 23, 30)),
        ];
        let log = group_log(cards, &HashMap::new(), Rome);

        assert_eq!(log.len(), 2);
        assert_eq!(
            (log[0].week_start, titles(&log[0])),
            (date(11, 2), vec!["monday"])
        );
        assert_eq!(
            (log[1].week_start, titles(&log[1])),
            (date(10, 26), vec!["sunday"])
        );
    }

    #[test]
    fn weeks_are_newest_first_and_cards_latest_first() {
        let cards = vec![
            done("a", utc(11, 3, 9, 0)),
            done("b", utc(11, 5, 9, 0)),
            done("old", utc(10, 20, 9, 0)),
        ];
        let log = group_log(cards, &HashMap::new(), Rome);

        assert_eq!(log[0].count, 2);
        assert_eq!(titles(&log[0]), vec!["b", "a"]);
        assert_eq!(log[1].week_start, date(10, 19));
    }

    #[test]
    fn a_review_note_belongs_to_the_week_before_the_review() {
        let notes = HashMap::from([(date(11, 2), "good week".to_string())]);
        let log = group_log(vec![done("a", utc(10, 28, 9, 0))], &notes, Rome);

        assert_eq!(log.len(), 1);
        assert_eq!(
            (log[0].week_start, log[0].note.as_str()),
            (date(10, 26), "good week")
        );
    }

    #[test]
    fn a_week_with_only_a_note_still_appears() {
        let notes = HashMap::from([(date(11, 9), "nothing finished".to_string())]);
        let log = group_log(vec![], &notes, Rome);

        assert_eq!(
            (log.len(), log[0].count, log[0].week_start),
            (1, 0, date(11, 2))
        );
    }

    #[test]
    fn an_empty_note_adds_no_week() {
        let notes = HashMap::from([(date(11, 9), "  ".to_string())]);

        assert!(group_log(vec![], &notes, Rome).is_empty());
    }
}
