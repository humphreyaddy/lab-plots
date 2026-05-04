import type { ColumnSpec, ColumnType, Table } from '../types';

const BINARY_PAIRS: Set<string>[] = [
  new Set(['0', '1']),
  new Set(['yes', 'no']),
  new Set(['y', 'n']),
  new Set(['true', 'false']),
  new Set(['t', 'f']),
  new Set(['present', 'absent']),
  new Set(['positive', 'negative']),
  new Set(['+', '-']),
];

const NUMERIC_THRESHOLD = 0.95;
const CATEGORICAL_MAX_UNIQUE = 50;

export function profileColumn(table: Table, name: string): ColumnSpec {
  const values = table.rows.map((r) => r[name] ?? '');
  const nonNull = values.filter((v) => v !== '');
  const unique = uniqueOrdered(nonNull);
  const inferred = inferType(nonNull, unique);

  let numericMin: number | undefined;
  let numericMax: number | undefined;
  if (inferred === 'numeric') {
    let min = Infinity;
    let max = -Infinity;
    for (const v of nonNull) {
      const n = Number(v);
      if (Number.isFinite(n)) {
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
    if (Number.isFinite(min)) numericMin = min;
    if (Number.isFinite(max)) numericMax = max;
  }

  return {
    name,
    inferredType: inferred,
    effectiveType: inferred,
    uniqueValues: unique.slice(0, 100),
    uniqueCount: unique.length,
    nullCount: values.length - nonNull.length,
    sample: nonNull.slice(0, 5),
    numericMin,
    numericMax,
  };
}

export function profileTable(table: Table, idColumn: string | null): ColumnSpec[] {
  return table.columns
    .filter((c) => c !== idColumn)
    .map((c) => profileColumn(table, c));
}

export function applyOverride(spec: ColumnSpec, override?: ColumnType): ColumnSpec {
  return {
    ...spec,
    overriddenType: override,
    effectiveType: override ?? spec.inferredType,
  };
}

export function inferType(nonNull: string[], unique: string[]): ColumnType {
  if (nonNull.length === 0) return 'text';
  // Binary check is case-insensitive: ['Yes','YES','no','No'] → 2 distinct lowercase tokens.
  const lowerSet = new Set(unique.map((u) => u.toLowerCase()));
  if (lowerSet.size === 2 && BINARY_PAIRS.some((p) => setsEqual(lowerSet, p))) {
    return 'binary';
  }
  let numeric = 0;
  for (const v of nonNull) if (Number.isFinite(Number(v))) numeric++;
  if (numeric / nonNull.length >= NUMERIC_THRESHOLD) return 'numeric';
  // Categorical when the number of distinct values is small in absolute terms
  // OR small relative to the number of rows. Either signal is enough.
  if (
    unique.length <= CATEGORICAL_MAX_UNIQUE &&
    (unique.length <= 5 || unique.length < nonNull.length)
  ) {
    return 'categorical';
  }
  return 'text';
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
