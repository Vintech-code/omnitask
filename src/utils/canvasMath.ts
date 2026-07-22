import type { CanvasObject, CanvasPoint } from '@/types/note';

export interface CanvasTouch {
  locationX: number;
  locationY: number;
}

export interface PinchSession {
  active: boolean;
  startDistance: number;
  startZoom: number;
  anchor: CanvasPoint;
}

export const MIN_CANVAS_ZOOM = 0.3;
export const MAX_CANVAS_ZOOM = 2.5;

export interface CanvasBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type CanvasAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type CanvasDistribution = 'horizontal' | 'vertical';
export type CanvasSnapGuideAxis = 'vertical' | 'horizontal';

export interface CanvasSnapGuide {
  axis: CanvasSnapGuideAxis;
  position: number;
  kind: 'object' | 'grid';
}

export interface CanvasSnapOptions {
  threshold: number;
  gridSize?: number;
  snapToGrid?: boolean;
}

export interface CanvasSnapResult {
  delta: CanvasPoint;
  guides: CanvasSnapGuide[];
}

export function getCanvasObjectBounds(object: CanvasObject): CanvasBounds {
  if (object.type === 'drawing' && object.points?.length) {
    const xs = object.points.map(point => point.x);
    const ys = object.points.map(point => point.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }
  const radians = object.rotation * Math.PI / 180;
  const width = Math.abs(object.size.width * Math.cos(radians)) + Math.abs(object.size.height * Math.sin(radians));
  const height = Math.abs(object.size.width * Math.sin(radians)) + Math.abs(object.size.height * Math.cos(radians));
  const centerX = object.position.x + object.size.width / 2;
  const centerY = object.position.y + object.size.height / 2;
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const right = centerX + width / 2;
  const bottom = centerY + height / 2;
  return { left, top, right, bottom, width, height };
}

export function getCanvasSelectionBounds(objects: CanvasObject[], selectedIds: ReadonlyArray<string>): CanvasBounds | null {
  const selected = new Set(selectedIds);
  const bounds = objects.filter(object => selected.has(object.id) && !object.hidden).map(getCanvasObjectBounds);
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map(item => item.left));
  const top = Math.min(...bounds.map(item => item.top));
  const right = Math.max(...bounds.map(item => item.right));
  const bottom = Math.max(...bounds.map(item => item.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function expandCanvasGroupSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>): string[] {
  const selected = new Set(selectedIds);
  const groupIds = new Set(objects.filter(object => selected.has(object.id) && object.groupId).map(object => object.groupId));
  objects.forEach(object => {
    if (object.groupId && groupIds.has(object.groupId)) selected.add(object.id);
  });
  return objects.filter(object => selected.has(object.id)).map(object => object.id);
}

function translateObject(object: CanvasObject, delta: CanvasPoint): CanvasObject {
  if (object.type === 'drawing' && object.points) {
    return { ...object, points: object.points.map(point => ({ x: point.x + delta.x, y: point.y + delta.y })), updatedAt: Date.now() };
  }
  return { ...object, position: { x: object.position.x + delta.x, y: object.position.y + delta.y }, updatedAt: Date.now() };
}

export function translateCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>, delta: CanvasPoint): CanvasObject[] {
  const selected = new Set(selectedIds);
  return objects.map(object => selected.has(object.id) && !object.locked ? translateObject(object, delta) : object);
}

export function alignCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>, alignment: CanvasAlignment): CanvasObject[] {
  const selection = getCanvasSelectionBounds(objects, selectedIds);
  if (!selection) return objects;
  const selected = new Set(selectedIds);
  return objects.map(object => {
    if (!selected.has(object.id) || object.locked) return object;
    const bounds = getCanvasObjectBounds(object);
    let delta: CanvasPoint = { x: 0, y: 0 };
    if (alignment === 'left') delta = { x: selection.left - bounds.left, y: 0 };
    if (alignment === 'center') delta = { x: selection.left + selection.width / 2 - (bounds.left + bounds.width / 2), y: 0 };
    if (alignment === 'right') delta = { x: selection.right - bounds.right, y: 0 };
    if (alignment === 'top') delta = { x: 0, y: selection.top - bounds.top };
    if (alignment === 'middle') delta = { x: 0, y: selection.top + selection.height / 2 - (bounds.top + bounds.height / 2) };
    if (alignment === 'bottom') delta = { x: 0, y: selection.bottom - bounds.bottom };
    return translateObject(object, delta);
  });
}

export function distributeCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>, direction: CanvasDistribution): CanvasObject[] {
  const selected = new Set(selectedIds);
  const movable = objects.filter(object => selected.has(object.id) && !object.locked);
  if (movable.length < 3) return objects;
  const horizontal = direction === 'horizontal';
  const sorted = [...movable].sort((a, b) => {
    const first = getCanvasObjectBounds(a);
    const second = getCanvasObjectBounds(b);
    return (horizontal ? first.left - second.left : first.top - second.top) || a.id.localeCompare(b.id);
  });
  const first = getCanvasObjectBounds(sorted[0]);
  const last = getCanvasObjectBounds(sorted[sorted.length - 1]);
  const start = horizontal ? first.left : first.top;
  const end = horizontal ? last.right : last.bottom;
  const occupied = sorted.reduce((total, object) => {
    const bounds = getCanvasObjectBounds(object);
    return total + (horizontal ? bounds.width : bounds.height);
  }, 0);
  const gap = (end - start - occupied) / (sorted.length - 1);
  let cursor = start;
  const deltas = new Map<string, CanvasPoint>();
  sorted.forEach(object => {
    const bounds = getCanvasObjectBounds(object);
    deltas.set(object.id, horizontal ? { x: cursor - bounds.left, y: 0 } : { x: 0, y: cursor - bounds.top });
    cursor += (horizontal ? bounds.width : bounds.height) + gap;
  });
  return objects.map(object => deltas.has(object.id) ? translateObject(object, deltas.get(object.id)!) : object);
}

export function scaleCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>, factor: number): CanvasObject[] {
  const selection = getCanvasSelectionBounds(objects, selectedIds);
  if (!selection || !Number.isFinite(factor) || factor <= 0) return objects;
  const center = { x: selection.left + selection.width / 2, y: selection.top + selection.height / 2 };
  const selected = new Set(selectedIds);
  return objects.map(object => {
    if (!selected.has(object.id) || object.locked) return object;
    const style = { ...object.style };
    if (style.fontSize !== undefined) style.fontSize = Math.max(10, Math.min(96, style.fontSize * factor));
    if (style.strokeWidth !== undefined) style.strokeWidth = Math.max(1, style.strokeWidth * factor);
    if (object.type === 'drawing' && object.points) {
      return { ...object, points: object.points.map(point => ({ x: center.x + (point.x - center.x) * factor, y: center.y + (point.y - center.y) * factor })), style, updatedAt: Date.now() };
    }
    return {
      ...object,
      position: { x: center.x + (object.position.x - center.x) * factor, y: center.y + (object.position.y - center.y) * factor },
      size: { width: Math.max(24, object.size.width * factor), height: Math.max(object.type === 'line' || object.type === 'arrow' ? 4 : 24, object.size.height * factor) },
      style,
      updatedAt: Date.now(),
    };
  });
}

export function groupCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>, groupId: string): CanvasObject[] {
  if (selectedIds.length < 2) return objects;
  const selected = new Set(selectedIds);
  return objects.map(object => selected.has(object.id) ? { ...object, groupId, updatedAt: Date.now() } : object);
}

export function ungroupCanvasSelection(objects: CanvasObject[], selectedIds: ReadonlyArray<string>): CanvasObject[] {
  const selected = new Set(selectedIds);
  const groupIds = new Set(objects.filter(object => selected.has(object.id) && object.groupId).map(object => object.groupId));
  if (!groupIds.size) return objects;
  return objects.map(object => {
    if (!object.groupId || !groupIds.has(object.groupId)) return object;
    const { groupId: _groupId, ...ungrouped } = object;
    return { ...ungrouped, updatedAt: Date.now() };
  });
}

export function duplicateCanvasSelection(
  objects: CanvasObject[],
  selectedIds: ReadonlyArray<string>,
  createId: () => string,
  createGroupId: () => string,
  offset = 24,
): { objects: CanvasObject[]; selectedIds: string[] } {
  const selected = new Set(selectedIds);
  const sources = objects.filter(object => selected.has(object.id));
  if (!sources.length) return { objects, selectedIds: [] };
  const groups = new Map<string, string>();
  const maxLayer = Math.max(0, ...objects.map(object => object.layer));
  const now = Date.now();
  const copies = sources.map((object, index): CanvasObject => {
    if (object.groupId && !groups.has(object.groupId)) groups.set(object.groupId, createGroupId());
    const nextGroupId = object.groupId ? groups.get(object.groupId) : undefined;
    const { groupId: _sourceGroupId, ...source } = object;
    return {
      ...source,
      id: createId(),
      ...(nextGroupId ? { groupId: nextGroupId } : {}),
      position: object.type === 'drawing' ? object.position : { x: object.position.x + offset, y: object.position.y + offset },
      points: object.points?.map(point => ({ x: point.x + offset, y: point.y + offset })),
      layer: maxLayer + index + 1,
      createdAt: now,
      updatedAt: now,
    };
  });
  return { objects: [...objects, ...copies], selectedIds: copies.map(object => object.id) };
}

export function canvasObjectsIntersectRect(object: CanvasObject, rect: CanvasBounds): boolean {
  const bounds = getCanvasObjectBounds(object);
  return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
}

type SnapCandidate = { adjustment: number; position: number; kind: CanvasSnapGuide['kind'] };

function chooseBetterSnap(best: SnapCandidate | null, candidate: SnapCandidate, threshold: number): SnapCandidate | null {
  if (Math.abs(candidate.adjustment) > threshold) return best;
  if (!best || Math.abs(candidate.adjustment) < Math.abs(best.adjustment) || (Math.abs(candidate.adjustment) === Math.abs(best.adjustment) && candidate.kind === 'object' && best.kind === 'grid')) return candidate;
  return best;
}

function bestAxisSnap(movingAnchors: number[], objectAnchors: number[], options: CanvasSnapOptions): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  for (const moving of movingAnchors) {
    for (const target of objectAnchors) best = chooseBetterSnap(best, { adjustment: target - moving, position: target, kind: 'object' }, options.threshold);
  }
  if (best?.kind === 'object' || !options.snapToGrid) return best;

  const gridSize = options.gridSize ?? 28;
  if (!Number.isFinite(gridSize) || gridSize <= 0) return best;
  movingAnchors.forEach(moving => {
    const target = Math.round(moving / gridSize) * gridSize;
    best = chooseBetterSnap(best, { adjustment: target - moving, position: target, kind: 'grid' }, options.threshold);
  });
  return best;
}

/** Calculates a snapped drag delta without mutating the canvas objects. */
export function snapCanvasSelection(
  objects: CanvasObject[],
  selectedIds: ReadonlyArray<string>,
  rawDelta: CanvasPoint,
  options: CanvasSnapOptions,
): CanvasSnapResult {
  if (!Number.isFinite(options.threshold) || options.threshold < 0) return { delta: rawDelta, guides: [] };
  const selected = new Set(selectedIds);
  const movableIds = selectedIds.filter(selectedId => objects.some(object => object.id === selectedId && !object.locked && !object.hidden));
  const selection = getCanvasSelectionBounds(objects, movableIds);
  if (!selection) return { delta: rawDelta, guides: [] };

  const movingX = [selection.left + rawDelta.x, selection.left + selection.width / 2 + rawDelta.x, selection.right + rawDelta.x];
  const movingY = [selection.top + rawDelta.y, selection.top + selection.height / 2 + rawDelta.y, selection.bottom + rawDelta.y];
  const targets = objects.filter(object => !selected.has(object.id) && !object.hidden && object.type !== 'connector').map(getCanvasObjectBounds);
  const targetX = targets.flatMap(bounds => [bounds.left, bounds.left + bounds.width / 2, bounds.right]);
  const targetY = targets.flatMap(bounds => [bounds.top, bounds.top + bounds.height / 2, bounds.bottom]);
  const xSnap = bestAxisSnap(movingX, targetX, options);
  const ySnap = bestAxisSnap(movingY, targetY, options);
  const delta = { x: rawDelta.x + (xSnap?.adjustment ?? 0), y: rawDelta.y + (ySnap?.adjustment ?? 0) };
  const guides: CanvasSnapGuide[] = [];
  if (xSnap) guides.push({ axis: 'vertical', position: xSnap.position, kind: xSnap.kind });
  if (ySnap) guides.push({ axis: 'horizontal', position: ySnap.position, kind: ySnap.kind });
  return { delta, guides };
}

export function startPinchSession(touches: ReadonlyArray<CanvasTouch>, zoom: number, pan: CanvasPoint): PinchSession | null {
  if (touches.length < 2 || !Number.isFinite(zoom) || zoom <= 0) return null;
  const first = touches[0];
  const second = touches[1];
  const startDistance = Math.hypot(first.locationX - second.locationX, first.locationY - second.locationY);
  if (!Number.isFinite(startDistance) || startDistance < 12) return null;
  const midpoint = { x: (first.locationX + second.locationX) / 2, y: (first.locationY + second.locationY) / 2 };
  return {
    active: true,
    startDistance,
    startZoom: zoom,
    anchor: { x: (midpoint.x - pan.x) / zoom, y: (midpoint.y - pan.y) / zoom },
  };
}

export function updatePinchSession(session: PinchSession, touches: ReadonlyArray<CanvasTouch>): { zoom: number; pan: CanvasPoint } | null {
  if (!session.active || touches.length < 2 || session.startDistance < 12) return null;
  const first = touches[0];
  const second = touches[1];
  const currentDistance = Math.hypot(first.locationX - second.locationX, first.locationY - second.locationY);
  if (!Number.isFinite(currentDistance) || currentDistance < 12) return null;
  const ratio = Math.min(2, Math.max(0.5, currentDistance / session.startDistance));
  const zoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, session.startZoom * ratio));
  const midpoint = { x: (first.locationX + second.locationX) / 2, y: (first.locationY + second.locationY) / 2 };
  return { zoom, pan: { x: midpoint.x - session.anchor.x * zoom, y: midpoint.y - session.anchor.y * zoom } };
}

export function buildSmoothStrokePath(points: CanvasPoint[]) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}
