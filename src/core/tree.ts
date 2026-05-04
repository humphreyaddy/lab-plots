import { extractTipNames as extractNewickTips } from './newick';

export type TreeFormat =
  | 'newick'
  | 'nhx'
  | 'nexus'
  | 'phyloxml'
  | 'nexml'
  | 'dot'
  | 'unknown';

export type TreeParseResult = {
  format: TreeFormat;
  tipNames: string[];
};

/**
 * Format-agnostic tree tip extraction. Supports Newick, NHX (extended
 * Newick), Nexus (incl. TRANSLATE blocks), PhyloXML, and NeXML. We only
 * care about tip names — branch lengths, support values, comments, and
 * internal-node labels are intentionally discarded.
 */
export function parseTree(text: string): TreeParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { format: 'unknown', tipNames: [] };

  // XML-based formats (PhyloXML / NeXML) — sniff by content.
  if (trimmed.startsWith('<')) {
    if (/<phyloxml\b/i.test(trimmed)) {
      return { format: 'phyloxml', tipNames: parsePhyloxml(trimmed) };
    }
    if (/<(?:[a-z]+:)?nexml\b/i.test(trimmed)) {
      return { format: 'nexml', tipNames: parseNexml(trimmed) };
    }
    // Generic XML — try both, pick whichever returns tips.
    const phylo = parsePhyloxml(trimmed);
    if (phylo.length > 0) return { format: 'phyloxml', tipNames: phylo };
    const nexml = parseNexml(trimmed);
    if (nexml.length > 0) return { format: 'nexml', tipNames: nexml };
    return { format: 'unknown', tipNames: [] };
  }

  // Nexus
  if (/^#nexus\b/i.test(trimmed)) {
    return { format: 'nexus', tipNames: parseNexus(trimmed) };
  }

  // Graphviz DOT
  if (/^\s*(?:strict\s+)?(?:di)?graph\b/i.test(trimmed)) {
    return { format: 'dot', tipNames: parseDot(trimmed) };
  }

  // NHX (Newick with [&&NHX:...] annotations)
  if (/\[&&NHX:/i.test(trimmed)) {
    return { format: 'nhx', tipNames: extractNewickTips(stripNewickComments(trimmed)) };
  }

  // Plain Newick (anything else parens-leading)
  if (trimmed.startsWith('(') || /^[^\s()]+\s*;?$/.test(trimmed)) {
    return { format: 'newick', tipNames: extractNewickTips(stripNewickComments(trimmed)) };
  }

  return { format: 'unknown', tipNames: [] };
}

/** Strip Newick / NHX `[...]` comments. (Newick spec disallows nesting.) */
export function stripNewickComments(s: string): string {
  return s.replace(/\[[^\]]*\]/g, '');
}

/** Strip XML comments + processing instructions. */
function stripXmlNoise(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '');
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const a = s[0];
    const b = s[s.length - 1];
    if ((a === "'" && b === "'") || (a === '"' && b === '"')) return s.slice(1, -1);
  }
  return s;
}

/**
 * Nexus — find the TREES block, parse the first TREE statement, apply the
 * TRANSLATE table if present. Falls back to TAXLABELS if no TREES block.
 */
export function parseNexus(text: string): string[] {
  const cleaned = stripNexusComments(text);
  const treesBlock = matchBlock(cleaned, 'trees');
  if (treesBlock) {
    const translate = parseTranslateBlock(treesBlock);
    const treeStmt = treesBlock.match(/\btree\b[^=]*=\s*(?:\[[^\]]*\])?\s*([^;]+;)/i);
    if (treeStmt) {
      const newick = stripNewickComments(treeStmt[1]);
      const tips = extractNewickTips(newick);
      return tips.map((t) => translate.get(t) ?? t);
    }
  }
  const taxaBlock = matchBlock(cleaned, 'taxa') ?? cleaned;
  const tax = taxaBlock.match(/\btaxlabels\b\s+([\s\S]*?);/i);
  if (tax) {
    return tokenizeTaxLabels(tax[1]);
  }
  return [];
}

function matchBlock(text: string, name: string): string | null {
  const re = new RegExp(`begin\\s+${name}\\s*;([\\s\\S]*?)end\\s*;`, 'i');
  const m = text.match(re);
  return m ? m[1] : null;
}

function parseTranslateBlock(treesBlock: string): Map<string, string> {
  const map = new Map<string, string>();
  const m = treesBlock.match(/\btranslate\b\s+([\s\S]*?);/i);
  if (!m) return map;
  // Split on commas; each entry is "code label".
  for (const raw of m[1].split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parts = trimmed.match(/^(\S+)\s+([\s\S]+)$/);
    if (parts) map.set(parts[1], stripQuotes(parts[2].trim()));
  }
  return map;
}

function stripNexusComments(text: string): string {
  // Nexus comments are [...] but [&...] are sometimes commands; treat them all as comments
  // for tip-extraction purposes.
  return text.replace(/\[[^\]]*\]/g, '');
}

function tokenizeTaxLabels(block: string): string[] {
  // Quoted labels must be preserved as a single token.
  const tokens: string[] = [];
  let i = 0;
  while (i < block.length) {
    const c = block[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      const end = block.indexOf(quote, i + 1);
      if (end === -1) break;
      tokens.push(block.slice(i + 1, end));
      i = end + 1;
    } else {
      let end = i;
      while (end < block.length && !/\s/.test(block[end])) end++;
      tokens.push(block.slice(i, end));
      i = end;
    }
  }
  return tokens;
}

/**
 * PhyloXML — leaf clades (no nested <clade>) carry their tip name in <name>.
 */
export function parsePhyloxml(text: string): string[] {
  const cleaned = stripXmlNoise(text);
  const tips: string[] = [];
  // Match every <clade>...</clade> whose body contains no nested <clade>.
  const leafRe = /<clade\b[^>]*>((?:(?!<\/?clade\b)[\s\S])*?)<\/clade\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = leafRe.exec(cleaned)) !== null) {
    const inner = m[1];
    const nameMatch = inner.match(/<name\b[^>]*>([^<]+)<\/name\s*>/i);
    if (nameMatch) tips.push(stripQuotes(nameMatch[1].trim()));
  }
  return tips;
}

/**
 * NeXML — operational taxonomic units listed in <otu label=".." id=".."/>.
 */
export function parseNexml(text: string): string[] {
  const cleaned = stripXmlNoise(text);
  const tips: string[] = [];
  const otuRe = /<otu\b[^>]*\/?>(?:[\s\S]*?<\/otu\s*>)?/gi;
  let m: RegExpExecArray | null;
  while ((m = otuRe.exec(cleaned)) !== null) {
    const tag = m[0];
    const label = tag.match(/\blabel\s*=\s*["']([^"']*)["']/i)?.[1];
    const id = tag.match(/\bid\s*=\s*["']([^"']*)["']/i)?.[1];
    const chosen = label ?? id;
    if (chosen) tips.push(chosen);
  }
  return tips;
}

/**
 * Graphviz DOT — extract tip names. A "tip" here is any node that never appears
 * on the source side of an edge (`->` for directed, degree-1 for undirected).
 * For directed trees rooted at the first node, this gives the leaves directly.
 * Node labels (`label="..."`) override the bare node id.
 */
export function parseDot(text: string): string[] {
  const cleaned = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/(^|\s)#[^\n]*/g, '$1');

  const directed = /->/.test(cleaned);
  const labels = new Map<string, string>();
  const allNodes = new Set<string>();
  const sources = new Set<string>(); // for directed
  const degree = new Map<string, number>(); // for undirected

  // Node declarations with attributes: id [label="..."]
  const nodeAttrRe = /(?:^|[\s;{])("(?:[^"]|"")*"|[A-Za-z_][\w.]*)\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = nodeAttrRe.exec(cleaned)) !== null) {
    const id = stripQuotes(m[1]);
    if (looksLikeAttribute(id)) continue;
    const labelMatch = m[2].match(/\blabel\s*=\s*("(?:[^"]|"")*"|[\w.-]+)/i);
    if (labelMatch) labels.set(id, stripQuotes(labelMatch[1]));
    allNodes.add(id);
  }

  // Edges: id1 -> id2 or id1 -- id2 (allow attribute lists trailing).
  const edgeRe =
    /("(?:[^"]|"")*"|[A-Za-z_][\w.]*)\s*(->|--)\s*("(?:[^"]|"")*"|[A-Za-z_][\w.]*)/g;
  while ((m = edgeRe.exec(cleaned)) !== null) {
    const a = stripQuotes(m[1]);
    const b = stripQuotes(m[3]);
    if (looksLikeAttribute(a) || looksLikeAttribute(b)) continue;
    allNodes.add(a);
    allNodes.add(b);
    if (directed) {
      sources.add(a);
    } else {
      degree.set(a, (degree.get(a) ?? 0) + 1);
      degree.set(b, (degree.get(b) ?? 0) + 1);
    }
  }

  const tips: string[] = [];
  for (const id of allNodes) {
    const isLeaf = directed ? !sources.has(id) : (degree.get(id) ?? 0) <= 1;
    if (isLeaf) tips.push(labels.get(id) ?? id);
  }
  return tips;
}

const DOT_KEYWORDS = new Set([
  'graph',
  'digraph',
  'subgraph',
  'node',
  'edge',
  'strict',
]);

function looksLikeAttribute(s: string): boolean {
  return DOT_KEYWORDS.has(s.toLowerCase());
}

export const TREE_EXTENSIONS = [
  '.nwk',
  '.tree',
  '.tre',
  '.newick',
  '.nhx',
  '.nex',
  '.nexus',
  '.xml',
  '.phyloxml',
  '.nexml',
  '.dot',
  '.gv',
  '.txt',
];
