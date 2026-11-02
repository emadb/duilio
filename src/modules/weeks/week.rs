use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Utc};
use chrono_tz::{Europe::Rome, Tz};

/// Parses a user time zone name. An unknown name falls back to Europe/Rome.
pub fn parse_tz(name: &str) -> Tz {
    name.parse().unwrap_or(Rome)
}

/// The Monday of the week that contains `instant`, in the given time zone.
pub fn week_of(instant: DateTime<Utc>, tz: Tz) -> NaiveDate {
    let day = instant.with_timezone(&tz).date_naive();

    day - Duration::days(i64::from(day.weekday().num_days_from_monday()))
}

/// The instant the week starts: Monday 00:00 in the given time zone.
pub fn week_start_instant(week_start: NaiveDate, tz: Tz) -> DateTime<Utc> {
    let midnight = week_start
        .and_hms_opt(0, 0, 0)
        .expect("00:00:00 is always valid");

    tz.from_local_datetime(&midnight)
        .earliest()
        .map(|local| local.with_timezone(&Utc))
        .unwrap_or_else(|| Utc.from_utc_datetime(&midnight))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn utc(y: i32, m: u32, d: u32, h: u32, min: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, min, 0).unwrap()
    }

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    #[test]
    fn midweek_maps_to_its_monday() {
        // Wednesday 4 Nov 2026
        assert_eq!(week_of(utc(2026, 11, 4, 12, 0), Rome), date(2026, 11, 2));
    }

    #[test]
    fn monday_maps_to_itself() {
        assert_eq!(week_of(utc(2026, 11, 2, 10, 0), Rome), date(2026, 11, 2));
    }

    #[test]
    fn sunday_night_in_rome_is_still_the_old_week() {
        // Sunday 1 Nov 2026, 23:30 in Rome (22:30 UTC)
        assert_eq!(week_of(utc(2026, 11, 1, 22, 30), Rome), date(2026, 10, 26));
    }

    #[test]
    fn monday_00_30_in_rome_is_the_new_week() {
        // Monday 2 Nov 2026, 00:30 in Rome (23:30 UTC on Sunday)
        assert_eq!(week_of(utc(2026, 11, 1, 23, 30), Rome), date(2026, 11, 2));
    }

    #[test]
    fn boundary_holds_across_the_autumn_dst_change() {
        // DST ends on Sunday 25 Oct 2026 at 01:00 UTC. Rome is UTC+1 afterwards.
        assert_eq!(week_of(utc(2026, 10, 25, 22, 30), Rome), date(2026, 10, 19));
        assert_eq!(week_of(utc(2026, 10, 25, 23, 30), Rome), date(2026, 10, 26));
    }

    #[test]
    fn same_instant_differs_by_time_zone() {
        // Sunday 1 Nov 2026, 20:00 UTC: Sunday 21:00 in Rome, Monday 09:00 in Auckland
        let instant = utc(2026, 11, 1, 20, 0);
        let auckland = parse_tz("Pacific/Auckland");

        assert_eq!(week_of(instant, Rome), date(2026, 10, 26));
        assert_eq!(week_of(instant, auckland), date(2026, 11, 2));
    }

    #[test]
    fn week_start_instant_follows_the_utc_offset() {
        // Rome is UTC+1 in November, UTC+2 before the DST change on 25 Oct.
        assert_eq!(
            week_start_instant(date(2026, 11, 2), Rome),
            utc(2026, 11, 1, 23, 0)
        );
        assert_eq!(
            week_start_instant(date(2026, 10, 19), Rome),
            utc(2026, 10, 18, 22, 0)
        );
        // Auckland is UTC+13 in November.
        assert_eq!(
            week_start_instant(date(2026, 11, 2), parse_tz("Pacific/Auckland")),
            utc(2026, 11, 1, 11, 0)
        );
    }

    #[test]
    fn unknown_time_zone_falls_back_to_rome() {
        assert_eq!(parse_tz("Not/AZone"), Rome);
    }
}
