import type { Table } from '../types';

const ID_NAME_HINTS = [
  'id',
  'sample_id',
  'sampleid',
  'sample',
  'tip',
  'tip_label',
  'tipname',
  'tipnames',
  'tip_name',
  'name',
  'isolate',
  'accession',
  'leaf',
  'leaf_label',
  'label',
  'taxon',
  'taxa',
  'genome',
  'mag',
  'bin',
  'strain',
];

/**
 * Heuristic: pick the column most likely to be the tree-tip ID.
 * 1. Prefer a name match (case-insensitive, hyphen/underscore-insensitive).
 * 2. Otherwise the leftmost column whose values are all unique and non-empty.
 * 3. Otherwise null — let the user pick.
 */
export function guessIdColumn(table: Table): string | null {
  if (table.columns.length === 0) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const cols = table.columns;

  for (const hint of ID_NAME_HINTS) {
    const found = cols.find((c) => norm(c) === hint);
    if (found && hasAllUnique(table, found)) return found;
  }
  for (const c of cols) {
    if (hasAllUnique(table, c)) return c;
  }
  return null;
}

export type IdColumnReport = {
  totalRows: number;
  nonEmpty: number;
  uniqueCount: number;
  duplicates: string[];
  empties: number;
};

export function reportIdColumn(table: Table, idCol: string | null): IdColumnReport | null {
  if (!idCol) return null;
  const seen = new Map<string, number>();
  let empties = 0;
  for (const r of table.rows) {
    const v = (r[idCol] ?? '').trim();
    if (v === '') {
      empties++;
      continue;
    }
    seen.set(v, (seen.get(v) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [k, n] of seen.entries()) if (n > 1) duplicates.push(k);
  return {
    totalRows: table.rows.length,
    nonEmpty: table.rows.length - empties,
    uniqueCount: seen.size,
    duplicates,
    empties,
  };
}

function hasAllUnique(table: Table, col: string): boolean {
  const seen = new Set<string>();
  for (const r of table.rows) {
    const v = (r[col] ?? '').trim();
    if (v === '') return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size > 0;
}
