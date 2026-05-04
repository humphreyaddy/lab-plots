import { describe, expect, it } from 'vitest';
import { compareIds, extractTipNames, levenshtein } from '../src/core/newick';

describe('extractTipNames', () => {
  it('handles a flat tree', () => {
    expect(extractTipNames('(A:1,B:2,C:3);').sort()).toEqual(['A', 'B', 'C']);
  });

  it('handles nested groups', () => {
    expect(extractTipNames('((A:1,B:2):0.5,(C:1,D:1):0.3);').sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('strips quoted leaf names', () => {
    expect(extractTipNames("('node 1':1,B:1);").sort()).toEqual(['B', 'node 1']);
  });

  it('skips numeric branch lengths', () => {
    const tips = extractTipNames('(A:0.123,B:1e-3);');
    expect(tips).toEqual(['A', 'B']);
  });
});

describe('compareIds', () => {
  it('buckets matched, metadata-only, tree-only', () => {
    const r = compareIds(['A', 'B', 'C'], ['A', 'B', 'D']);
    expect(r.matched.sort()).toEqual(['A', 'B']);
    expect(r.metadataOnly).toEqual(['C']);
    expect(r.treeOnly).toEqual(['D']);
  });

  it('surfaces fuzzy matches up to distance 2', () => {
    const r = compareIds(['SAMPL1'], ['SAMPLE1']);
    expect(r.fuzzyMatches.length).toBe(1);
    expect(r.fuzzyMatches[0].distance).toBeLessThanOrEqual(2);
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('foo', 'foo')).toBe(0);
  });
  it('handles inserts/deletes', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
    expect(levenshtein('cat', 'cut')).toBe(1);
  });
});
