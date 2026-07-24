jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('expo-print', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('@/services/AttachmentService', () => ({
  attachmentById: jest.fn(() => undefined),
  attachmentDisplayUri: jest.fn(() => undefined),
}));

import { canvasToMarkdown, canvasToPlainText, serializeCanvasDocument } from '@/services/CanvasDocumentService';
import type { InfiniteCanvasNote } from '@/types/note';

const note: InfiniteCanvasNote = {
  id: 'board-1', title: 'Project map', canvasPosition: { x: -20, y: 30 }, zoomLevel: 1.2,
  gridEnabled: true, createdAt: 1, updatedAt: 2,
  objects: [
    { id: 'sticky', type: 'sticky', position: { x: 20, y: 10 }, size: { width: 100, height: 100 }, rotation: 0, layer: 1, content: 'Important idea', style: { color: '#111' } },
    { id: 'text', type: 'text', position: { x: 20, y: 150 }, size: { width: 100, height: 40 }, rotation: 0, layer: 2, content: 'Next step', style: { color: '#111' } },
  ],
};

describe('CanvasDocumentService', () => {
  it('serializes a versioned editable document', () => {
    const result = JSON.parse(serializeCanvasDocument(note));
    expect(result.version).toBe(7);
    expect(result.document.canvasPosition).toEqual({ x: -20, y: 30 });
    expect(result.document.objects).toHaveLength(2);
  });

  it('extracts ordered text and markdown', () => {
    expect(canvasToPlainText(note)).toBe('Important idea\n\nNext step');
    expect(canvasToMarkdown(note)).toContain('> Important idea');
    expect(canvasToMarkdown(note)).toContain('Next step');
  });
});
