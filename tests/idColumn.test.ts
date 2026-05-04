import { describe, expect, it } from 'vitest';
import { guessIdColumn, reportIdColumn } from '../src/core/idColumn';
import type { Table } from '../src/types';

const tbl = (rows: Record<string, string>[], columns: string[]): Table => ({
  columns,
  rows,
  rowCount: rows.length,
});

describe('guessIdColumn', () => {
  it('picks "id" when present and unique', () => {
    const t = tbl(
      [
        { id: 'A', sex: 'M' },
        { id: 'B', sex: 'F' },
      ],
      ['id', 'sex'],
    );
    expect(guessIdColumn(t)).toBe('id');
  });

  it('matches case- and separator-insensitively', () => {
    const t = tbl(
      [
        { Sample_ID: 'A', sex: 'M' },
        { Sample_ID: 'B', sex: 'F' },
      ],
      ['Sample_ID', 'sex'],
    );
    expect(guessIdColumn(t)).toBe('Sample_ID');
  });

  it('does NOT pick a hint-named column if it is non-unique', () => {
    const t = tbl(
      [
        { id: 'X', accession: 'A' },
        { id: 'X', accession: 'B' },
      ],
      ['id', 'accession'],
    );
    expect(guessIdColumn(t)).toBe('accession');
  });

  it('falls back to the leftmost unique column', () => {
    const t = tbl(
      [
        { foo: 'a', bar: 'b' },
        { foo: 'a', bar: 'c' },
      ],
      ['foo', 'bar'],
    );
    expect(guessIdColumn(t)).toBe('bar');
  });

  it('returns null when no column is unique', () => {
    const t = tbl(
      [
        { foo: 'a', bar: 'b' },
        { foo: 'a', bar: 'b' },
      ],
      ['foo', 'bar'],
    );
    expect(guessIdColumn(t)).toBeNull();
  });

  it('rejects categorical columns like sex (M/F repeats)', () => {
    const t = tbl(
      [
        { sex: 'M', accession: 'A' },
        { sex: 'F', accession: 'B' },
        { sex: 'M', accession: 'C' },
      ],
      ['sex', 'accession'],
    );
    expect(guessIdColumn(t)).toBe('accession');
  });
});

describe('reportIdColumn', () => {
  it('reports duplicates', () => {
    const t = tbl([{ id: 'A' }, { id: 'A' }, { id: 'B' }], ['id']);
    const r = reportIdColumn(t, 'id')!;
    expect(r.duplicates).toEqual(['A']);
    expect(r.uniqueCount).toBe(2);
    expect(r.empties).toBe(0);
  });

  it('counts empty IDs', () => {
    const t = tbl([{ id: 'A' }, { id: '' }, { id: 'B' }], ['id']);
    const r = reportIdColumn(t, 'id')!;
    expect(r.empties).toBe(1);
    expect(r.nonEmpty).toBe(2);
  });

  it('returns null when no column chosen', () => {
    expect(reportIdColumn(tbl([], []), null)).toBeNull();
  });
});
