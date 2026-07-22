import type { CanvasObject } from '@/types/note';
import {
  alignCanvasSelection,
  buildSmoothStrokePath,
  canvasObjectsIntersectRect,
  distributeCanvasSelection,
  duplicateCanvasSelection,
  expandCanvasGroupSelection,
  groupCanvasSelection,
  scaleCanvasSelection,
  snapCanvasSelection,
  startPinchSession,
  translateCanvasSelection,
  ungroupCanvasSelection,
  updatePinchSession,
} from '@/utils/canvasMath';

const object = (id: string, x: number, y: number, width = 40, height = 40): CanvasObject => ({
  id,
  type: 'rectangle',
  position: { x, y },
  size: { width, height },
  rotation: 0,
  style: { color: '#000' },
  layer: 1,
});

describe('canvas gesture math', () => {
  it('rejects a pinch whose initial finger distance is invalid', () => {
    expect(startPinchSession([{ locationX: 10, locationY: 10 }, { locationX: 10, locationY: 10 }], 0.8, { x: 0, y: 0 })).toBeNull();
  });

  it('zooms gradually and keeps the midpoint anchored', () => {
    const session = startPinchSession([{ locationX: 100, locationY: 100 }, { locationX: 200, locationY: 100 }], 0.8, { x: 0, y: 0 });
    expect(session).not.toBeNull();
    const result = updatePinchSession(session!, [{ locationX: 75, locationY: 100 }, { locationX: 225, locationY: 100 }]);
    expect(result?.zoom).toBeCloseTo(1.2);
    expect(result?.pan.x).toBeCloseTo(-75);
    expect(result?.pan.y).toBeCloseTo(-50);
  });

  it('builds one continuous rounded-compatible path for a stroke', () => {
    const path = buildSmoothStrokePath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }]);
    expect(path).toBe('M 0 0 Q 10 10 15 7.5 L 20 5');
  });
});

describe('canvas multi-selection math', () => {
  it('moves only selected unlocked objects', () => {
    const locked = { ...object('locked', 5, 5), locked: true };
    const result = translateCanvasSelection([object('a', 0, 0), object('b', 100, 100), locked], ['a', 'locked'], { x: 20, y: -5 });
    expect(result[0].position).toEqual({ x: 20, y: -5 });
    expect(result[1].position).toEqual({ x: 100, y: 100 });
    expect(result[2].position).toEqual({ x: 5, y: 5 });
  });

  it('moves drawing points and detects them during drag selection', () => {
    const drawing: CanvasObject = { ...object('stroke', 0, 0), type: 'drawing', points: [{ x: 30, y: 40 }, { x: 70, y: 80 }] };
    expect(canvasObjectsIntersectRect(drawing, { left: 60, top: 70, right: 90, bottom: 100, width: 30, height: 30 })).toBe(true);
    const [moved] = translateCanvasSelection([drawing], ['stroke'], { x: 10, y: -5 });
    expect(moved.points).toEqual([{ x: 40, y: 35 }, { x: 80, y: 75 }]);
  });

  it('aligns a mixed-size selection by its outer bounds', () => {
    const result = alignCanvasSelection([object('a', 10, 5, 20), object('b', 70, 30, 50)], ['a', 'b'], 'right');
    expect(result[0].position.x).toBe(100);
    expect(result[1].position.x).toBe(70);
  });

  it('uses the visual bounds of rotated objects for alignment', () => {
    const rotated = { ...object('rotated', 0, 0, 40, 20), rotation: 90 };
    const result = alignCanvasSelection([rotated, object('anchor', 100, 0, 20, 20)], ['rotated', 'anchor'], 'left');
    expect(result[0].position.x).toBe(0);
    expect(result[1].position.x).toBe(10);
  });

  it('distributes three objects with equal horizontal gaps', () => {
    const result = distributeCanvasSelection([object('a', 0, 0, 20), object('b', 35, 0, 20), object('c', 100, 0, 20)], ['a', 'b', 'c'], 'horizontal');
    expect(result.map(item => item.position.x)).toEqual([0, 50, 100]);
  });

  it('groups, expands a group selection, and ungroups all members', () => {
    const grouped = groupCanvasSelection([object('a', 0, 0), object('b', 50, 0), object('c', 100, 0)], ['a', 'b'], 'group-1');
    expect(expandCanvasGroupSelection(grouped, ['a'])).toEqual(['a', 'b']);
    const ungrouped = ungroupCanvasSelection(grouped, ['a']);
    expect(ungrouped[1].groupId).toBeUndefined();
    expect(ungrouped[1]).not.toHaveProperty('groupId');
  });

  it('duplicates the complete selection and preserves a new shared group', () => {
    const grouped = groupCanvasSelection([object('a', 0, 0), object('b', 50, 0)], ['a', 'b'], 'old-group');
    let nextId = 0;
    const result = duplicateCanvasSelection(grouped, ['a', 'b'], () => `copy-${++nextId}`, () => 'new-group');
    expect(result.selectedIds).toEqual(['copy-1', 'copy-2']);
    expect(result.objects[2].position).toEqual({ x: 24, y: 24 });
    expect(result.objects[2].groupId).toBe('new-group');
    expect(result.objects[3].groupId).toBe('new-group');
  });

  it('resizes objects around the shared selection center', () => {
    const result = scaleCanvasSelection([object('a', 0, 0, 20, 20), object('b', 80, 0, 20, 20)], ['a', 'b'], 0.5);
    expect(result[0].position.x).toBe(25);
    expect(result[1].position.x).toBe(65);
    expect(result[0].size.width).toBe(24);
    expect(result[0].style).not.toHaveProperty('fontSize');
  });
});

describe('canvas smart snapping', () => {
  it('snaps a moving edge to another object and returns a visible guide', () => {
    const result = snapCanvasSelection([object('moving', 0, 0), object('target', 100, 50)], ['moving'], { x: 56, y: 0 }, { threshold: 8 });
    expect(result.delta.x).toBe(60);
    expect(result.guides).toContainEqual({ axis: 'vertical', position: 100, kind: 'object' });
  });

  it('snaps centers independently on both axes', () => {
    const result = snapCanvasSelection([object('moving', 0, 0), object('target', 100, 100)], ['moving'], { x: 98, y: 96 }, { threshold: 8 });
    expect(result.delta).toEqual({ x: 100, y: 100 });
    expect(result.guides).toHaveLength(2);
  });

  it('uses grid snapping when no object alignment is nearby', () => {
    const result = snapCanvasSelection([object('moving', 20, 20)], ['moving'], { x: 5, y: 5 }, { threshold: 8, gridSize: 28, snapToGrid: true });
    expect(result.delta).toEqual({ x: 8, y: 8 });
    expect(result.guides).toEqual([
      { axis: 'vertical', position: 28, kind: 'grid' },
      { axis: 'horizontal', position: 28, kind: 'grid' },
    ]);
  });

  it('does not snap when the nearest target is outside the threshold', () => {
    const result = snapCanvasSelection([object('moving', 0, 0), object('target', 100, 100)], ['moving'], { x: 20, y: 20 }, { threshold: 4 });
    expect(result).toEqual({ delta: { x: 20, y: 20 }, guides: [] });
  });
});
