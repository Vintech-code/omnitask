export interface VersionedRecord {
  id: string;
  version?: number;
}

export interface MigrationResult<T> {
  records: T[];
  changedIds: string[];
}

/**
 * Runs record migrations in ascending version order. Migrations must be
 * idempotent because local and cloud copies can independently reach the store.
 */
export function migrateVersionedRecords<T extends VersionedRecord>(
  records: T[],
  currentVersion: number,
  migrate: (record: T, fromVersion: number) => T,
): MigrationResult<T> {
  const changedIds: string[] = [];
  const migrated = records.map(record => {
    const fromVersion = Math.max(0, Math.floor(record.version ?? 0));
    if (fromVersion >= currentVersion) return record;
    const next = { ...migrate(record, fromVersion), version: currentVersion };
    changedIds.push(record.id);
    return next;
  });
  return { records: migrated, changedIds };
}
