use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::modules::todos::repository::TodoStatus;

#[derive(Deserialize)]
struct Board {
    #[serde(default)]
    lists: Vec<TList>,
    #[serde(default)]
    cards: Vec<TCard>,
    #[serde(default)]
    checklists: Vec<TChecklist>,
}

#[derive(Deserialize)]
struct TList {
    id: String,
    name: String,
    #[serde(default)]
    closed: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TCard {
    name: String,
    #[serde(default)]
    desc: String,
    id_list: String,
    #[serde(default)]
    closed: bool,
    #[serde(default)]
    pos: f64,
    #[serde(default)]
    labels: Vec<TLabel>,
    id: String,
    date_last_activity: Option<DateTime<Utc>>,
}

#[derive(Deserialize)]
struct TLabel {
    #[serde(default)]
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TChecklist {
    id_card: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    check_items: Vec<TCheckItem>,
}

#[derive(Deserialize)]
struct TCheckItem {
    name: String,
    #[serde(default)]
    state: String,
    #[serde(default)]
    pos: f64,
}

/// A card ready to be inserted.
#[derive(Debug, PartialEq)]
pub struct NewCard {
    pub title: String,
    pub description: String,
    pub status: TodoStatus,
    pub tags: Vec<String>,
    /// Only for Done cards: the last activity in Trello.
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, PartialEq, Default)]
pub struct TrelloImport {
    pub cards: Vec<NewCard>,
    /// Archived cards, and cards of archived lists.
    pub archived: usize,
    /// Names of lists that do not match a Duilio list. Their cards are not imported.
    pub unknown_lists: Vec<String>,
}

/// How many cards go to each Duilio list.
#[derive(Debug, PartialEq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub idea: usize,
    pub todo: usize,
    pub in_progress: usize,
    pub blocked: usize,
    pub done: usize,
}

pub fn count_cards(cards: &[NewCard]) -> Counts {
    cards.iter().fold(Counts::default(), |mut c, card| {
        match card.status {
            TodoStatus::Idea => c.idea += 1,
            TodoStatus::Todo => c.todo += 1,
            TodoStatus::InProgress => c.in_progress += 1,
            TodoStatus::Blocked => c.blocked += 1,
            TodoStatus::Done => c.done += 1,
            // No Trello list maps to Paused: the first review sorts Waiting cards.
            TodoStatus::Paused => {}
        }
        c
    })
}

/// Parses a Trello board export and maps each open card to a Duilio card.
pub fn map_trello(json: &str) -> Result<TrelloImport, serde_json::Error> {
    let board: Board = serde_json::from_str(json)?;
    let lists: HashMap<&str, &TList> = board.lists.iter().map(|l| (l.id.as_str(), l)).collect();
    let mut out = TrelloImport::default();
    let mut cards: Vec<&TCard> = board.cards.iter().collect();
    cards.sort_by(|a, b| a.pos.total_cmp(&b.pos));

    for card in cards {
        let Some(list) = lists.get(card.id_list.as_str()) else {
            continue;
        };
        if card.closed || list.closed {
            out.archived += 1;
            continue;
        }
        let Some(status) = list_status(&list.name) else {
            if !out.unknown_lists.contains(&list.name) {
                out.unknown_lists.push(list.name.clone());
            }
            continue;
        };

        out.cards.push(NewCard {
            title: card.name.trim().to_string(),
            description: describe(card, &board.checklists),
            completed_at: (status == TodoStatus::Done)
                .then(|| card.date_last_activity.unwrap_or_else(Utc::now)),
            status,
            tags: tags(card),
        });
    }

    Ok(out)
}

/// Matches a Trello list name, ignoring case, spaces and dashes.
fn list_status(name: &str) -> Option<TodoStatus> {
    let key: String = name
        .chars()
        .filter(|c| c.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect();

    match key.as_str() {
        "maybe" => Some(TodoStatus::Idea),
        "todo" => Some(TodoStatus::Todo),
        "inprogress" => Some(TodoStatus::InProgress),
        "waiting" => Some(TodoStatus::Blocked),
        "done" => Some(TodoStatus::Done),
        _ => None,
    }
}

/// Same slug rule as the front-end: lowercase, spaces become dashes.
fn tags(card: &TCard) -> Vec<String> {
    let mut tags: Vec<String> = Vec::new();

    for label in &card.labels {
        let slug = label
            .name
            .trim()
            .to_lowercase()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("-");
        if !slug.is_empty() && !tags.contains(&slug) {
            tags.push(slug);
        }
    }

    tags
}

/// The card description followed by its checklists as markdown tasks.
fn describe(card: &TCard, checklists: &[TChecklist]) -> String {
    let mut text = card.desc.trim().to_string();

    for list in checklists.iter().filter(|c| c.id_card == card.id) {
        let mut items: Vec<&TCheckItem> = list.check_items.iter().collect();
        items.sort_by(|a, b| a.pos.total_cmp(&b.pos));

        if !text.is_empty() {
            text.push_str("\n\n");
        }
        if !list.name.trim().is_empty() {
            text.push_str(&format!("**{}**\n\n", list.name.trim()));
        }
        let lines: Vec<String> = items
            .iter()
            .map(|i| {
                let mark = if i.state == "complete" { "x" } else { " " };
                format!("- [{mark}] {}", i.name.trim())
            })
            .collect();
        text.push_str(&lines.join("\n"));
    }

    text
}

#[cfg(test)]
mod tests {
    use super::*;

    const BOARD: &str = r#"{
      "lists": [
        {"id":"l1","name":"Maybe"},
        {"id":"l2","name":"To-do"},
        {"id":"l3","name":"In progress"},
        {"id":"l4","name":"Waiting"},
        {"id":"l5","name":"Done"},
        {"id":"l6","name":"Someday"},
        {"id":"l7","name":"Old stuff","closed":true}
      ],
      "cards": [
        {"id":"c1","name":"Learn Rust","desc":"Read the book","idList":"l1","pos":1,
         "labels":[{"name":"Study Plan"},{"name":""},{"name":"study plan"}]},
        {"id":"c2","name":"Ship feature","idList":"l2","pos":2},
        {"id":"c3","name":"Review PR","idList":"l3","pos":3},
        {"id":"c4","name":"Contract","idList":"l4","pos":4},
        {"id":"c5","name":"Release 1.0","idList":"l5","pos":5,"dateLastActivity":"2026-10-20T10:00:00.000Z"},
        {"id":"c6","name":"Archived card","idList":"l2","pos":6,"closed":true},
        {"id":"c7","name":"Odd card","idList":"l6","pos":7},
        {"id":"c8","name":"Odd card 2","idList":"l6","pos":8},
        {"id":"c9","name":"In old list","idList":"l7","pos":9},
        {"id":"c10","name":"Plan trip","desc":"Summer","idList":"l2","pos":0}
      ],
      "checklists": [
        {"idCard":"c10","name":"Steps","checkItems":[
          {"name":"Book hotel","state":"incomplete","pos":2},
          {"name":"Pick dates","state":"complete","pos":1}]}
      ]
    }"#;

    fn import() -> TrelloImport {
        map_trello(BOARD).unwrap()
    }

    fn card<'a>(i: &'a TrelloImport, title: &str) -> &'a NewCard {
        i.cards.iter().find(|c| c.title == title).unwrap()
    }

    #[test]
    fn lists_map_to_statuses() {
        let i = import();

        assert_eq!(card(&i, "Learn Rust").status, TodoStatus::Idea);
        assert_eq!(card(&i, "Ship feature").status, TodoStatus::Todo);
        assert_eq!(card(&i, "Review PR").status, TodoStatus::InProgress);
        assert_eq!(card(&i, "Contract").status, TodoStatus::Blocked);
        assert_eq!(card(&i, "Release 1.0").status, TodoStatus::Done);
    }

    #[test]
    fn archived_cards_and_lists_are_skipped() {
        let i = import();

        assert_eq!(i.archived, 2);
        assert!(
            i.cards
                .iter()
                .all(|c| c.title != "Archived card" && c.title != "In old list")
        );
    }

    #[test]
    fn unknown_lists_are_reported_once_and_not_imported() {
        let i = import();

        assert_eq!(i.unknown_lists, vec!["Someday".to_string()]);
        assert!(i.cards.iter().all(|c| !c.title.starts_with("Odd card")));
    }

    #[test]
    fn labels_become_unique_slug_tags() {
        assert_eq!(
            card(&import(), "Learn Rust").tags,
            vec!["study-plan".to_string()]
        );
    }

    #[test]
    fn checklists_are_appended_as_markdown_tasks_in_order() {
        let i = import();

        assert_eq!(
            card(&i, "Plan trip").description,
            "Summer\n\n**Steps**\n\n- [x] Pick dates\n- [ ] Book hotel"
        );
    }

    #[test]
    fn done_cards_keep_their_last_activity() {
        let i = import();

        assert_eq!(
            card(&i, "Release 1.0").completed_at.map(|d| d.to_rfc3339()),
            Some("2026-10-20T10:00:00+00:00".to_string())
        );
        assert_eq!(card(&i, "Ship feature").completed_at, None);
    }

    #[test]
    fn waiting_cards_have_no_waiting_on_to_set() {
        // NewCard has no waiting field: the endpoint leaves it empty (spec rule).
        assert_eq!(card(&import(), "Contract").status, TodoStatus::Blocked);
    }

    #[test]
    fn cards_follow_the_trello_order() {
        assert_eq!(import().cards[0].title, "Plan trip");
    }

    #[test]
    fn cards_are_counted_per_list() {
        let c = count_cards(&import().cards);

        assert_eq!(
            c,
            Counts {
                idea: 1,
                todo: 2,
                in_progress: 1,
                blocked: 1,
                done: 1
            }
        );
    }

    #[test]
    fn invalid_json_is_an_error() {
        assert!(map_trello("not json").is_err());
    }
}
