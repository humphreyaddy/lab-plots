import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Download } from 'lucide-react';
import type { ColumnSpec, Table } from '../../types';
import { downloadText } from '../../core/zip';

const SCALES: Record<string, [string, string, string]> = {
  viridis: ['#440154', '#21918c', '#fde725'],
  plasma:  ['#0d0887', '#cc4778', '#f0f921'],
  RdBu:    ['#053061', '#f7f7f7', '#67001f'],
  RdYlBu:  ['#a50026', '#ffffbf', '#313695'],
  BrBG:    ['#543005', '#f5f5f5', '#003c30'],
  Earth:   ['#fcf5d9', '#a3c34a', '#2b4e14'],
};

type Props = {
  table: Table;
  idColumn: string;
  specs: ColumnSpec[];
};

export function HeatmapTool({ table, idColumn, specs }: Props) {
  const numericSpecs = specs.filter((s) => s.effectiveType === 'numeric');
  const [selected, setSelected] = useState<string[]>(
    numericSpecs.slice(0, 8).map((s) => s.name),
  );
  const [scale, setScale] = useState<string>('viridis');
  const [norm, setNorm] = useState<'none' | 'zscore' | 'minmax' | 'log10'>('none');
  const [cluster, setCluster] = useState<'none' | 'rows'>('none');

  const dataset = useMemo(
    () => buildHeatmapData(table, idColumn, selected, norm, cluster),
    [table, idColumn, selected, norm, cluster],
  );

  const option: EChartsOption = useMemo(() => {
    const stops = SCALES[scale] ?? SCALES.viridis;
    return {
      tooltip: { position: 'top' },
      animation: false,
      grid: { left: 140, right: 30, top: 20, bottom: 90 },
      xAxis: {
        type: 'category',
        data: dataset.cols,
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: dataset.rowIds,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      visualMap: {
        min: dataset.min,
        max: dataset.max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        inRange: { color: stops },
      },
      series: [
        {
          type: 'heatmap',
          data: dataset.cells,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.4)' } },
        },
      ],
    };
  }, [dataset, scale]);

  if (numericSpecs.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No numeric columns detected in this sheet. Heatmaps need at least one
        numeric column. Try overriding a column's datatype to "numeric" in
        step 3 if the values look numeric to you.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="text-sm font-semibold">Configure heatmap</span>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="label mb-1">Color scale</div>
            <select className="select" value={scale} onChange={(e) => setScale(e.target.value)}>
              {Object.keys(SCALES).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Normalization</div>
            <select
              className="select"
              value={norm}
              onChange={(e) => setNorm(e.target.value as typeof norm)}
            >
              <option value="none">none</option>
              <option value="zscore">Z-score (per column)</option>
              <option value="minmax">min/max (per column)</option>
              <option value="log10">log10</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Row order</div>
            <select
              className="select"
              value={cluster}
              onChange={(e) => setCluster(e.target.value as typeof cluster)}
            >
              <option value="none">file order</option>
              <option value="rows">cluster by similarity</option>
            </select>
          </div>
        </div>
        <div className="card-body">
          <div className="label mb-2">Numeric columns to include</div>
          <div className="flex flex-wrap gap-2">
            {numericSpecs.map((c) => {
              const active = selected.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  className={[
                    'rounded-md border px-2 py-1 text-xs transition-colors',
                    active
                      ? 'border-ink-700 bg-ink-800 text-white'
                      : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                  ].join(' ')}
                  onClick={() =>
                    setSelected((s) =>
                      active ? s.filter((n) => n !== c.name) : [...s, c.name],
                    )
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-ink-500">
          Pick at least one numeric column above to draw the heatmap.
        </p>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="text-sm font-semibold">Preview</span>
            <button
              className="btn"
              onClick={() => {
                const tsv = exportTsv(dataset, idColumn);
                downloadText(tsv, 'heatmap_data.tsv');
              }}
            >
              <Download className="h-4 w-4" /> Download data (.tsv)
            </button>
          </div>
          <div className="p-3">
            <ReactECharts
              option={option}
              style={{ height: Math.max(420, 22 * dataset.rowIds.length + 120) }}
              notMerge
            />
          </div>
        </div>
      )}
    </div>
  );
}

type HeatmapDataset = {
  rowIds: string[];
  cols: string[];
  /** echarts heatmap series: [colIndex, rowIndex, value] */
  cells: [number, number, number][];
  min: number;
  max: number;
};

function buildHeatmapData(
  table: Table,
  idColumn: string,
  cols: string[],
  norm: 'none' | 'zscore' | 'minmax' | 'log10',
  cluster: 'none' | 'rows',
): HeatmapDataset {
  // Build a numeric matrix [rows][cols] keyed by id column.
  const baseIds: string[] = [];
  const matrix: number[][] = [];
  for (const r of table.rows) {
    const id = (r[idColumn] ?? '').trim();
    if (!id) continue;
    const row: number[] = [];
    for (const c of cols) {
      const n = Number((r[c] ?? '').trim());
      row.push(Number.isFinite(n) ? n : NaN);
    }
    baseIds.push(id);
    matrix.push(row);
  }

  // Per-column normalisation.
  if (norm !== 'none' && cols.length > 0) {
    for (let j = 0; j < cols.length; j++) {
      const colVals = matrix.map((r) => r[j]).filter(Number.isFinite);
      if (norm === 'log10') {
        for (let i = 0; i < matrix.length; i++) {
          matrix[i][j] = matrix[i][j] > 0 ? Math.log10(matrix[i][j]) : NaN;
        }
      } else if (norm === 'minmax') {
        const min = Math.min(...colVals);
        const max = Math.max(...colVals);
        const span = max - min;
        if (span > 0) {
          for (let i = 0; i < matrix.length; i++) {
            const v = matrix[i][j];
            matrix[i][j] = Number.isFinite(v) ? (v - min) / span : NaN;
          }
        }
      } else if (norm === 'zscore') {
        const mean = colVals.reduce((a, b) => a + b, 0) / Math.max(1, colVals.length);
        const sd = Math.sqrt(
          colVals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, colVals.length - 1),
        );
        if (sd > 0) {
          for (let i = 0; i < matrix.length; i++) {
            const v = matrix[i][j];
            matrix[i][j] = Number.isFinite(v) ? (v - mean) / sd : NaN;
          }
        }
      }
    }
  }

  // Optional row clustering: order rows by mean across selected columns.
  // Cheap surrogate for hierarchical clustering — adequate for v1.
  let rowOrder = baseIds.map((_, i) => i);
  if (cluster === 'rows' && matrix.length > 1) {
    const means = matrix.map((row) => {
      const finite = row.filter(Number.isFinite);
      return finite.length === 0 ? -Infinity : finite.reduce((a, b) => a + b, 0) / finite.length;
    });
    rowOrder = rowOrder.slice().sort((a, b) => means[a] - means[b]);
  }

  const rowIds = rowOrder.map((i) => baseIds[i]);
  const orderedMatrix = rowOrder.map((i) => matrix[i]);

  let min = Infinity;
  let max = -Infinity;
  const cells: [number, number, number][] = [];
  for (let i = 0; i < orderedMatrix.length; i++) {
    for (let j = 0; j < cols.length; j++) {
      const v = orderedMatrix[i][j];
      if (!Number.isFinite(v)) continue;
      cells.push([j, i, Number(v.toFixed(6))]);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 1;

  return { rowIds, cols, cells, min, max };
}

function exportTsv(dataset: HeatmapDataset, idHeader: string): string {
  const lines = [[idHeader, ...dataset.cols].join('\t')];
  const cellMap = new Map<string, number>();
  for (const [c, r, v] of dataset.cells) cellMap.set(`${r}|${c}`, v);
  for (let i = 0; i < dataset.rowIds.length; i++) {
    const row = [dataset.rowIds[i]];
    for (let j = 0; j < dataset.cols.length; j++) {
      const v = cellMap.get(`${i}|${j}`);
      row.push(v === undefined ? '' : String(v));
    }
    lines.push(row.join('\t'));
  }
  return lines.join('\n') + '\n';
}
