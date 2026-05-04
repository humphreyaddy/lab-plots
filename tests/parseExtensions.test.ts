import { describe, expect, it } from 'vitest';
import { parseJson } from '../src/core/parse';

describe('parseJson', () => {
  it('reads an array of objects', () => {
    const t = parseJson(JSON.stringify([
      { id: 'A', n: 1 },
      { id: 'B', n: 2 },
    ]));
    expect(t.columns).toEqual(['id', 'n']);
    expect(t.rows).toEqual([
      { id: 'A', n: '1' },
      { id: 'B', n: '2' },
    ]);
  });

  it('unions keys across rows', () => {
    const t = parseJson(JSON.stringify([
      { id: 'A', x: 1 },
      { id: 'B', y: 2 },
    ]));
    expect(t.columns).toEqual(['id', 'x', 'y']);
    expect(t.rows[0].y).toBe('');
    expect(t.rows[1].x).toBe('');
  });

  it('accepts {columns, rows} shape', () => {
    const t = parseJson(JSON.stringify({
      columns: ['id', 'n'],
      rows: [{ id: 'A', n: 1 }, { id: 'B', n: 2 }],
    }));
    expect(t.columns).toEqual(['id', 'n']);
    expect(t.rowCount).toBe(2);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJson('{not json}')).toThrow();
  });

  it('throws on non-array, non-{rows} JSON', () => {
    expect(() => parseJson(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('handles an empty array', () => {
    const t = parseJson('[]');
    expect(t.columns).toEqual([]);
    expect(t.rowCount).toBe(0);
  });

  it('coerces null/undefined to empty string', () => {
    const t = parseJson(JSON.stringify([{ id: 'A', x: null }, { id: 'B' }]));
    expect(t.rows[0].x).toBe('');
    expect(t.rows[1].x).toBe('');
  });
});
