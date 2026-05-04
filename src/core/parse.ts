import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Table } from '../types';
import { parseGeojson } from './geojson';
import { parseMicroreact, type MicroreactExtract } from './microreact';

export type ParseResult = {
  tables: Table[];
  /** ext detected from filename, useful for picking the right delimiter on subsequent edits. */
  ext: string;
  /**
   * When present, the file also produced a tree (e.g. .microreact bundles).
   * The caller (App) should plumb this into the tree slot.
   */
  bundledTree?: { name: string; text: string };
};

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'tsv' || ext === 'tab') {
    return { tables: [parseDelimited(await file.text(), '\t')], ext };
  }
  if (ext === 'csv' || ext === 'txt' || ext === 'dat') {
    return { tables: [parseDelimited(await file.text())], ext };
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
    return { tables: parseXlsx(await file.arrayBuffer()), ext };
  }
  if (ext === 'json') {
    return { tables: [parseJson(await file.text())], ext };
  }
  if (ext === 'geojson') {
    return { tables: [parseGeojson(await file.text())], ext };
  }
  if (ext === 'microreact') {
    return microreactToParseResult(parseMicroreact(await file.text()), ext);
  }
  // Best-effort fallback: detect by content shape.
  const text = await file.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    // Try GeoJSON first (it's a strict subset of JSON), then plain JSON.
    try {
      return { tables: [parseGeojson(text)], ext };
    } catch {
      return { tables: [parseJson(text)], ext };
    }
  }
  return { tables: [parseDelimited(text)], ext };
}

function microreactToParseResult(extract: MicroreactExtract, ext: string): ParseResult {
  const tables = extract.metadata ? [extract.metadata] : [];
  const result: ParseResult = { tables, ext };
  if (extract.tree) {
    result.bundledTree = { name: extract.treeName ?? 'tree', text: extract.tree };
  }
  if (tables.length === 0 && !extract.tree) {
    throw new Error(
      'Could not extract any metadata or tree from the .microreact file. ' +
        'The bundle may use an unsupported schema.',
    );
  }
  return result;
}

/**
 * Accept either an array of objects (canonical) or `{ columns: [...], rows: [...] }`.
 * Every value is coerced to string for downstream uniformity.
 */
export function parseJson(text: string): Table {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON file is not valid JSON: ${(e as Error).message}`);
  }
  if (Array.isArray(parsed)) {
    return tableFromArray(parsed as Record<string, unknown>[]);
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { columns?: unknown; rows?: unknown };
    if (Array.isArray(obj.rows)) {
      return tableFromArray(obj.rows as Record<string, unknown>[]);
    }
  }
  throw new Error('JSON metadata must be an array of objects, or {columns, rows}.');
}

function tableFromArray(arr: Record<string, unknown>[]): Table {
  if (arr.length === 0) return { columns: [], rows: [], rowCount: 0 };
  // Union of keys across all rows preserves order from row 0 first, then appends extras.
  const seen = new Map<string, number>();
  const columnsRaw: string[] = [];
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue;
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.set(k, columnsRaw.length);
        columnsRaw.push(k);
      }
    }
  }
  const columns = dedupeHeaders(columnsRaw);
  const rows: Record<string, string>[] = arr.map((r) => {
    const out: Record<string, string> = {};
    for (let i = 0; i < columns.length; i++) {
      const v = (r ?? {})[columnsRaw[i]];
      out[columns[i]] = v === undefined || v === null ? '' : String(v);
    }
    return out;
  });
  return { columns, rows, rowCount: rows.length };
}

export function parseDelimited(text: string, delimiter?: string): Table {
  const stripped = text.replace(/^﻿/, '');
  const result = Papa.parse<Record<string, string>>(stripped, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: delimiter ?? '',
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  const rawColumns = (result.meta.fields ?? []).map((c) => c.trim());
  const columns = dedupeHeaders(rawColumns);
  const rows = (result.data ?? []).map((r) => mapRowKeys(r, rawColumns, columns));
  return { columns, rows, rowCount: rows.length };
}

export function parseXlsx(buf: ArrayBuffer): Table[] {
  const wb = XLSX.read(buf, { type: 'array' });
  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });
    if (aoa.length === 0) {
      return { sheetName, columns: [], rows: [], rowCount: 0 };
    }
    const rawColumns = (aoa[0] as unknown[]).map((c) => String(c ?? '').trim());
    const columns = dedupeHeaders(rawColumns);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < aoa.length; i++) {
      const row = aoa[i] as unknown[];
      const rec: Record<string, string> = {};
      for (let j = 0; j < columns.length; j++) {
        const v = row[j];
        rec[columns[j]] = v === undefined || v === null ? '' : String(v).trim();
      }
      rows.push(rec);
    }
    return { sheetName, columns, rows, rowCount: rows.length };
  });
}

function dedupeHeaders(cols: string[]): string[] {
  const counts = new Map<string, number>();
  return cols.map((c, i) => {
    const base = c === '' ? `column_${i + 1}` : c;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}.${seen}`;
  });
}

/** Papa Parse keys rows by header strings; remap to deduped column names. */
function mapRowKeys(
  row: Record<string, string>,
  raw: string[],
  deduped: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < deduped.length; i++) {
    const v = row[raw[i]];
    out[deduped[i]] = v === undefined || v === null ? '' : String(v);
  }
  return out;
}
