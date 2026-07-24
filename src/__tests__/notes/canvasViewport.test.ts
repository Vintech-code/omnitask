import type { CanvasObject } from '@/types/note';
import { cullCanvasObjects } from '@/utils/canvasViewport';

const shape = (id: string, x: number, y: number): CanvasObject => ({
  id,
  type: 'rectangle',
  position: { x, y },
  size: { width: 100, height: 80 },
  rotation: 0,
  style: { color: '#000' },
  layer: 1,
});

describe('canvas viewport culling', () => {
  const viewport = {
    width: 360,
    height: 640,
    pan: { x: 0, y: 0 },
    zoom: 1,
  };

  it('keeps nearby objects and removes distant offscreen objects', () => {
    const visible = shape('visible', 40, 40);
    const nearby = shape('overscan', 430, 100);
    const distant = shape('distant', 5000, 5000);

    expect(cullCanvasObjects([visible, nearby, distant], viewport).map(item => item.id))
      .toEqual(['visible', 'overscan']);
  });

  it('retains selected objects so selection operations remain stable', () => {
    const distant = shape('selected', 5000, 5000);
    expect(cullCanvasObjects([distant], viewport, ['selected'])).toEqual([distant]);
  });

  it('accounts for pan and zoom in board coordinates', () => {
    const object = shape('panned', 1000, 1000);
    const pannedViewport = {
      ...viewport,
      pan: { x: -1000, y: -1000 },
      zoom: 1,
    };
    expect(cullCanvasObjects([object], pannedViewport).map(item => item.id)).toEqual(['panned']);
  });
});
