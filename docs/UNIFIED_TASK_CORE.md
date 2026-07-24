# Unified Task Core

Status: implemented for schema version 1  
Owner boundary: Firebase Authentication UID

## Data ownership and storage

Every Task belongs to the signed-in Firebase user. The app stores Tasks locally under the UID-scoped `omnitask_unified_tasks_v1:{uid}` key and synchronizes them through the existing offline outbox to:

```text
users/{uid}/tasks/{taskId}
```

The existing Firestore rule for `users/{uid}/{document=**}` permits access only when the authenticated, email-verified user owns that UID. Google identities verified by Firebase use the same ownership boundary.

Local writes happen first. Cloud set/delete operations are queued afterward, so creating, editing, completing, reopening, and deleting a Task remain usable offline. Snapshot merging compares `updatedAt` and never replaces a newer non-empty local collection with an older cloud snapshot.

## Version 1 schema

`src/types/task.ts` is the source of truth. A Task has:

- Identity and version: `id`, `version`
- Action content: `title`, optional `description`
- Workflow: `status`, `priority`
- Planning: optional `dueAt`, `scheduledStart`, `estimateMinutes`, `projectId`
- Focus history: optional `actualFocusMinutes`
- Recurrence: `frequency` plus a positive `interval`
- Reminders: requested lead times and scheduled notification identifiers
- Links: optional Note/checklist IDs and optional Event ID
- Audit fields: `createdAt`, `updatedAt`, optional `completedAt`

All dates are epoch milliseconds in the device's local time zone. Task ownership is not duplicated into each object because the UID-scoped local key and Firestore path are authoritative.

## Status transitions

```text
Inbox -> Planned -> In progress -> Completed
   ^         ^            |          |
   +---------+------------+----------+
                  reopen
```

- New tasks default to `inbox`.
- Adding a planned start or due date does not silently change status; the user controls status explicitly.
- Starting a Pomodoro for a linked Task moves it to `in-progress`.
- Completing a non-recurring Task sets `completedAt`.
- Reopening uses `planned` when the Task has a due date and `inbox` otherwise.
- Completing a recurring Task advances its due date and returns it to `planned` while preserving the last `completedAt`.

## Recurrence and reminders

Version 1 supports `none`, `daily`, `weekly`, and `monthly`, with an interval of at least one. One-time reminders use an absolute date. Recurring reminders use the corresponding Expo calendar trigger. Updating or deleting a Task cancels its previously scheduled identifiers before replacing them.

Reminder permission is requested only when a Task with reminders is saved. If permission is denied, the Task remains saved and the editor reports that only its reminder could not be scheduled.

## Checklist migration and links

Migration is non-destructive and idempotent:

1. Active pre-existing checklist items receive deterministic Task IDs.
2. The checklist item remains inside its Note.
3. The checklist receives `linkedTaskId`; the Task receives `noteId` and `checklistItemId`.
4. Title and completion state are reconciled using the newest `updatedAt`.
5. A UID-scoped migration-version marker prevents new checklist items from being promoted automatically after version 1 migration.

After migration, users can explicitly promote another checklist item or attach an existing Task. Linked title and completion changes update the same Task and checklist item. Deleting a Task unlinks but does not delete its source checklist item.

Legacy Canvas cards that referenced `noteId + checklistItemId` resolve through hidden aliases to the real Task. New Canvas live cards store the Task ID directly.

## Rollback strategy

The migration preserves all original checklist data, so rolling back the UI does not require reconstructing Notes. To disable the Task Core safely:

1. Stop rendering and writing `users/{uid}/tasks`.
2. Keep the `omnitask_unified_tasks_v1:{uid}` local data and Firestore Task collection intact.
3. Continue reading Notes from the original UID-scoped Notes key.
4. Do not remove `linkedTaskId`; older clients ignore this optional field.

Task documents can be retained for a later forward migration. They must not be bulk-deleted as part of an application rollback.

## Validation coverage

Focused tests cover deterministic migration, checklist preservation, task notification construction/scheduling, Dashboard shared-task completion, Focus linking/status, Canvas live references, and Task workspace editing. Device verification remains necessary for Android notification delivery because Expo Go cannot validate scheduled notification behavior.
