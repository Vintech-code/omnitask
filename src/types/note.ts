/** Shared Note domain types — single source of truth. */

export const NOTE_SCHEMA_VERSION = 1;

export interface NoteTag {
  label: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  /** Real Task linked to this checklist item after migration or promotion. */
  linkedTaskId?: string;
  parentId?: string;
  createdAt?: number;
  completedAt?: number;
}

export type StandardNoteType = 'text' | 'checklist' | 'rich';

export interface Note {
  id: string;
  title: string;
  body: string;
  date: string;
  timestamp: number;
  category: string;
  cardColor: string;
  tags: NoteTag[];
  todos?: ChecklistItem[];
  images?: string[];
  attachmentIds?: string[];
  fontFamily?: string;
  updatedAt?: number;
  createdAt?: number;
  type?: StandardNoteType;
  pinned?: boolean;
  archived?: boolean;
  version?: number;
}

export type CanvasObjectType = 'text' | 'image' | 'rectangle' | 'circle' | 'sticky' | 'line' | 'arrow' | 'drawing' | 'reference' | 'connector';
export type CanvasReferenceKind = 'task' | 'event' | 'note';
export const CANVAS_DOCUMENT_VERSION = 7;

export type CanvasCollaborationRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface CanvasCollaborationMember {
  uid: string;
  name: string;
  joinedAt: number;
  role: CanvasCollaborationRole;
  invitedBy?: string;
  inviteCode?: string;
}

export type CanvasCollaborationActivityType =
  | 'board-created'
  | 'member-joined'
  | 'member-removed'
  | 'member-left'
  | 'role-changed'
  | 'ownership-transferred'
  | 'invite-created'
  | 'version-created'
  | 'version-restored'
  | 'comment-added'
  | 'comment-resolved'
  | 'sharing-stopped';

export interface CanvasCollaborationActivity {
  id: string;
  type: CanvasCollaborationActivityType;
  actorId: string;
  actorName: string;
  createdAt: number;
  targetId?: string;
  targetName?: string;
  detail?: string;
}

export interface CanvasCollaborationComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  mentions: string[];
  parentId?: string;
  objectId?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface CanvasCollaborationVersion {
  id: string;
  label: string;
  createdAt: number;
  createdBy: string;
  createdByName: string;
  objectCount: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasObjectStyle {
  color: string;
  backgroundColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strokeWidth?: number;
  opacity?: number;
}

export interface CanvasObject {
  id: string;
  /** Objects with the same group id are selected and transformed together. */
  groupId?: string;
  type: CanvasObjectType;
  position: CanvasPoint;
  size: { width: number; height: number };
  rotation: number;
  content?: string;
  imageUri?: string;
  attachmentId?: string;
  /** Download URL embedded for collaborators who cannot access owner metadata. */
  attachmentRemoteUrl?: string;
  attachmentThumbnailUrl?: string;
  reference?: {
    kind: CanvasReferenceKind;
    id: string;
    parentId?: string;
  };
  connector?: {
    fromObjectId: string;
    toObjectId: string;
    arrowEnd: boolean;
  };
  points?: CanvasPoint[];
  style: CanvasObjectStyle;
  layer: number;
  scale?: number;
  locked?: boolean;
  hidden?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface InfiniteCanvasNote {
  id: string;
  title: string;
  objects: CanvasObject[];
  canvasPosition: CanvasPoint;
  zoomLevel: number;
  gridEnabled: boolean;
  snapEnabled?: boolean;
  documentVersion?: number;
  background?: string;
  canvasTheme?: 'light' | 'dark' | 'system';
  thumbnailUri?: string;
  folder?: string;
  tags?: string[];
  /** Shared Firestore board backing this local, offline-first mirror. */
  collaborationId?: string;
  collaborationOwnerId?: string;
  createdAt: number;
  updatedAt: number;
}
