import { NativeModules } from 'react-native';

import type { CanvasPoint } from '@/types/note';

interface NativeHandwritingModule {
  recognize: (strokes: CanvasPoint[][], languageTag: string, width: number, height: number) => Promise<{ candidates: string[] }>;
}

export interface HandwritingRecognitionResult {
  candidates: string[];
}

const nativeModule = NativeModules.OmniTaskHandwriting as NativeHandwritingModule | undefined;

export const isHandwritingRecognitionAvailable = () => Boolean(nativeModule?.recognize);

export async function recognizeHandwritingWithModule(module: NativeHandwritingModule, strokes: CanvasPoint[][], writingArea: { width: number; height: number }, languageTag = 'en-US'): Promise<HandwritingRecognitionResult> {
  if (!strokes.length || strokes.every(stroke => stroke.length === 0)) throw new Error('Select at least one handwriting stroke.');
  const result = await module.recognize(strokes, languageTag, writingArea.width, writingArea.height);
  const candidates = result.candidates.map(candidate => candidate.trim()).filter(Boolean);
  if (!candidates.length) throw new Error('No text was recognized. Try selecting clearer handwriting.');
  return { candidates };
}

export async function recognizeHandwriting(strokes: CanvasPoint[][], writingArea: { width: number; height: number }, languageTag = 'en-US'): Promise<HandwritingRecognitionResult> {
  if (!strokes.length || strokes.every(stroke => stroke.length === 0)) throw new Error('Select at least one handwriting stroke.');
  if (!nativeModule?.recognize) throw new Error('Handwriting recognition requires the OmniTask Android development build.');
  return recognizeHandwritingWithModule(nativeModule, strokes, writingArea, languageTag);
}
