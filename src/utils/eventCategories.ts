export const DEFAULT_EVENT_CATEGORIES = [
  'Work', 'Personal', 'Health', 'Education', 'Finance',
  'Social', 'Shopping', 'Travel', 'Family', 'Fitness',
  'Meeting', 'Birthday', 'Anniversary', 'Holiday', 'Other',
];

export function normalizeEventCategories(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => {
      if (!value) return false;
      const key = value.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
