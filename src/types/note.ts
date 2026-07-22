/** Shared Note domain types — single source of truth. */

export interface NoteTag {
  label: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
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
  fontFamily?: string;
  updatedAt?: number;
  createdAt?: number;
  type?: StandardNoteType;
  pinned?: boolean;
  archived?: boolean;
}

export type CanvasObjectType = 'text' | 'image' | 'rectangle' | 'circle' | 'sticky' | 'line' | 'arrow' | 'drawing' | 'reference' | 'connector';
export type CanvasReferenceKind = 'task' | 'event' | 'note';
export const CANVAS_DOCUMENT_VERSION = 7;

export interface CanvasCollaborationMember {
  uid: string;
  name: string;
  joinedAt: number;
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
