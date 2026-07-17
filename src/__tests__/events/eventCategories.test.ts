import { DEFAULT_EVENT_CATEGORIES, normalizeEventCategories } from '@/utils/eventCategories';

describe('persistent event categories', () => {
  it('keeps defaults and custom categories while removing blank and case-insensitive duplicates', () => {
    expect(normalizeEventCategories([
      ...DEFAULT_EVENT_CATEGORIES,
      'Client',
      ' client ',
      '',
      'Volunteer',
    ])).toEqual([...DEFAULT_EVENT_CATEGORIES, 'Client', 'Volunteer']);
  });
});
