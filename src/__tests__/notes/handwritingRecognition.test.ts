jest.mock('react-native', () => ({ NativeModules: {} }));

import { recognizeHandwriting, recognizeHandwritingWithModule } from '@/services/HandwritingRecognitionService';

describe('HandwritingRecognitionService', () => {
  it('passes ordered vector strokes to the native recognizer', async () => {
    const mockRecognize = jest.fn().mockResolvedValue({ candidates: [' Hello ', 'Hullo'] });
    await expect(recognizeHandwritingWithModule({ recognize: mockRecognize }, [[{ x: 1, y: 2 }, { x: 3, y: 4 }]], { width: 200, height: 80 })).resolves.toEqual({ candidates: ['Hello', 'Hullo'] });
    expect(mockRecognize).toHaveBeenCalledWith([[{ x: 1, y: 2 }, { x: 3, y: 4 }]], 'en-US', 200, 80);
  });

  it('rejects empty ink before invoking native code', async () => {
    await expect(recognizeHandwriting([], { width: 100, height: 100 })).rejects.toThrow('Select at least one handwriting stroke.');
  });

  it('explains when the native recognizer is absent', async () => {
    await expect(recognizeHandwriting([[{ x: 1, y: 1 }]], { width: 100, height: 100 })).rejects.toThrow('OmniTask Android development build');
  });
});
