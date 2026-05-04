import { describe, expect, it } from 'vitest';
import { parseMicroreact } from '../src/core/microreact';

describe('parseMicroreact', () => {
  it('extracts an embedded Newick tree from any string field', () => {
    const bundle = JSON.stringify({
      meta: { title: 'demo' },
      trees: { t1: { data: '(A:1,B:2,C:3);' } },
    });
    const r = parseMicroreact(bundle);
    expect(r.tree).toBe('(A:1,B:2,C:3);');
  });

  it('extracts an embedded CSV from any string field', () => {
    const csv = 'id,group\nSAMPLE_001,A\nSAMPLE_002,B\n';
    const bundle = JSON.stringify({
      datasets: { d1: { data: csv } },
    });
    const r = parseMicroreact(bundle);
    expect(r.metadata).not.toBeNull();
    expect(r.metadata!.columns).toEqual(['id', 'group']);
    expect(r.metadata!.rowCount).toBe(2);
  });

  it('decodes base64 data: URLs', () => {
    const csv = 'id,n\nA,1\nB,2\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const bundle = JSON.stringify({
      files: { 'meta.csv': { data: `data:text/csv;base64,${b64}` } },
    });
    const r = parseMicroreact(bundle);
    expect(r.metadata!.rowCount).toBe(2);
    expect(r.metadata!.rows[0].id).toBe('A');
  });

  it('finds both metadata and tree in the same bundle', () => {
    const bundle = JSON.stringify({
      datasets: { d1: { data: 'id,group\nA,X\nB,Y\n' } },
      trees: { t1: { data: '(A:1,B:2);' } },
    });
    const r = parseMicroreact(bundle);
    expect(r.metadata!.columns).toEqual(['id', 'group']);
    expect(r.tree).toBe('(A:1,B:2);');
  });

  it('returns nulls when nothing parseable is found', () => {
    const bundle = JSON.stringify({ meta: { title: 'empty' } });
    const r = parseMicroreact(bundle);
    expect(r.metadata).toBeNull();
    expect(r.tree).toBeNull();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseMicroreact('not json')).toThrow();
  });
});
