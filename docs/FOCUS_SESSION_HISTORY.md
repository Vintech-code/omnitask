# Accurate Focus session history

Last updated: July 24, 2026  
Session schema version: 1  
Preference schema version: 1

## Data model

Each Focus period is stored as an independent document:

```text
users/{uid}/focusSessions/{sessionId}
```

A session records:

- Pomodoro or Stopwatch source;
- active, paused, completed, or abandoned status;
- optional linked Task and Note;
- actual start and end timestamps;
- planned minutes;
- completed flag;
- interruption count;
- start/end segments for every pause and resume;
- exact elapsed milliseconds;
- created, updated, and schema-version fields.

Segment history is authoritative for elapsed time. Background time continues when a session is active. Paused time is excluded. An expired Pomodoro restored after backgrounding or restart ends at its calculated deadline rather than at the later time the app was reopened.

## Offline and cloud behavior

Sessions are saved first under the UID-scoped local key:

```text
omnitask_focus_sessions_v1:{uid}
```

They then use the shared durable Firestore outbox. Pending local sessions remain authoritative until confirmed; confirmed server revisions win afterward. Concurrent changes use the same field-level transactional merge as Tasks, Notes, Events, Alarms, and Canvas documents.

Daily-goal preferences sync through:

```text
users/{uid}/meta/focusPreferences
```

The default remains 200 minutes, matching the previous eight 25-minute sessions. Users can select a 60-, 120-, or 200-minute goal from Focus options.

## Timer lifecycle

### Pomodoro

- Starting creates an active session and links the selected Task and Note.
- Pausing closes the active segment and increments the interruption count.
- Resuming creates a new segment.
- Completion closes the session at the exact timer deadline.
- Resetting, skipping, or changing modes closes elapsed work as abandoned, preserving its actual minutes without counting it as a completed session.
- An expired active session auto-completes after backgrounding or restart.

### Stopwatch

- Starting creates an active Stopwatch session.
- Pausing records an interruption.
- Resuming creates another segment.
- Finish closes a completed session with its exact duration.

Completed or abandoned time linked to a Task updates `actualFocusMinutes` once. Starting a linked Task also moves it to `in-progress`.

## Legacy migration

Previous OmniTask versions stored only an aggregate session count. Migration preserves the highest UID-scoped local/cloud count in:

```text
users/{uid}/meta/focusLegacySummary
```

No `FocusSession` documents, dates, start times, or 25-minute durations are fabricated. Statistics clearly identify these count-only legacy sessions and exclude them from actual-minute calculations.

## Metrics

OmniTask calculates:

- actual focused minutes today, this week, and across recorded history;
- completed sessions today and over the lifetime count;
- user-goal progress;
- consecutive days meeting the selected minute goal;
- interruption total;
- most productive hour by actual segment duration;
- linked Task estimate-versus-actual variance.

Sessions crossing midnight are split at the local day boundary for minute totals. Completion count belongs to the day the session ended.

## Validation checklist

Automated tests cover segment timing, pause/resume, interruptions, background elapsed time, deadline restoration, midnight splitting, incomplete sessions, legacy migration, goal persistence, streaks, productive hour, Task linking, Note linking, and actual Task minutes.

Final Android development-build checks:

1. Start a linked Pomodoro and background OmniTask for longer than its remaining time.
2. Reopen it and confirm the session completed at the original deadline.
3. Pause for at least one minute, resume, and confirm paused time is excluded.
4. Restart the app during an active and then a paused session; confirm both states restore.
5. Reset a partially completed timer; confirm minutes appear in history but completed-session count does not increase.
6. Run a Stopwatch, pause/resume, then finish it.
7. Change the daily goal and confirm Dashboard/Statistics update after restart and on a second device.
8. Confirm the notification fires in a development build; Expo Go cannot validate scheduled notification behavior.
