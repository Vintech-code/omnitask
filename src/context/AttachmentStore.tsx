import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  attachmentDisplayUri,
  cancelAttachmentUpload,
  currentAttachments,
  deleteAttachment,
  importAttachment,
  retryPendingAttachments,
  startAttachmentSession,
  subscribeAttachmentRecords,
} from '@/services/AttachmentService';
import type { Attachment, AttachmentImport } from '@/types/attachment';
import { AttachmentContext, type AttachmentContextValue } from '@/context/AttachmentContext';

export function AttachmentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [attachments, setAttachments] = useState<Attachment[]>(currentAttachments());

  useEffect(() => subscribeAttachmentRecords(setAttachments), []);
  useEffect(() => {
    if (!uid) {
      setAttachments([]);
      return undefined;
    }
    let disposed = false;
    let stop: (() => void) | undefined;
    void startAttachmentSession(uid).then(value => {
      if (disposed) value();
      else stop = value;
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [uid]);

  const value = useMemo<AttachmentContextValue>(() => ({
    attachments,
    importImage: async input => {
      if (!uid) throw new Error('Sign in before adding an attachment.');
      return importAttachment(uid, input);
    },
    retry: async id => {
      if (!uid) return;
      const attachment = attachments.find(item => item.id === id);
      if (attachment?.uploadState === 'delete-pending') await deleteAttachment(uid, id);
      else await retryPendingAttachments(uid);
    },
    cancel: async id => { if (uid) await cancelAttachmentUpload(uid, id); },
    remove: async id => { if (uid) await deleteAttachment(uid, id); },
    find: id => id ? attachments.find(item => item.id === id) : undefined,
    uriFor: (id, thumbnail = false) => attachmentDisplayUri(id ? attachments.find(item => item.id === id) : undefined, thumbnail),
  }), [attachments, uid]);

  return <AttachmentContext.Provider value={value}>{children}</AttachmentContext.Provider>;
}

export { useAttachments } from '@/context/AttachmentContext';
