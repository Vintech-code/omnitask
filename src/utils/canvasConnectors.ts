import type { CanvasObject, CanvasPoint } from '@/types/note';

export interface CanvasConnectorGeometry {
  start: CanvasPoint;
  end: CanvasPoint;
  midpoint: CanvasPoint;
  path: string;
  arrowPath: string;
}

const center = (object: CanvasObject): CanvasPoint => ({ x: object.position.x + object.size.width / 2, y: object.position.y + object.size.height / 2 });

function anchorPoint(object: CanvasObject, target: CanvasPoint): CanvasPoint {
  const objectCenter = center(object);
  const dx = target.x - objectCenter.x;
  const dy = target.y - objectCenter.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? object.position.x + object.size.width : object.position.x, y: objectCenter.y };
  return { x: objectCenter.x, y: dy >= 0 ? object.position.y + object.size.height : object.position.y };
}

export function getCanvasConnectorGeometry(connector: CanvasObject, objects: CanvasObject[]): CanvasConnectorGeometry | null {
  if (connector.type !== 'connector' || !connector.connector) return null;
  const from = objects.find(object => object.id === connector.connector?.fromObjectId && object.type !== 'connector');
  const to = objects.find(object => object.id === connector.connector?.toObjectId && object.type !== 'connector');
  if (!from || !to) return null;
  const fromCenter = center(from);
  const toCenter = center(to);
  const start = anchorPoint(from, toCenter);
  const end = anchorPoint(to, fromCenter);
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const path = horizontal
    ? `M ${start.x} ${start.y} C ${(start.x + end.x) / 2} ${start.y}, ${(start.x + end.x) / 2} ${end.y}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x} ${(start.y + end.y) / 2}, ${end.x} ${(start.y + end.y) / 2}, ${end.x} ${end.y}`;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const arrowLength = 12;
  const spread = Math.PI / 7;
  const first = { x: end.x - arrowLength * Math.cos(angle - spread), y: end.y - arrowLength * Math.sin(angle - spread) };
  const second = { x: end.x - arrowLength * Math.cos(angle + spread), y: end.y - arrowLength * Math.sin(angle + spread) };
  return {
    start,
    end,
    midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    path,
    arrowPath: `M ${first.x} ${first.y} L ${end.x} ${end.y} L ${second.x} ${second.y}`,
  };
}

export function createCanvasConnector(id: string, fromObjectId: string, toObjectId: string, layer: number, objects: CanvasObject[]): CanvasObject | null {
  if (fromObjectId === toObjectId) return null;
  const connector: CanvasObject = {
    id,
    type: 'connector',
    connector: { fromObjectId, toObjectId, arrowEnd: true },
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    rotation: 0,
    style: { color: '#FF7A00', strokeWidth: 3 },
    layer,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const geometry = getCanvasConnectorGeometry(connector, objects);
  if (!geometry) return null;
  return { ...connector, position: geometry.start, size: { width: geometry.end.x - geometry.start.x, height: geometry.end.y - geometry.start.y }, points: [geometry.start, geometry.end] };
}

export function removeDanglingCanvasConnectors(objects: CanvasObject[]): CanvasObject[] {
  const ids = new Set(objects.filter(object => object.type !== 'connector').map(object => object.id));
  return objects.filter(object => object.type !== 'connector' || Boolean(object.connector && ids.has(object.connector.fromObjectId) && ids.has(object.connector.toObjectId)));
}

export function hasCanvasConnector(objects: CanvasObject[], firstId: string, secondId: string): boolean {
  return objects.some(object => object.type === 'connector' && object.connector && ((object.connector.fromObjectId === firstId && object.connector.toObjectId === secondId) || (object.connector.fromObjectId === secondId && object.connector.toObjectId === firstId)));
}
