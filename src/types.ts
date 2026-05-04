/**
 * Domain types for the lab-plots studio.
 *
 * Same metadata-agnostic / column-first guarantees as the prior tool:
 * application code contains no taxon, ontology term, or domain-specific
 * column name.
 */

export type ColumnType = 'numeric' | 'categorical' | 'binary' | 'text';

export type Table = {
  sheetName?: string;
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

export type ColumnSpec = {
  name: string;
  inferredType: ColumnType;
  overriddenType?: ColumnType;
  effectiveType: ColumnType;
  uniqueValues: string[];
  uniqueCount: number;
  nullCount: number;
  sample: string[];
  numericMin?: number;
  numericMax?: number;
};

/** The three plot kinds in this v1. Each maps to a tool module under src/tools/. */
export type PlotKind = 'tree' | 'heatmap' | 'sankey';

export type PlotMeta = {
  kind: PlotKind;
  title: string;
  blurb: string;
};
