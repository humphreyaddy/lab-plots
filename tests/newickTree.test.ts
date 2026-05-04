import { describe, expect, it } from 'vitest';
import { leafCount, leaves, parseNewickTree } from '../src/core/newickTree';

describe('parseNewickTree', () => {
  it('parses a flat tree', () => {
    const t = parseNewickTree('(A:1,B:2,C:3);');
    expect(t.children.length).toBe(3);
    expect(t.children.map((c) => c.name).sort()).toEqual(['A', 'B', 'C']);
    expect(t.children.find((c) => c.name === 'B')?.branchLength).toBe(2);
  });

  it('parses nested groups', () => {
    const t = parseNewickTree('((A:1,B:1):0.5,(C:1,D:1):0.5);');
    expect(t.children.length).toBe(2);
    expect(leaves(t).map((l) => l.name).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(leafCount(t)).toBe(4);
  });

  it('strips Newick comments', () => {
    const t = parseNewickTree('(A[&label=foo]:1,B:1)[&root];');
    expect(leaves(t).map((l) => l.name).sort()).toEqual(['A', 'B']);
  });

  it('strips quoted leaf names', () => {
    const t = parseNewickTree("('A B':1,C:1);");
    expect(leaves(t).map((l) => l.name)).toContain('A B');
  });
});
