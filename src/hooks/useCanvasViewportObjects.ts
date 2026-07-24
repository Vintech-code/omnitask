import { useMemo } from 'react';

import type { CanvasObject, CanvasPoint } from '@/types/note';
import { cullCanvasObjects } from '@/utils/canvasViewport';

interface CanvasViewportSize {
  width: number;
  height: number;
}

export function useCanvasViewportObjects(
  objects: CanvasObject[],
  viewportSize: CanvasViewportSize,
  pan: CanvasPoint,
  zoom: number,
  selectedIds: readonly string[],
) {
  return useMemo(
    () => cullCanvasObjects(objects, { ...viewportSize, pan, zoom }, selectedIds),
    [objects, pan, selectedIds, viewportSize, zoom],
  );
}
