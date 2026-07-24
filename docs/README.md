# OmniTask documentation

- [Environment separation and release setup](ENVIRONMENTS.md)
- [Canvas collaboration roles and history](COLLABORATION_ROLES_HISTORY.md)

This folder contains setup guides, testing instructions, architecture notes, and the product roadmap.

## Project planning

- [Architecture and performance cleanup](./ARCHITECTURE_PERFORMANCE.md) — Auth ownership, repositories, migrations, semantic-theme cleanup, Canvas culling, timer lifecycle, and Android profiling.

- [Accurate Focus session history](./FOCUS_SESSION_HISTORY.md) — Versioned sessions, timer lifecycle, legacy migration, actual-time metrics, goals, and device QA.
- [Reliable and visible offline sync](./OFFLINE_SYNC.md) — Durable UID-scoped outbox, retry policy, offline-only mode indicator, revisions, conflict strategies, and device QA.

- [Cross-device attachment storage](./ATTACHMENT_STORAGE.md) — Attachment schema, local-first uploads, Firebase paths and rules, migration, recovery, and device QA.

- [Unified Task Core](./UNIFIED_TASK_CORE.md) — Task schema, ownership, migration, status transitions, reminders, and rollback.
- [Product and engineering roadmap](./PRODUCT_ROADMAP.md) — prioritized recommendations, progress checklist, dependencies, and acceptance criteria.

## Existing guides

- [Authentication email setup](./AUTH_EMAIL_SETUP.md)
- [Firebase Google authentication setup](./FIREBASE_GOOGLE_AUTH_SETUP.md)
- [Event location and notification testing](./event-testing.md)

## Roadmap maintenance

Update `PRODUCT_ROADMAP.md` whenever an initiative starts, changes scope, is blocked, or is completed. A roadmap item is complete only after its acceptance criteria and required validation have passed.
