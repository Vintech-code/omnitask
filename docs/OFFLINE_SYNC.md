# Reliable and visible offline sync

Last updated: July 24, 2026  
Schema version: 2

## User experience

OmniTask saves supported edits locally first. Cloud availability never blocks normal Task, Note, Canvas, Event, Alarm, profile, attachment-metadata, onboarding, or Focus-count editing.

A compact **Offline mode** strip appears at the top of the main app only while
the device has no connection. It reports how many local changes are waiting,
or **Saved locally** when the outbox is empty. Tapping it expands a short
explanation that work remains available and will sync automatically.

The strip disappears automatically when connectivity returns. Normal online
use has no permanent sync control on the Dashboard.

## Durable outbox

Every mutation is scoped to the authenticated Firebase UID:

```text
omnitask_cloud_outbox_v2:{uid}
omnitask_cloud_confirmed_v1:{uid}
omnitask_sync_diagnostics_v1:{uid}
```

Mutation states are `pending`, `sending`, `failed`, and `confirmed`. Each record includes:

- operation and Firestore path;
- base revision and base document data;
- retry count, last error, error code, and next retry time;
- creation, update, and confirmation times;
- sync schema version.

Interrupted `sending` mutations return to `pending` at startup. Deletes use the same durable queue as updates, so an offline deletion survives an app restart. Repeated writes to one document are compacted into the newest mutation while retaining the original base revision and queue position. A later delete supersedes earlier writes; a later write after a delete intentionally recreates the document.

Retries use exponential backoff beginning at two seconds and capped at five minutes. Returning connectivity, returning the app to the foreground, or selecting **Retry now** triggers another drain. Firestore transactions make retries idempotent at the document path.

## Revisions and conflict handling

Confirmed documents receive reserved metadata:

```ts
_omniSync: {
  revision: number;
  deviceId: string;
  clientUpdatedAt: number;
  serverUpdatedAt: FirestoreServerTimestamp;
  schemaVersion: 2;
}
```

Application models never receive `_omniSync`; it is removed at the repository boundary.

When a write was based on an older revision, OmniTask compares the desired document with its confirmed base and writes only the top-level fields changed locally. This preserves unrelated fields changed by another device. The server revision is incremented in the same transaction.

Entity strategies:

| Entity | Strategy |
|---|---|
| Tasks, Notes, Canvas documents, Events, Alarms | A queued local mutation remains authoritative until confirmed. With no pending mutation, the highest confirmed server revision wins. |
| Attachment metadata | Same revision strategy, while device-only local and thumbnail URIs are preserved on that device. Binary upload state remains managed by the attachment service. |
| Profile | A queued local profile wins until confirmed; otherwise the confirmed cloud revision wins. The old photo timestamp comparison is used only for legacy documents without revision metadata. |
| Task/Event categories | Set union, because categories are additive metadata and removing one device's category must not erase another device's category silently. |
| Focus sessions | Each versioned session uses the standard pending-local/confirmed-revision strategy. Segment history preserves actual pause/resume timing. |
| Legacy Focus aggregate | Monotonic maximum retained only as a count-only migration summary; it never becomes fabricated dated sessions or focus minutes. |
| Onboarding completion | Monotonic `false` to `true`; completion is never rolled back by another device. |
| Legacy documents | Client `updatedAt` is used only once when `_omniSync.revision` is absent. The winning local value is then written with revision metadata. |

This is field-level conflict preservation, not a collaborative text CRDT. If two devices edit the same field, the transaction that commits last owns that field. Unrelated fields are retained.

## Diagnostics

AsyncStorage read, write, and removal failures are captured as structured in-memory diagnostics instead of being silently discarded. Outbox and confirmed-baseline persistence errors are also stored when device storage remains available. Firestore snapshot-listener failures for supported repositories remain available in local diagnostics for troubleshooting.

Diagnostic history is capped and can be cleared without clearing queued mutations.

## Account isolation

- Outbox, baselines, diagnostics, and domain caches are UID-scoped.
- Sync Provider switches to the new UID snapshot immediately and never renders another account's queue.
- A mutation stores its owner UID and can only be loaded from that UID's queue.
- Signing out stops that account's active retry timer. Its pending mutations remain available for the same account's next sign-in.

## Validation

Automated tests cover:

- mutation coalescing;
- durable deletion after a service restart;
- creation ordering;
- exponential retry metadata and successful manual retry;
- preservation of unrelated remotely edited fields;
- account queue isolation;
- affected Task, attachment, and onboarding repositories.

Because connectivity detection uses `@react-native-community/netinfo`, installing this change requires a new Expo development build. Final device QA should verify:

1. Turn on airplane mode and create/edit/delete one Task, Note, Event, Alarm, and Canvas document.
2. Confirm the top strip reads **Offline mode** and each edit remains usable after an app restart.
3. Restore internet and confirm the offline strip disappears after automatic synchronization begins.
4. Open the same account on a second device and confirm the changes appear.
5. Deny network access, make several edits, restore access, and confirm the queued count eventually clears on the second device.
6. Sign into a different account and confirm no queued paths or diagnostics from the first account appear.

Firebase Storage bucket availability does not block Firestore outbox synchronization. Attachment files will remain pending or failed until the bucket is available, while their local copies remain intact.
