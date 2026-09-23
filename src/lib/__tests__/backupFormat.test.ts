import { countRows, parseBackup } from '../backupFormat';

const valid = {
  app: 'betterment',
  schemaVersion: 1,
  exportedAt: '2026-09-20T10:00:00.000Z',
  tables: {
    categories: [{ id: 1, name: 'Work', color: '#5271C4', is_active: 1 }],
    settings: [{ key: 'currency', value: 'PHP' }],
    time_blocks: [
      {
        id: 1,
        start_time: '2026-09-20T01:00:00.000Z',
        end_time: '2026-09-20T02:00:00.000Z',
        category_id: 1,
        note: null,
        created_at: '2026-09-20T02:00:00.000Z',
      },
    ],
    transactions: [],
    goals: [],
  },
};

describe('parseBackup', () => {
  it('accepts a file this app exported', () => {
    const backup = parseBackup(JSON.stringify(valid), 1);
    expect(countRows(backup)).toBe(3);
    expect(backup.exportedAt).toBe(valid.exportedAt);
  });

  it('treats a missing table as empty', () => {
    const { goals: _goals, ...tables } = valid.tables;
    const backup = parseBackup(JSON.stringify({ ...valid, tables }), 1);
    expect(backup.tables.goals).toEqual([]);
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('not json', 1)).toThrow(/isn't readable JSON/);
  });

  it("rejects another app's JSON", () => {
    expect(() => parseBackup(JSON.stringify({ tables: {} }), 1)).toThrow(/isn't a Betterment backup/);
  });

  it('rejects a backup from a newer schema', () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, schemaVersion: 2 }), 1)).toThrow(/newer version/);
  });

  it('rejects a table that is not a list of flat rows', () => {
    const broken = { ...valid, tables: { ...valid.tables, time_blocks: [{ id: { nested: true } }] } };
    expect(() => parseBackup(JSON.stringify(broken), 1)).toThrow(/time blocks/);
  });

  it('rejects a backup with no categories', () => {
    const empty = { ...valid, tables: { ...valid.tables, categories: [] } };
    expect(() => parseBackup(JSON.stringify(empty), 1)).toThrow(/no categories/);
  });
});
