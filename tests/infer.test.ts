import { describe, expect, it } from 'vitest';
import { profileColumn, profileTable, applyOverride, inferType } from '../src/core/infer';
import type { Table } from '../src/types';

const t = (rows: Record<string, string>[], columns: string[]): Table => ({
  columns,
  rows,
  rowCount: rows.length,
});

describe('inferType', () => {
  it('detects numeric on >=95% numeric values', () => {
    const vals = ['1', '2', '3.5', '4', '5'];
    expect(inferType(vals, Array.from(new Set(vals)))).toBe('numeric');
  });

  it('detects binary {0,1}', () => {
    const vals = ['0', '1', '0', '1'];
    expect(inferType(vals, Array.from(new Set(vals)))).toBe('binary');
  });

  it('detects binary {yes,no} case-insensitive', () => {
    const vals = ['Yes', 'No', 'YES', 'no'];
    expect(inferType(vals, Array.from(new Set(vals)))).toBe('binary');
  });

  it('detects categorical when unique <= 50 and < total', () => {
    const vals = ['a', 'b', 'a', 'b', 'c'];
    expect(inferType(vals, ['a', 'b', 'c'])).toBe('categorical');
  });

  it('falls back to text', () => {
    const vals = Array.from({ length: 100 }, (_, i) => `s${i}`);
    expect(inferType(vals, vals)).toBe('text');
  });

  it('returns text for empty input', () => {
    expect(inferType([], [])).toBe('text');
  });
});

describe('profileColumn / profileTable', () => {
  it('records null counts and unique counts', () => {
    const tbl = t(
      [
        { id: 'A', phylum: 'Firm' },
        { id: 'B', phylum: '' },
        { id: 'C', phylum: 'Bact' },
      ],
      ['id', 'phylum'],
    );
    const spec = profileColumn(tbl, 'phylum');
    expect(spec.nullCount).toBe(1);
    expect(spec.uniqueCount).toBe(2);
    expect(spec.effectiveType).toBe('categorical');
  });

  it('omits the ID column from a table profile', () => {
    const tbl = t([{ id: 'A', x: '1' }, { id: 'B', x: '2' }], ['id', 'x']);
    const specs = profileTable(tbl, 'id');
    expect(specs.map((s) => s.name)).toEqual(['x']);
  });

  it('applyOverride changes effectiveType', () => {
    const tbl = t([{ id: 'A', x: '1' }, { id: 'B', x: '2' }], ['id', 'x']);
    const spec = profileColumn(tbl, 'x');
    expect(spec.effectiveType).toBe('numeric');
    const overridden = applyOverride(spec, 'categorical');
    expect(overridden.effectiveType).toBe('categorical');
    expect(overridden.inferredType).toBe('numeric');
  });

  it('records numeric range', () => {
    const tbl = t(
      [
        { id: 'A', x: '0.5' },
        { id: 'B', x: '2' },
        { id: 'C', x: '10' },
      ],
      ['id', 'x'],
    );
    const spec = profileColumn(tbl, 'x');
    expect(spec.numericMin).toBe(0.5);
    expect(spec.numericMax).toBe(10);
  });
});
