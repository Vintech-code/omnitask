/** Format a Unix timestamp into a human-readable label. */
export function formatDate(ts: number): string {
  const now = new Date();
  const d   = new Date(ts);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
