import { migrateVersionedRecords } from '@/services/SchemaMigrationService';

describe('SchemaMigrationService', () => {
  it('migrates old records once and leaves current records unchanged', () => {
    const current = { id: 'current', title: 'Ready', version: 2 };
    const result = migrateVersionedRecords(
      [{ id: 'legacy', title: '', version: 0 }, current],
      2,
      record => ({ ...record, title: record.title || 'Untitled' }),
    );

    expect(result.records).toEqual([
      { id: 'legacy', title: 'Untitled', version: 2 },
      current,
    ]);
    expect(result.changedIds).toEqual(['legacy']);
    expect(result.records[1]).toBe(current);
  });
});
