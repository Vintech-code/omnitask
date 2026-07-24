export const ATTACHMENT_SCHEMA_VERSION = 1;

export type AttachmentPurpose = 'profile' | 'note' | 'canvas';
export type AttachmentScope = 'user' | 'collaboration';
export type AttachmentUploadState =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'cancelled'
  | 'delete-pending';

export interface Attachment {
  id: string;
  ownerId: string;
  purpose: AttachmentPurpose;
  parentId: string;
  scope: AttachmentScope;
  boardId?: string;
  localUri?: string;
  thumbnailLocalUri?: string;
  remotePath: string;
  thumbnailRemotePath?: string;
  remoteUrl?: string;
  thumbnailRemoteUrl?: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  uploadState: AttachmentUploadState;
  retryCount: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  uploadedAt?: number;
  version: number;
}

export interface AttachmentImport {
  uri: string;
  purpose: AttachmentPurpose;
  parentId: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
  id?: string;
}

export const ATTACHMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  profileMaxBytes: 5 * 1024 * 1024,
  noteMaxCount: 10,
  canvasMaxCount: 30,
} as const;
