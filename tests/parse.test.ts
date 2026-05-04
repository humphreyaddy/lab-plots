import { describe, expect, it } from 'vitest';
import { parseDelimited } from '../src/core/parse';

describe('parseDelimited', () => {
  it('reads a basic CSV with headers', () => {
    const t = parseDelimited('id,phylum\nA,Firmicutes\nB,Bacteroidota\n');
    expect(t.columns).toEqual(['id', 'phylum']);
    expect(t.rowCount).toBe(2);
    expect(t.rows[0]).toEqual({ id: 'A', phylum: 'Firmicutes' });
  });

  it('strips a UTF-8 BOM', () => {
    const t = parseDelimited('﻿id,value\nA,1\n');
    expect(t.columns).toEqual(['id', 'value']);
    expect(t.rows[0].id).toBe('A');
  });

  it('handles semicolon CSVs via auto delimiter sniff', () => {
    const t = parseDelimited('id;phylum\nA;Firmicutes\n');
    expect(t.columns).toEqual(['id', 'phylum']);
    expect(t.rows[0].phylum).toBe('Firmicutes');
  });

  it('handles tabs when delimiter is forced', () => {
    const t = parseDelimited('id\tvalue\nA\t1\n', '\t');
    expect(t.columns).toEqual(['id', 'value']);
  });

  it('dedupes duplicate headers', () => {
    // Papa Parse auto-renames duplicate headers as `name_N`. We accept
    // whatever convention the parser chose; what matters is that distinct
    // suffixed names exist and that the rows are keyed correctly.
    const t = parseDelimited('id,phylum,phylum\nA,F,B\n');
    expect(t.columns.length).toBe(3);
    expect(t.columns[0]).toBe('id');
    expect(t.columns[1]).toBe('phylum');
    expect(t.columns[2]).not.toBe('phylum');
    expect(t.rows[0]['phylum']).toBe('F');
    expect(t.rows[0][t.columns[2]]).toBe('B');
  });

  it('renames blank headers to column_N', () => {
    const t = parseDelimited(',phylum\nA,F\n');
    expect(t.columns).toEqual(['column_1', 'phylum']);
  });

  it('drops trailing blank rows', () => {
    const t = parseDelimited('id,v\nA,1\n\n\n');
    expect(t.rowCount).toBe(1);
  });
});
