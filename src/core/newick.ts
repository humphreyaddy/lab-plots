/**
 * Tiny Newick parser. We only need tip names — branch lengths, support
 * values, and node comments are skipped. Good enough for ID validation.
 */
export function extractTipNames(newick: string): string[] {
  // Only normalize trailing whitespace + semicolons. Whitespace inside
  // (potentially quoted) tip names is preserved.
  const cleaned = newick.replace(/[\s;]+$/, '');
  const tips: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === '(' || ch === ',') {
      i++;
      // Skip leading whitespace inside the next token.
      while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
      const next = cleaned[i];
      if (next === '(' || next === undefined) continue;
      let name = '';
      while (i < cleaned.length && !':,()'.includes(cleaned[i])) {
        name += cleaned[i++];
      }
      if (cleaned[i] === ':') {
        i++;
        while (i < cleaned.length && !',()'.includes(cleaned[i])) i++;
      }
      const trimmed = name.trim();
      if (trimmed.length > 0) tips.push(stripQuotes(trimmed));
      continue;
    }
    i++;
  }
  return tips;
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      return s.slice(1, -1);
    }
  }
  return s;
}

export type FuzzyMatch = { metaId: string; treeId: string; distance: number };

export type MatchReport = {
  matched: string[];
  metadataOnly: string[];
  treeOnly: string[];
  fuzzyMatches: FuzzyMatch[];
};

export function compareIds(metaIds: string[], treeIds: string[]): MatchReport {
  const treeSet = new Set(treeIds);
  const metaSet = new Set(metaIds);
  const matched: string[] = [];
  const metadataOnly: string[] = [];
  for (const m of metaIds) (treeSet.has(m) ? matched : metadataOnly).push(m);
  const treeOnly = treeIds.filter((t) => !metaSet.has(t));

  const fuzzyMatches: FuzzyMatch[] = [];
  for (const m of metadataOnly) {
    for (const t of treeOnly) {
      const d = levenshtein(m, t);
      if (d <= 2) fuzzyMatches.push({ metaId: m, treeId: t, distance: d });
    }
  }
  fuzzyMatches.sort((a, b) => a.distance - b.distance);
  return { matched, metadataOnly, treeOnly, fuzzyMatches };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
