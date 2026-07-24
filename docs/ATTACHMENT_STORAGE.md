# Cross-device attachment storage

Status: implementation complete; Firebase enablement and Android device verification required  
Schema version: 1

## Scope

OmniTask uses one attachment repository for profile photos, Standard Note images, Infinite Canvas images, and images mirrored into a live Canvas collaboration.

The repository is local-first. Selecting an image creates a managed application copy and an `Attachment` record before any network request begins. A failed or cancelled upload therefore does not remove the only usable copy.

## Data model

`src/types/attachment.ts` defines the versioned `Attachment` model. Each record includes:

- owner, parent, purpose, and scope;
- managed local and thumbnail URIs;
- Firebase Storage paths and download URLs;
- MIME type, byte size, and optional dimensions;
- `pending`, `uploading`, `uploaded`, `failed`, `cancelled`, or `delete-pending` state;
- retry count, timestamps, and schema version.

Local records are UID-scoped under `omnitask_attachments_v1`. Cloud metadata is stored at:

```text
users/{uid}/attachments/{attachmentId}
```

Device-local URIs are deliberately excluded from Firestore metadata.

## Firebase Storage layout

Private account attachments:

```text
users/{uid}/attachments/{attachmentId}/original.{extension}
users/{uid}/attachments/{attachmentId}/thumbnail.jpg
```

Live Canvas copies:

```text
sharedCanvasBoards/{boardId}/attachments/{attachmentId}/original.{extension}
sharedCanvasBoards/{boardId}/attachments/{attachmentId}/thumbnail.jpg
```

Private files are readable and writable only by their verified Firebase user. Shared Canvas files require a verified user who is an active board member. The rules accept JPEG, PNG, WebP, HEIC, and HEIF images up to 10 MB.

The app additionally limits profile photos to 5 MB, Notes to 10 images, and a Canvas to 30 images.

## Upload and recovery behavior

1. Copy the selected image into `FileSystem.documentDirectory/attachments/{uid}`.
2. Generate a 360-pixel JPEG thumbnail when the device supports it.
3. Save local attachment metadata immediately.
4. Start a resumable Firebase Storage upload in the background.
5. Save the remote URL only after the upload completes.
6. Retry pending and failed uploads when an authenticated attachment session starts.
7. Keep failed and cancelled local files available with visible retry/cancel controls.
8. Render the managed local file first and use the remote URL when the local file is absent on another device.

Permanent Note, Canvas, image, and profile replacements remove their attachment metadata and files. Cloud deletion failures become `delete-pending` records and retry on a later session. Canvas object deletion waits briefly before cleanup so Undo can restore the object without losing its image.

## Legacy migration

Existing `Note.images`, Canvas `imageUri`, and the locally stored profile photo are not removed. They are imported with deterministic IDs, then linked through `attachmentIds` or `attachmentId`. If an import fails, the original URI remains intact and a later session can retry.

This is intentionally a non-destructive migration. The legacy fields remain readable during the transition.

## Firebase setup required

The project must have a Firebase Storage bucket before uploads can work. The previously configured bucket is:

```text
omnitask-d5b47.firebasestorage.app
```

If Firebase Console does not show that bucket:

1. Open Firebase Console and select the OmniTask development project.
2. Open **Build > Storage**.
3. Select **Get started** and create the default bucket in the intended development region.
4. Confirm that the bucket name matches the `storageBucket` value already present in OmniTask's Firebase configuration. Do not paste credentials into the app.
5. Deploy the checked-in rules from the project root:

```powershell
npx.cmd firebase-tools deploy --only storage --project omnitask-d5b47
```

Rules must be deployed before testing uploads. Never switch the app to permissive test rules.

## Build and device verification

`expo-image-manipulator` is a native Expo dependency used for thumbnails, so install a new development build:

```powershell
npm.cmd install
npx.cmd expo run:android
```

Then verify with two authenticated development-build devices:

1. Add one profile photo, one Note image, and one Canvas image on device A.
2. Wait until each image no longer shows a pending or failed status.
3. Open the same account on device B and confirm all three images load.
4. Share the Canvas and confirm a second verified collaborator sees its image.
5. Disable connectivity, add an image, confirm the local copy remains visible, reconnect, and retry.
6. Delete the parent Note/Canvas and confirm its Storage objects disappear in Firebase Console.

## Rollback

The migration retains legacy image fields, so removing the new UI integration does not erase existing local references. Do not delete the `omnitask_attachments_v1` local key or Firebase Storage objects as part of a code rollback; doing so would remove user media.
