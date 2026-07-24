# Architecture and performance cleanup

Status: implementation complete; Android performance QA required  
Updated: 2026-07-24

## Outcomes

- Firebase Authentication now has one owner: `AuthProvider`. Task, Event, Canvas, Alarm, and Attachment providers consume its authenticated UID instead of installing independent Auth listeners.
- UID-scoped collection and metadata repositories own Firestore paths, subscriptions, reads, and queued mutations.
- Notes, Events, Alarms, Canvas documents, Tasks, Attachments, and Focus sessions have explicit versioned migration paths.
- Legacy theme aliases were removed. Production components use semantic theme tokens.
- Repeated Alarm/Event time-wheel UI, Focus progress rendering, Dashboard calculations, Canvas object rendering, and Canvas viewport selection were extracted into focused modules.

## Static baseline and result

| Area | Before | After |
|---|---:|---:|
| Production Firebase Auth listeners | 6 | 1 |
| `CanvasNoteEditor.tsx` | 908 lines | 870 lines plus focused object/viewport modules |
| `AlarmScreen.tsx` | 849 lines | 787 lines plus shared wheel picker |
| `CreateEventScreen.tsx` | 700 lines | 642 lines plus shared wheel picker |
| `DashboardScreen.tsx` | 564 lines | 520 lines plus dashboard utilities |
| `FocusScreen.tsx` | 649 lines | 634 lines plus shared progress ring |
| Stopwatch React updates while running | Up to display refresh rate | 10 updates per second |

Line count is not the objective by itself. The important change is that data access, migration, reusable UI, and viewport calculations now have independent boundaries and tests.

## Canvas rendering

`useCanvasViewportObjects` transforms screen bounds into board coordinates and keeps only intersecting objects plus a 180-pixel overscan area. Selected objects remain mounted even when offscreen. Drawings and anchored connectors use calculated geometry bounds.

The complete document remains in memory for saving, collaboration, undo/redo, export, snapping, grouping, and transformations; culling affects rendering only.

## Timer and listener lifecycle

- Store subscriptions are replaced when the authenticated UID changes and removed on unmount.
- Canvas orphan-cleanup and save-acknowledgement timers are cleared.
- Pomodoro, Focus metrics, Event weather, Alarm foreground reconciliation, Sync connectivity, and collaboration presence listeners retain explicit cleanup.
- Stopwatch display updates use a 100 ms interval derived from wall-clock time instead of a React state update on every animation frame.

## Automated validation

- TypeScript: `.\node_modules\.bin\tsc.cmd --noEmit`
- Focused architecture, repository, migration, Canvas viewport, Task-store, and Focus-store tests
- Complete Jest suite
- Expo public configuration
- Git whitespace validation

## Android performance QA

Use a mid-range physical Android device and a development build:

1. Open a Canvas with at least 500 mixed objects, including drawings, images, references, and connectors.
2. Pan across distant areas for 30 seconds, then pinch between 50% and 200%.
3. Confirm objects appear before entering the viewport and selected objects are not lost.
4. Record JS/UI frame rates and memory with the React Native performance monitor and Android Studio profiler.
5. Run a stopwatch for five minutes while navigating; confirm elapsed time remains accurate after backgrounding.
6. Sign out and sign into another account; verify previous-account data and listeners disappear.
7. Repeat with dark mode and increased system font size.

Device QA is required before changing the roadmap status to “Completed and verified.”
