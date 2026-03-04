/**
 * Split a flat array into two interleaved columns for a masonry grid.
 * Item 0 → left, item 1 → right, item 2 → left, …
 */
export function splitColumns<T>(items: T[]): [T[], T[]] {
  const left: T[]  = [];
  const right: T[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? left : right).push(item));
  return [left, right];
}
