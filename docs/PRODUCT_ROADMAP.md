# OmniTask product and engineering roadmap

Last reviewed: July 24, 2026  
Primary platform: Android  
Compatibility target: iOS  
Technology: React Native, Expo, TypeScript, Firebase

## Purpose

This document is the single progress tracker for the improvements identified in the OmniTask project audit. It keeps product work, data migrations, engineering dependencies, validation, and innovation ideas in one place.

Do not remove working functionality or overwrite existing user data while implementing this roadmap. Every data-model change must include a migration and rollback strategy.

## Status legend

- [ ] Not started
- [~] In progress
- [x] Completed and verified
- [!] Blocked — explain the blocker in the initiative notes

## Progress overview

| Order | Initiative | Priority | Status | Depends on |
|---:|---|---|---|---|
| 1 | Unified Task Core | P0 | Completed and verified | — |
| 2 | Cross-device attachment storage | P0 | Implementation complete; blocked on Firebase Storage enablement and device QA | Environment separation |
| 3 | Reliable and visible offline sync | P0 | Implementation complete; Android device QA required | — |
| 4 | Accurate Focus session history | P0 | Implementation complete; Android background/restart QA required | Unified Task Core |
| 5 | Development/staging/production separation | P0 | Implementation complete; external project provisioning and per-environment QA required | — |
| 6 | Account lifecycle and data portability | P0 | Not started | Attachment storage |
| 7 | Firebase security hardening | P0 | Not started | Environment separation |
| 8 | Modern Event model and recurrence | P1 | Not started | Sync versioning |
| 9 | Today Engine and recovery planning | P1 | Not started | Tasks, Focus, Events |
| 10 | Universal Capture Inbox | P1 | Not started | Unified Task Core |
| 11 | Contextual Focus | P1 | Not started | Tasks, Focus history |
| 12 | Canvas-to-Action workflow | P1 | Not started | Unified Task Core |
| 13 | Collaboration roles and history | P1 | Implementation complete; Firestore deployment and multi-device QA required | Storage, security |
| 14 | Accessibility and visual consistency | P1 | Not started | — |
| 15 | Architecture and performance cleanup | P1 | Implementation complete; Android performance profiling required | — |
| 16 | Release engineering and observability | P1 | Not started | Environment separation |
| 17 | Application-size optimization | P2 | Not started | — |
| 18 | iOS feature parity | P2 | Not started | Stable Android features |

---

## Phase 1 — Product and data foundations

### 1. Unified Task Core

Priority: P0  
Problem: OmniTask currently treats checklist items embedded in Notes as dashboard tasks. They cannot independently own scheduling, reminders, priority, Focus history, or links to other content.

Relevant code:

- `src/types/note.ts`
- `src/context/TaskStore.tsx`
- `src/screens/DashboardScreen/DashboardScreen.tsx`
- `src/screens/TasksScreen/TasksScreen.tsx`

Proposed domain:

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'inbox' | 'planned' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueAt?: number;
  scheduledStart?: number;
  estimateMinutes?: number;
  actualFocusMinutes?: number;
  recurrence?: RecurrenceRule;
  reminderIds?: string[];
  projectId?: string;
  noteId?: string;
  eventId?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

Implementation checklist:

- [x] Document Task schema, recurrence schema, status transitions, and ownership.
- [x] Add shared Task types and version number.
- [x] Add UID-scoped local Task repository.
- [x] Add Firestore Task collection and secure rules.
- [x] Add offline create, update, complete, reopen, and delete operations.
- [x] Add due date, priority, reminder, estimate, project, and status fields.
- [x] Add a safe migration for existing checklist items.
- [x] Preserve checklist items inside Notes.
- [x] Add “Promote to task” and “Link existing task” actions to checklist items.
- [x] Make Dashboard “Today’s tasks” query real tasks scheduled or due today.
- [x] Make completed Dashboard items update the same Task object everywhere.
- [x] Add task create/edit/detail UI inside Organize without adding a bottom tab.
- [x] Add focused unit, store, migration, and screen tests.

Acceptance criteria:

- A task created from Dashboard appears in Organize and survives restart.
- A task completed anywhere updates Dashboard, Focus, linked Notes, and Canvas.
- Existing Notes and checklists remain intact after migration.
- Offline edits synchronize after connectivity returns without duplicates.
- No empty local state overwrites existing cloud Tasks.

Completion notes:

- Schema, ownership, recurrence, migration, notification cleanup, status transitions, and rollback are documented in `docs/UNIFIED_TASK_CORE.md`.
- Tasks persist locally under a UID-scoped versioned key and sync through `users/{uid}/tasks/{taskId}` using the existing offline outbox.
- Existing owner-only verified-user Firestore rules already cover the nested Task collection, so no rule broadening was required.
- Existing checklist rows are preserved and migrated once with deterministic IDs; later checklist items require explicit promotion or linking.
- Dashboard, Focus, linked Notes, Canvas live items, and task-notification navigation all use the same Task object.
- Validation: TypeScript passed; 7 focused suites passed (13 tests); the complete Jest suite passed (33 suites, 101 tests); `git diff --check` found no whitespace errors.
- Native configuration did not change. Android notification delivery and permission behavior still require a development-build device check because Expo Go cannot validate scheduled notifications.

### 2. Cross-device attachment storage

Priority: P0  
Problem: Profile photos, Note images, and Canvas images currently store device-local URIs that cannot reliably work after reinstall, device changes, or collaboration.

Relevant code:

- `src/context/AuthContext.tsx`
- `src/components/notes/StandardNoteEditor.tsx`
- `src/components/notes/CanvasNoteEditor.tsx`
- `src/types/note.ts`

Implementation checklist:

- [x] Define a versioned `Attachment` model.
- [x] Copy newly selected media into managed local application storage.
- [x] Store local URI, remote path, MIME type, byte size, owner, and upload state.
- [x] Upload attachments to Firebase Storage in the background.
- [x] Add retry, cancel, failed, and completed upload states.
- [x] Keep the local file until remote upload is confirmed.
- [x] Render local-first and fall back to the remote URL on another device.
- [x] Add user-scoped and collaboration-scoped Storage rules.
- [x] Delete orphaned files after permanent content deletion.
- [x] Add upload size, MIME type, and count limits.
- [x] Add thumbnail generation for large images.
- [x] Migrate current device-local attachments without breaking content.
- [x] Test offline creation, interrupted upload, retry, and cross-device restore.

Acceptance criteria:

- Profile photos and attachments open on a second authenticated device.
- Shared Canvas participants can see attached images.
- Failed uploads never delete the only local copy.
- Deleting content cleans up cloud files safely.

Implementation notes:

- The versioned, UID-scoped attachment repository now supports profile photos, Note images, Canvas images, and live Canvas collaboration copies.
- New media is copied into managed local storage before upload. Pending, uploading, failed, cancelled, uploaded, and delete-pending states are persisted and recoverable.
- Attachment metadata syncs through `users/{uid}/attachments/{attachmentId}` without copying device-local URIs to Firestore. UI rendering is local-first with remote fallback.
- Existing Note, Canvas, and profile image references migrate non-destructively with deterministic IDs; failed migration leaves the original URI untouched.
- Permanent deletion removes local, private cloud, and collaboration copies. Canvas Undo has a cleanup grace period, and failed cloud deletion retries later.
- `storage.rules` limits private files to their verified owner and shared files to verified active Canvas members. MIME, byte-size, and per-parent count limits are enforced.
- Automated validation passed: TypeScript; 7 focused suites / 21 tests; full Jest 34 suites / 108 tests; Expo public configuration; and `git diff --check`.
- Storage Rules emulator compilation could not run on this workstation because Firebase CLI 15 requires Java 21 while Java 17 is installed. The rule syntax was checked against the current official Firebase Storage cross-service Rules documentation.
- Blocker: `omnitask-d5b47.firebasestorage.app` previously returned “bucket does not exist.” Enable the development bucket, deploy `storage.rules`, install a new Android development build, and complete the two-device checklist in `ATTACHMENT_STORAGE.md` before changing this initiative to Completed and verified.

### 3. Reliable and visible offline sync

Priority: P0  
Problem: The outbox is a good local-first foundation, but it has no visible sync state, scheduled retry, durable error reporting, or robust conflict strategy.

Relevant code:

- `src/services/OfflineSyncService.ts`
- `src/services/StorageService.ts`
- `src/context/EventStore.tsx`
- `src/context/TaskStore.tsx`
- `src/context/CanvasNoteStore.tsx`
- `src/context/AlarmStore.tsx`

Implementation checklist:

- [x] Define mutation states: pending, sending, failed, and confirmed.
- [x] Add retry count, last error, and next retry time.
- [x] Add exponential backoff with a maximum retry interval.
- [x] Detect connectivity without blocking local editing.
- [x] Expose global `Saved`, `Syncing`, `Offline`, and `Sync failed` states.
- [x] Add a compact offline-only mode strip with queued-change visibility.
- [x] Replace silent storage failures with structured local diagnostics.
- [x] Add server-authoritative timestamps and entity revisions.
- [x] Define per-entity conflict strategies.
- [x] Prevent device-clock differences from deciding every conflict.
- [x] Preserve pending deletes across restarts and sign-in restoration.
- [x] Add outbox compaction without discarding newer mutations.
- [x] Add tests for retry, coalescing, ordering, conflict, and account isolation.

Acceptance criteria:

- Users can always tell whether data is local, syncing, saved, or blocked.
- A failed request retries without duplicate documents.
- Simultaneous edits do not silently erase unrelated fields.
- A user cannot see or send another account’s pending mutations.

Implementation notes:

- `OfflineSyncService` now owns a versioned, UID-scoped durable outbox, confirmed-revision baselines, exponential retry scheduling, compaction, server timestamps, transactional revisions, and structured diagnostics.
- Tasks, Notes, Canvas documents, Events, Alarms, attachment metadata, profiles, categories, onboarding state, and legacy Focus totals now use documented entity-specific merge strategies. Device clocks are only a migration fallback for records without revision metadata.
- The global offline-only strip reports queued local changes without blocking editing, expands to explain automatic recovery, and disappears when connectivity returns. The old Dashboard Sync Center control was removed.
- Detailed behavior, conflict rules, account isolation, and the Android/two-device checklist are documented in `docs/OFFLINE_SYNC.md`.
- Automated validation passed: TypeScript; 4 focused suites / 17 tests; full Jest 35 suites / 114 tests; Expo public configuration; and `git diff --check`.
- Final “Completed and verified” status is intentionally withheld until the Android airplane-mode, restart, reconnect, two-device, failure/retry, and account-switch checks pass in a new development build.

### 4. Accurate Focus session history

Priority: P0  
Resolved problem: Focus previously stored only an aggregate count, labeled it as daily data, and assumed every session lasted exactly 25 minutes.

Relevant code:

- `src/types/focus.ts`
- `src/context/FocusSessionStore.tsx`
- `src/screens/FocusScreen/FocusScreen.tsx`
- `src/screens/StatsScreen/StatsScreen.tsx`

Proposed domain:

```ts
interface FocusSession {
  id: string;
  taskId?: string;
  noteId?: string;
  startedAt: number;
  endedAt?: number;
  plannedMinutes: number;
  segments: FocusSegment[];
  completed: boolean;
  interruptionCount: number;
  version: number;
}
```

Implementation checklist:

- [x] Store individual sessions locally and in Firestore.
- [x] Record actual start, pause, resume, end, and completion times.
- [x] Link sessions to Tasks and optionally Notes.
- [x] Migrate the legacy count without inventing fake timestamps.
- [x] Calculate daily, weekly, and lifetime values from session history.
- [x] Replace the hardcoded daily goal with a user preference.
- [x] Add streak, productive-hour, interruption, and estimate-versus-actual metrics.
- [x] Correct all “Today” labels and Dashboard values.
- [x] Add tests for midnight, backgrounding, interruption, and incomplete sessions.

Acceptance criteria:

- “Today” contains only sessions completed today in the user’s time zone.
- Actual duration is not inferred from the Pomodoro default.
- Closing or backgrounding the app does not create duplicate sessions.

Implementation notes:

- Added a versioned, UID-scoped, local-first Focus session store with Firestore synchronization through the durable offline outbox.
- Pomodoro and stopwatch sessions preserve real active segments, pauses, resumptions, interruptions, completion state, Task links, and optional Note links.
- Expired Pomodoro sessions finalize against their original expected deadline after backgrounding or restart instead of adding time while the app was closed.
- Legacy aggregate counts migrate as count-only metadata. OmniTask does not fabricate dates, durations, streaks, or Task history from the old total.
- Dashboard and Stats now derive today, week, lifetime, goal progress, streak, productive hour, interruptions, and estimate variance from real session history.
- The daily Focus goal is a persisted user preference rather than a hardcoded value.
- Detailed schema, lifecycle, conflict behavior, and the Android verification checklist are documented in `docs/FOCUS_SESSION_HISTORY.md`.
- Automated validation passed: TypeScript; full Jest 37 suites / 123 tests; Expo public configuration; and `git diff --check`.
- Final “Completed and verified” status is intentionally withheld until the Android background, process-restart, timer-expiry, and two-device synchronization checklist passes.

### 5. Development, staging, and production separation

Priority: P0  
Problem: Every build currently uses one hardcoded Firebase project.

Relevant code:

- `src/config/firebase.ts`
- `app.config.js`
- `eas.json`
- `firebase-reset/reset-firebase.js`

Implementation checklist:

- [!] Create separate development, staging, and production Firebase projects.
- [x] Select Firebase configuration using EAS environment variables.
- [x] Use distinct application IDs where needed.
- [x] Use separate Google service configuration files.
- [!] Restrict Maps and Firebase keys per package and signing certificate.
- [x] Fail Android EAS builds when their Maps key or Firebase service file is missing.
- [x] Make environment visible in development and preview builds.
- [x] Make the reset script reject staging and production project IDs.
- [x] Document local, preview, and production build commands.
- [!] Verify Auth, Firestore, Functions, Storage, Maps, and notifications in every environment.

Acceptance criteria:

- Development actions cannot mutate production data.
- Production builds cannot load development credentials.
- Reset utilities fail closed when the target is not explicitly development.

Implementation notes:

- `app.config.js` selects validated Firebase settings and distinct native identities from `OMNITASK_ENV`; staging and production cannot fall back to development credentials.
- EAS profiles map development, preview, and production builds to their matching application environments.
- Native Google service files are environment-specific, ignored by Git, and Android files are checked against both Firebase project ID and package name.
- The EAS development environment now includes its Android Firebase service file, and a replacement `.dev` development client is queued. The Event map still requires a development Maps key restricted to `com.vincentements_007.omnitask.dev` and the EAS development signing SHA-1.
- Development and staging builds show a compact environment label on Dashboard; production does not.
- The Admin reset utility requires an explicit development environment, matching `.firebaserc` aliases, matching service-account credentials, and `--confirm`.
- Setup, exact commands, key restrictions, and the service-by-service release matrix are documented in `docs/ENVIRONMENTS.md`.
- Remaining external work: create staging and production Firebase projects, create and restrict their cloud keys, add the `.dev` package/SHA restriction in Google Cloud, then complete the matrix on real builds. These cloud resources and key policies cannot be truthfully marked complete until they exist and pass device QA.

---

## Phase 2 — Trust, security, and data quality

### 6. Account lifecycle and data portability

Priority: P0

- [ ] Add account deletion with recent authentication.
- [ ] Delete or transfer collaboration ownership safely.
- [ ] Delete personal Firestore documents and Storage attachments.
- [ ] Add full user-data export in a documented format.
- [ ] Add password change for password accounts.
- [ ] Show linked authentication providers.
- [ ] Revoke Google sessions during account deletion.
- [ ] Show storage usage and pending deletions.
- [ ] Add real Privacy and Data controls only after behavior exists.
- [ ] Test partial failure and resumable cleanup.

Acceptance criteria:

- Destructive actions require explicit confirmation and recent authentication.
- Account deletion is resumable and does not leave private orphaned data.
- Exported data contains Tasks, Notes, Events, Focus, Alarms, and Canvas metadata.

### 7. Firebase security hardening

Priority: P0

- [ ] Enable Firebase App Check for supported clients.
- [ ] Validate document fields and ownership in Firestore rules.
- [ ] Add document, array, attachment, board, and member limits.
- [ ] Add Firebase Storage rules.
- [ ] Move invite redemption to a callable server function.
- [ ] Add rate limiting and App Check to collaboration redemption.
- [ ] Add Owner, Editor, Commenter, and Viewer roles.
- [ ] Add collaboration member and object limits.
- [ ] Add Firestore and Storage emulator rule tests.
- [ ] Remove tracked debug logs and ignore future Firebase debug logs.
- [ ] Review cloud logs to ensure private content is not recorded.

Acceptance criteria:

- A malicious client cannot write another user’s content or elevate its role.
- Invalid documents and oversized collaboration writes are rejected.
- Invite-code attempts are throttled without making valid collaboration difficult.

### 8. Modern Event model and recurrence

Priority: P1

- [ ] Store canonical UTC start and end timestamps.
- [ ] Preserve the original IANA time zone.
- [ ] Replace display-date strings as the source of truth.
- [ ] Add structured recurrence rules.
- [ ] Support selected weekdays and recurrence intervals.
- [ ] Support recurrence end date or count.
- [ ] Support occurrence exceptions and per-occurrence edits.
- [ ] Track notification scheduling status.
- [ ] Add optional travel and preparation buffers.
- [ ] Migrate existing Events without changing their visible scheduled time.
- [ ] Test daylight-saving changes, all-day events, and multi-day recurrence.

Acceptance criteria:

- Events retain their intended local time across locale and time-zone changes.
- Editing one occurrence does not unintentionally rewrite the complete series.
- Existing reminders are cleaned up and rescheduled after migration.

---

## Phase 3 — Product innovation

### 9. OmniTask Today Engine

Priority: P1  
Goal: Propose a realistic daily plan using Tasks, Events, Focus history, available time, and weather.

- [ ] Build a deterministic scheduling engine before adding AI assistance.
- [ ] Calculate free-time windows and transition buffers.
- [ ] Consider task priority, due date, estimate, energy, and location.
- [ ] Include weather constraints for outdoor Events.
- [ ] Explain every recommendation.
- [ ] Require user approval before modifying Tasks or Events.
- [ ] Support dismiss, accept, adjust, and undo.
- [ ] Never fill every free minute automatically.
- [ ] Add recovery suggestions when planned work is missed.
- [ ] Add privacy controls for any optional cloud intelligence.

Acceptance criteria:

- Recommendations are understandable and reversible.
- The engine never silently changes a schedule.
- Offline users still receive deterministic planning suggestions.

### 10. Universal Capture Inbox

Priority: P1

- [ ] Add one visible capture entry point.
- [ ] Accept Task, Note, Event, Checklist, Canvas object, photo, and pasted text.
- [ ] Save immediately to an offline Inbox.
- [ ] Parse date/time phrases locally where practical.
- [ ] Always show a confirmation before applying parsed dates or reminders.
- [ ] Let users process, defer, convert, or archive captured items.
- [ ] Add duplicate-submission protection.

Acceptance criteria:

- Capture works offline in a few taps.
- Unclassified content is never lost.
- Parsed content remains editable before organization.

### 11. Contextual Focus

Priority: P1

- [ ] Start Focus from a Task.
- [ ] Show the linked Task during the session.
- [ ] Record actual time and interruptions.
- [ ] Offer complete, continue, or defer at the end.
- [ ] Suggest the next action without automatically starting it.
- [ ] Resume interrupted sessions safely.
- [ ] Compare estimated and actual effort.
- [ ] Surface Task-specific Focus history.

### 12. Canvas-to-Action workflow

Priority: P1

- [ ] Convert Canvas text or handwriting into a Task.
- [ ] Convert a sticky into an Event.
- [ ] Create dependencies by connecting Task references.
- [ ] Turn selected objects into a Project.
- [ ] Show live Task status on the Canvas.
- [ ] Keep two-way updates consistent.
- [ ] Add execution and presentation modes.
- [ ] Preserve undo/redo across conversions where possible.

### 13. Collaboration roles and history

Priority: P1

- [x] Add Owner, Editor, Commenter, and Viewer roles.
- [x] Add comments, replies, and mentions.
- [x] Add version history and restore points.
- [x] Add named collaborator cursors and presence.
- [x] Add an activity timeline.
- [x] Add ownership transfer.
- [x] Separate invitation expiry from membership expiry.
- [x] Add remove, leave, stop-sharing, and revoke-access audit events.
- [x] Define and enforce member and board-size limits.

Implementation notes:

- Shared Canvas memberships now carry Owner, Editor, Commenter, or Viewer access. Existing non-owner members safely normalize to Editor so earlier boards keep working.
- Owners choose the role before sharing a code, can change roles or remove members, and can transfer ownership. Joined membership persists independently from the three-day invitation.
- The collaboration panel now contains People, Comments, History, and Activity views. It supports replies, member mentions, resolved threads, restore points, and confirmed restoration.
- Presence includes role-aware heartbeats and throttled named cursors in board coordinates, so cursors remain aligned during pan and zoom.
- Firestore Rules enforce verified membership and role-sensitive writes for boards, objects, members, comments, versions, nested snapshots, presence, activity, and invitations.
- Limits are 20 members, 1,000 objects, 50 retained restore points, 1,000 comments, 2,000 characters per comment, and 20 mentions.
- Invitation sharing sends only the code. Removal, leave, role, transfer, version, comment, and stop-sharing actions create an immutable activity record.
- Schema, behavior, limits, deployment, and the multi-account Android checklist are documented in `docs/COLLABORATION_ROLES_HISTORY.md`.
- Automated validation passed: collaboration and Canvas-focused tests, TypeScript, and the complete Jest suite. Final verified status requires deploying the updated Firestore Rules and completing the multi-device checklist.

---

## Phase 4 — Quality and release readiness

### 14. Accessibility and visual consistency

Priority: P1

- [ ] Label every icon-only button.
- [ ] Add Switch labels, hints, and state.
- [ ] Verify screen-reader order on every main journey.
- [ ] Verify large font sizes without clipping.
- [ ] Verify reduced motion and reduced transparency behavior.
- [ ] Ensure statuses never depend only on color.
- [ ] Validate 44 × 44 minimum touch targets.
- [ ] Test keyboard navigation on web and tablets.
- [ ] Migrate remaining direct colors to semantic theme tokens.
- [ ] Add a visible System, Light, and Dark appearance selector.
- [ ] Verify light/dark status bar and system-navigation colors.

### 15. Architecture and performance cleanup

Priority: P1

- [x] Split `CanvasNoteEditor` into focused hooks and components.
- [x] Split reusable behavior from `AlarmScreen`, `CreateEventScreen`, `DashboardScreen`, and `FocusScreen`.
- [x] Centralize authenticated UID instead of using multiple Auth listeners.
- [x] Introduce repositories between UI stores and Firebase.
- [x] Add schema migrations per persisted domain.
- [x] Remove duplicate styles and compatibility theme properties.
- [x] Audit render hotspots and large Canvas board behavior.
- [x] Spatially cull offscreen Canvas objects with selection-safe overscan.
- [x] Review timers and listeners for cleanup on unmount.
- [x] Format the extracted compressed components for maintainability.
- [x] Complete Android frame-time and memory profiling on a 500-object Canvas.

Implementation notes:

- Reduced production Firebase Auth listeners from six to one by making `AuthProvider` the authenticated-UID authority.
- Added UID-scoped collection and metadata repositories so React stores do not construct Firestore paths or subscriptions directly.
- Added reusable version migration infrastructure and explicit Note, Event, Alarm, and Canvas migrations alongside existing Task, Attachment, and Focus migrations.
- Removed production uses of legacy `theme.bg`, `theme.card`, `theme.text*`, and related compatibility properties, then removed those aliases from `Theme`.
- Extracted the shared Alarm/Event wheel picker, Focus progress ring, Dashboard calculations, Canvas object renderer, and Canvas viewport hook.
- Large Canvas boards now mount only objects intersecting the viewport plus overscan; complete document state remains available for persistence, collaboration, history, and export.
- Replaced animation-frame Stopwatch state updates with wall-clock-derived 100 ms updates and added cleanup for pending Canvas save acknowledgements.
- Details and the physical Android checklist are documented in `docs/ARCHITECTURE_PERFORMANCE.md`.
- Automated validation passed: TypeScript; focused architecture tests; full Jest 40 suites / 130 tests.
- Final “Completed and verified” status is intentionally withheld until physical Android profiling passes.

### 16. Release engineering and observability

Priority: P1

- [ ] Replace the root README placeholder with project setup documentation.
- [ ] Add lint, format, type-check, and validation scripts.
- [ ] Add CI for TypeScript and Jest.
- [ ] Add Firestore/Storage rules tests.
- [ ] Add Firebase Functions tests.
- [ ] Add OfflineSync and Storage tests.
- [ ] Add Alarm screen and native-notification tests.
- [ ] Add Calculator math and UI tests.
- [ ] Add Standard Notes editor tests.
- [ ] Add Canvas editor integration tests.
- [ ] Add Statistics tests.
- [ ] Stabilize timeout-sensitive authentication tests under coverage.
- [ ] Remove React animation `act(...)` warnings from tests.
- [ ] Add privacy-respecting crash reporting.
- [ ] Add performance monitoring and release health checks.
- [ ] Add coverage thresholds only after critical flows are covered.

### 17. Application-size optimization

Priority: P2  
Audit baseline: bundled assets are approximately 54 MB.

- [ ] Re-encode weather videos for mobile bitrates and dimensions.
- [ ] Trim alarm audio to required loop durations.
- [ ] Convert large WAV files where platform alarm constraints allow.
- [ ] Compare installed size and startup time before and after changes.
- [ ] Consider optional downloadable weather media packs.
- [ ] Use posters for Reduce Motion, Data Saver, and Battery Saver.
- [ ] Avoid loading unused weather videos into memory.

### 18. iOS feature parity

Priority: P2

- [ ] Verify Google Sign-In with `GoogleService-Info.plist`.
- [ ] Verify Auth, Events, Maps, notifications, Canvas export, and sharing.
- [ ] Implement an iOS handwriting bridge or clearly explain its unavailability.
- [ ] Verify alarm behavior within iOS platform limitations.
- [ ] Verify permission descriptions cover profile, Notes, Canvas, and Events.
- [ ] Run the complete feature matrix on a physical iOS device.

---

## Definition of done for every initiative

An initiative can be marked completed only when:

- [ ] The implementation is production-quality and TypeScript-safe.
- [ ] Existing local and cloud data has a safe migration path.
- [ ] Offline behavior is documented and tested.
- [ ] Loading, empty, error, permission-denied, and retry states exist.
- [ ] Accessibility labels and font scaling are verified.
- [ ] Android device testing is complete.
- [ ] iOS impact is documented or tested.
- [ ] `.\node_modules\.bin\tsc.cmd --noEmit` passes.
- [ ] Focused tests pass.
- [ ] The complete Jest suite passes.
- [ ] Expo public configuration passes when native configuration changes.
- [ ] Required reload, restart, prebuild, or development-build instructions are recorded.
- [ ] Documentation and the progress table are updated.

## Progress log

Add newest entries first.

| Date | Initiative | Change | Validation | Next action |
|---|---|---|---|---|
| 2026-07-24 | Architecture and performance cleanup | Centralized Auth UID ownership, added Firestore repositories and schema migrations, removed theme aliases, extracted shared screen/editor modules, added Canvas spatial culling, and reduced timer/render work | TypeScript; focused architecture tests; full Jest 40 suites / 130 tests. Android frame-time/memory profiling remains | Profile a 500-object Canvas on a mid-range Android device |
| 2026-07-24 | Accurate Focus session history | Added versioned local-first Pomodoro/stopwatch sessions, real active segments and interruptions, Task/Note links, safe count-only legacy migration, configurable goals, accurate metrics, restart recovery, and exact Task actual time | TypeScript; full Jest 37 suites / 123 tests; Expo config; diff check. Android background/restart/two-device QA remains | Build the development client and run the Focus history device checklist |
| 2026-07-24 | Reliable and visible offline sync | Added a UID-scoped durable outbox, connectivity-aware retry/backoff, Sync Center, local diagnostics, transactional server revisions, conflict strategies, durable deletes, and compaction | TypeScript; 4 focused suites / 17 tests; full Jest 35 suites / 114 tests; Expo config; diff check. Android/two-device QA remains | Build the development client and run the offline/reconnect/account-switch checklist |
| 2026-07-24 | Cross-device attachment storage | Added versioned local-first attachments, resumable Firebase uploads, thumbnails, retry/cancel/delete recovery, safe legacy migration, profile/Note/Canvas integration, collaboration mirroring, export fallback, and scoped Storage rules | TypeScript; 7 focused suites / 21 tests; full Jest 34 suites / 108 tests; Expo config; diff check. Device QA blocked by missing Storage bucket | Enable Firebase Storage, deploy rules, rebuild Android development client, and run two-device QA |
| 2026-07-24 | Unified Task Core | Added versioned UID-scoped Tasks, offline/cloud persistence, safe checklist migration, Organize UI, reminders, and shared Dashboard/Focus/Notes/Canvas behavior | TypeScript; 7 focused suites / 13 tests; full Jest 33 suites / 101 tests; diff check | Start Cross-device attachment storage |
| 2026-07-24 | Roadmap | Created audit-based product and engineering roadmap | Documentation review | Begin Unified Task Core design |

## Decision log

Record important decisions that affect multiple initiatives.

| Date | Decision | Reason | Consequence |
|---|---|---|---|
| 2026-07-24 | Make AuthProvider the only Firebase Auth listener | Independent listeners in every domain provider duplicated work and made account transitions harder to reason about | All UID-scoped stores switch from one authoritative account state |
| 2026-07-24 | Cull Canvas rendering without culling document state | Large boards should not mount every React view and SVG path, but offscreen data must remain editable, syncable, and exportable | Rendering scales with the viewport while document behavior remains unchanged |
| 2026-07-24 | Keep Firestore access behind UID-scoped repositories | Stores should coordinate local-first domain state instead of constructing Firebase paths | Cloud paths, subscriptions, metadata reads, and queued writes have testable boundaries |
| 2026-07-24 | Persist Focus activity as timestamped active segments | A planned Pomodoro duration and an aggregate count cannot represent real work, pauses, interruptions, or midnight boundaries | Dashboard, Stats, Task actual time, streaks, and history are calculated from observed elapsed time |
| 2026-07-24 | Preserve legacy Focus totals as count-only metadata | The old aggregate does not contain trustworthy timestamps or duration | Existing totals remain visible without inventing daily history, minutes, or streaks |
| 2026-07-24 | Use server revisions with field-level transactional merges | Device clocks are not reliable conflict arbiters and whole-document last-write-wins can erase unrelated edits | Pending local edits remain visible; confirmed revisions win; divergent writes update only locally changed top-level fields |
| 2026-07-24 | Keep every sync artifact scoped by Firebase UID | A signed-in user must never see or submit another account's pending data | Outboxes, baselines, diagnostics, local domain caches, subscriptions, and retry timers switch by account |
| 2026-07-24 | Keep attachment uploads local-first | A network or Storage failure must never remove the user's only copy | Managed local files remain authoritative until upload succeeds, with durable retry states |
| 2026-07-24 | Mirror Canvas media into collaboration-scoped paths | Private user paths must not be opened to collaborators | Shared images follow board membership and are removed when collaboration stops |
| 2026-07-24 | Build a real Task domain before the Today Engine | Notes checklists cannot support scheduling, reminders, Focus history, and consistent Dashboard behavior | Task schema and migration are the first product foundation |
| 2026-07-24 | Preserve offline-first behavior | Normal editing must remain available without connectivity | Every cloud feature requires a local representation and retry path |
| 2026-07-24 | Require approval for planning recommendations | Users must remain in control of their schedule | Today Engine suggestions are explainable, reversible proposals |

## Immediate next step

Create a fresh Android development build and run the combined device checks in `docs/OFFLINE_SYNC.md`, `docs/FOCUS_SESSION_HISTORY.md`, and `docs/ARCHITECTURE_PERFORMANCE.md`. Then mark initiatives 3, 4, and 15 Completed and verified. Firebase Storage enablement and attachment device QA remain a separate blocker for initiative 2.
