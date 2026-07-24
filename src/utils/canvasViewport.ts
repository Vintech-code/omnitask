import type { CanvasObject, CanvasPoint } from '@/types/note';
import { getCanvasConnectorGeometry } from '@/utils/canvasConnectors';

export interface CanvasViewport {
  width: number;
  height: number;
  pan: CanvasPoint;
  zoom: number;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function objectBounds(object: CanvasObject, objects: CanvasObject[]): Bounds | null {
  if (object.type === 'drawing' && object.points?.length) {
    const xs = object.points.map(point => point.x);
    const ys = object.points.map(point => point.y);
    const padding = Math.max(4, object.style.strokeWidth ?? 3);
    return {
      left: Math.min(...xs) - padding,
      top: Math.min(...ys) - padding,
      right: Math.max(...xs) + padding,
      bottom: Math.max(...ys) + padding,
    };
  }
  if (object.type === 'connector') {
    const geometry = getCanvasConnectorGeometry(object, objects);
    if (!geometry) return null;
    return {
      left: Math.min(geometry.start.x, geometry.end.x),
      top: Math.min(geometry.start.y, geometry.end.y),
      right: Math.max(geometry.start.x, geometry.end.x),
      bottom: Math.max(geometry.start.y, geometry.end.y),
    };
  }
  return {
    left: object.position.x,
    top: object.position.y,
    right: object.position.x + Math.max(1, object.size.width),
    bottom: object.position.y + Math.max(1, object.size.height),
  };
}

function intersects(left: Bounds, right: Bounds): boolean {
  return left.left <= right.right
    && left.right >= right.left
    && left.top <= right.bottom
    && left.bottom >= right.top;
}

/**
 * Returns only objects near the visible board. The generous board-space
 * overscan keeps panning smooth while avoiding hundreds of offscreen React
 * views and SVG paths on large documents.
 */
export function cullCanvasObjects(
  objects: CanvasObject[],
  viewport: CanvasViewport,
  selectedIds: readonly string[] = [],
  overscanPixels = 180,
): CanvasObject[] {
  const zoom = Math.max(0.05, viewport.zoom);
  const overscan = overscanPixels / zoom;
  const visibleBounds: Bounds = {
    left: -viewport.pan.x / zoom - overscan,
    top: -viewport.pan.y / zoom - overscan,
    right: (viewport.width - viewport.pan.x) / zoom + overscan,
    bottom: (viewport.height - viewport.pan.y) / zoom + overscan,
  };
  const selected = new Set(selectedIds);
  return objects.filter(object => {
    if (selected.has(object.id)) return true;
    const bounds = objectBounds(object, objects);
    return bounds ? intersects(bounds, visibleBounds) : false;
  });
}

