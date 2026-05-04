import { describe, expect, it } from 'vitest';
import { parseTree, parseNexus, parsePhyloxml, parseNexml } from '../src/core/tree';

describe('parseTree dispatcher', () => {
  it('routes plain Newick', () => {
    const r = parseTree('(A:1,B:2,C:3);');
    expect(r.format).toBe('newick');
    expect(r.tipNames.sort()).toEqual(['A', 'B', 'C']);
  });

  it('detects NHX extension by [&&NHX:..] markers', () => {
    const r = parseTree('(A[&&NHX:S=human]:1,B[&&NHX:S=mouse]:2);');
    expect(r.format).toBe('nhx');
    expect(r.tipNames.sort()).toEqual(['A', 'B']);
  });

  it('returns unknown for empty input', () => {
    expect(parseTree('').format).toBe('unknown');
  });
});

describe('parseNexus', () => {
  it('extracts tips from a TREES block', () => {
    const nex = `#NEXUS
BEGIN TREES;
  TREE t1 = (A:0.1,(B:0.2,C:0.3):0.4);
END;`;
    expect(parseNexus(nex).sort()).toEqual(['A', 'B', 'C']);
  });

  it('honors a TRANSLATE block', () => {
    const nex = `#NEXUS
BEGIN TREES;
  TRANSLATE
    1 alpha,
    2 beta,
    3 'gamma sample';
  TREE t1 = (1:0.1,(2:0.2,3:0.3):0.4);
END;`;
    expect(parseNexus(nex).sort()).toEqual(['alpha', 'beta', 'gamma sample']);
  });

  it('falls back to TAXLABELS when no TREES block', () => {
    const nex = `#NEXUS
BEGIN TAXA;
  DIMENSIONS NTAX=3;
  TAXLABELS A B 'C with space';
END;`;
    expect(parseNexus(nex).sort()).toEqual(['A', 'B', 'C with space']);
  });

  it('strips Nexus comments', () => {
    const nex = `#NEXUS
BEGIN TREES;
  [a stray comment]
  TREE t1 = (A:0.1[&label=foo],B:0.2);
END;`;
    expect(parseNexus(nex).sort()).toEqual(['A', 'B']);
  });
});

describe('parsePhyloxml', () => {
  it('extracts leaf <name> values', () => {
    const xml = `<phyloxml xmlns="http://www.phyloxml.org">
      <phylogeny rooted="true">
        <clade>
          <name>root</name>
          <clade><name>A</name></clade>
          <clade>
            <name>internal</name>
            <clade><name>B</name></clade>
            <clade><name>C</name></clade>
          </clade>
        </clade>
      </phylogeny>
    </phyloxml>`;
    expect(parsePhyloxml(xml).sort()).toEqual(['A', 'B', 'C']);
  });

  it('ignores XML comments', () => {
    const xml = `<phyloxml>
      <phylogeny>
        <clade>
          <!-- this is a comment -->
          <clade><name>X</name></clade>
          <clade><name>Y</name></clade>
        </clade>
      </phylogeny>
    </phyloxml>`;
    expect(parsePhyloxml(xml).sort()).toEqual(['X', 'Y']);
  });

  it('returns [] for non-PhyloXML content', () => {
    expect(parsePhyloxml('<foo><bar/></foo>')).toEqual([]);
  });
});

describe('parseNexml', () => {
  it('reads <otu label="..."/> tags', () => {
    const xml = `<nex:nexml xmlns:nex="http://www.nexml.org/2009">
      <otus id="o1">
        <otu id="t1" label="alpha"/>
        <otu id="t2" label="beta"/>
        <otu id="t3" label="gamma"/>
      </otus>
    </nex:nexml>`;
    expect(parseNexml(xml).sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('falls back to id when label is missing', () => {
    const xml = `<nexml><otus><otu id="A"/><otu id="B"/></otus></nexml>`;
    expect(parseNexml(xml).sort()).toEqual(['A', 'B']);
  });
});

describe('parseTree end-to-end across formats', () => {
  it('handles all 5 formats and returns equivalent tip lists', () => {
    const newick = '(A:1,B:1,C:1);';
    const nhx = '(A[&&NHX:S=h]:1,B[&&NHX:S=m]:1,C[&&NHX:S=r]:1);';
    const nexus = '#NEXUS\nBEGIN TREES; TREE t = (A:1,B:1,C:1); END;';
    const phyloxml = `<phyloxml><phylogeny><clade>
      <clade><name>A</name></clade>
      <clade><name>B</name></clade>
      <clade><name>C</name></clade>
    </clade></phylogeny></phyloxml>`;
    const nexml = `<nexml><otus>
      <otu id="t1" label="A"/><otu id="t2" label="B"/><otu id="t3" label="C"/>
    </otus></nexml>`;
    for (const text of [newick, nhx, nexus, phyloxml, nexml]) {
      const r = parseTree(text);
      expect(r.tipNames.sort()).toEqual(['A', 'B', 'C']);
      expect(r.format).not.toBe('unknown');
    }
  });
});
