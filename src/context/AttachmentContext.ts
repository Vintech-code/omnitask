import { createContext, useContext } from 'react';

import type { Attachment, AttachmentImport } from '@/types/attachment';

export interface AttachmentContextValue {
  attachments: Attachment[];
  importImage: (input: AttachmentImport) => Promise<Attachment>;
  retry: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  find: (id?: string) => Attachment | undefined;
  uriFor: (id?: string, thumbnail?: boolean) => string | undefined;
}

export const AttachmentContext = createContext<AttachmentContextValue>({
  attachments: [],
  importImage: async () => { throw new Error('Attachment storage is not ready.'); },
  retry: async () => undefined,
  cancel: async () => undefined,
  remove: async () => undefined,
  find: () => undefined,
  uriFor: () => undefined,
});

export const useAttachments = () => useContext(AttachmentContext);
