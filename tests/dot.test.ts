import { describe, expect, it } from 'vitest';
import { parseDot, parseTree } from '../src/core/tree';

describe('parseDot', () => {
  it('extracts leaves from a directed tree', () => {
    const dot = `digraph {
      root -> A;
      root -> B;
      B -> C;
      B -> D;
    }`;
    expect(parseDot(dot).sort()).toEqual(['A', 'C', 'D']);
  });

  it('honors label= attributes', () => {
    const dot = `digraph {
      n1 [label="Alpha"];
      n2 [label="Beta"];
      n3 [label="Gamma"];
      n0 -> n1;
      n0 -> n2;
      n2 -> n3;
    }`;
    // Alpha (n1) and Gamma (n3) are leaves; Beta (n2) is internal
    expect(parseDot(dot).sort()).toEqual(['Alpha', 'Gamma']);
    expect(parseDot(dot)).not.toContain('Beta');
  });

  it('handles undirected graphs (degree-1 = leaf)', () => {
    const dot = `graph {
      A -- B;
      B -- C;
      B -- D;
    }`;
    expect(parseDot(dot).sort()).toEqual(['A', 'C', 'D']);
  });

  it('handles quoted node ids', () => {
    const dot = `digraph {
      "root" -> "leaf 1";
      "root" -> "leaf 2";
    }`;
    expect(parseDot(dot).sort()).toEqual(['leaf 1', 'leaf 2']);
  });

  it('parseTree dispatcher recognises DOT', () => {
    const r = parseTree('digraph { A -> B; A -> C; }');
    expect(r.format).toBe('dot');
    expect(r.tipNames.sort()).toEqual(['B', 'C']);
  });
});
