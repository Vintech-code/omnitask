import { createCanvasConnector, getCanvasConnectorGeometry, hasCanvasConnector, removeDanglingCanvasConnectors } from '@/utils/canvasConnectors';
import type { CanvasObject } from '@/types/note';

const object = (id: string, x: number, y: number): CanvasObject => ({ id, type: 'rectangle', position: { x, y }, size: { width: 100, height: 60 }, rotation: 0, style: { color: '#000' }, layer: 1 });

describe('Canvas anchored connectors', () => {
  it('anchors to facing edges and follows moved objects', () => {
    const first = object('first', 0, 20);
    const second = object('second', 300, 100);
    const connector = createCanvasConnector('connector', first.id, second.id, 2, [first, second]);
    expect(connector).not.toBeNull();
    expect(getCanvasConnectorGeometry(connector!, [first, second])?.start.x).toBe(100);
    expect(getCanvasConnectorGeometry(connector!, [first, { ...second, position: { x: 400, y: 100 } }])?.end.x).toBe(400);
  });

  it('detects duplicates and removes connectors whose target was deleted', () => {
    const first = object('first', 0, 0);
    const second = object('second', 200, 0);
    const connector = createCanvasConnector('connector', first.id, second.id, 2, [first, second])!;
    expect(hasCanvasConnector([first, second, connector], second.id, first.id)).toBe(true);
    expect(removeDanglingCanvasConnectors([first, connector])).toEqual([first]);
  });
});
