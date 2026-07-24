# Canvas collaboration roles and history

OmniTask Canvas collaboration now separates membership from permission level and keeps human-readable history inside each shared board.

## Roles

| Capability | Owner | Editor | Commenter | Viewer |
|---|---:|---:|---:|---:|
| View board, presence, comments, versions, activity | Yes | Yes | Yes | Yes |
| Edit Canvas objects and board settings | Yes | Yes | No | No |
| Add comments and replies | Yes | Yes | Yes | No |
| Resolve own comments | Yes | Yes | Yes | No |
| Resolve any comment | Yes | Yes | No | No |
| Create and restore versions | Yes | Yes | No | No |
| Invite, change roles, remove members | Yes | No | No | No |
| Transfer ownership or stop sharing | Yes | No | No | No |

Existing collaboration members that predate roles migrate in memory as Editors. The board's existing owner remains Owner. This preserves existing editing access without elevating another member.

## Invitations and membership

- An Owner chooses Editor, Commenter, or Viewer before creating an invitation.
- The native share sheet contains the invite code only.
- An unused invite expires after 3 days.
- Joining creates a membership. That membership does not expire with the invite.
- Membership continues until the member leaves, the Owner removes them, or the Owner stops sharing.
- Only the Owner can create invitations or change access.

Invite redemption is still a Firestore capability-code flow protected by verified authentication and Security Rules. Moving redemption to a rate-limited callable Function with App Check remains part of roadmap item 7, Firebase security hardening.

## Comments and mentions

- Owners, Editors, and Commenters can add comments.
- Replies keep a `parentId` and appear indented.
- Writing `@MemberName` records the matching member UID in the comment's `mentions` array.
- Authors can resolve or reopen their own comments; Owners and Editors can resolve any comment.
- Viewers can read the thread.

## Versions

Restore points store version metadata separately from object snapshots. Objects live in a nested subcollection so a larger board does not exceed Firestore's single-document size limit.

- Owners and Editors can create restore points.
- Restoring replaces current shared objects and board presentation settings.
- A confirmation is required before restore.
- OmniTask retains the latest 50 restore points and prunes older snapshots.
- A restore is recorded in the activity timeline.

For important work, create a restore point immediately before restoring an older version.

## Presence, cursors, and activity

Presence heartbeats expire from the UI after 90 seconds without an update. Pointer movement publishes a throttled board-space cursor with the member's name. Cursor positions follow pan and zoom on every participant's screen.

The immutable activity collection records:

- board creation;
- invitation creation;
- member join, leave, and removal;
- role changes;
- ownership transfer;
- restore-point creation and restore;
- comment creation and resolution;
- stop sharing.

## Limits

| Resource | Limit |
|---|---:|
| Members per board | 20 |
| Objects per shared board | 1,000 |
| Retained restore points | 50 |
| Comments per board | 1,000 |
| Characters per comment | 2,000 |
| Mentioned members per comment | 20 |

The client blocks these limits and Security Rules validate role-sensitive document writes and fixed board limits. A callable membership transaction is still recommended under security-hardening work to make the 20-member limit race-proof against simultaneous invite redemption.

## Firebase deployment

The updated role, comment, version, activity, and ownership-transfer rules must be deployed to each environment before using the new controls:

```powershell
Set-Location C:\MyProjects\omnitask
npx.cmd firebase-tools deploy --only firestore:rules --project <environment-project-id>
```

Never deploy development rules with a production service account or project alias.

## Android verification

Use two or more verified accounts in a development build:

1. Start sharing and invite one account for each non-owner role.
2. Confirm Editor changes sync and Commenter/Viewer cannot edit.
3. Confirm Commenter can reply and Viewer cannot submit.
4. Type a member mention and confirm the UID is stored in Firestore.
5. Move two pointers and confirm named cursors track the correct board positions.
6. Create a restore point, change objects, restore, and confirm every client updates.
7. Change a member's role while they are connected.
8. Transfer ownership and confirm the previous Owner becomes Editor.
9. Test remove, leave, and stop-sharing access revocation.
10. Inspect the Activity tab for each action.
11. Confirm a joined member still has access after its invitation document expires.

This implementation is JavaScript and Firestore Rules only. It needs a Metro reload after pulling code; no native rebuild is required unless the installed app was built with a different environment identity.
