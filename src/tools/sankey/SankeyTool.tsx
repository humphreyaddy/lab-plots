import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Download } from 'lucide-react';
import type { ColumnSpec, Table } from '../../types';
import { downloadText } from '../../core/zip';
import { assignColors, PALETTE_NAMES } from '../../core/palettes';

type Props = {
  table: Table;
  specs: ColumnSpec[];
};

type Mode = 'pairs' | 'flow';

export function SankeyTool({ table, specs }: Props) {
  const [mode, setMode] = useState<Mode>('flow');
  const cats = specs.filter(
    (s) => s.effectiveType === 'categorical' || s.effectiveType === 'binary',
  );
  const numerics = specs.filter((s) => s.effectiveType === 'numeric');

  // For "flow" mode: an ordered list of categorical columns. Each adjacent
  // pair forms a stage of the sankey.
  const [stages, setStages] = useState<string[]>(
    cats.slice(0, Math.min(3, cats.length)).map((c) => c.name),
  );
  // For "pairs" mode: source / target / value columns.
  const [source, setSource] = useState<string>(cats[0]?.name ?? '');
  const [target, setTarget] = useState<string>(cats[1]?.name ?? '');
  const [valueCol, setValueCol] = useState<string>('');
  const [palette, setPalette] = useState<string>('Earth');

  const option: EChartsOption | null = useMemo(() => {
    if (mode === 'flow') {
      if (stages.length < 2) return null;
      return buildFlowSankey(table, stages, palette);
    }
    if (!source || !target) return null;
    return buildPairsSankey(table, source, target, valueCol || null, palette);
  }, [mode, table, stages, source, target, valueCol, palette]);

  if (cats.length < 2) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sankey diagrams need at least two categorical columns. Override a
        column's datatype to "categorical" in step 3 if needed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="text-sm font-semibold">Configure sankey</span>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="label mb-1">Mode</div>
            <select
              className="select"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="flow">flow across N categorical stages (count rows)</option>
              <option value="pairs">explicit source → target rows (with optional value)</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Palette</div>
            <select
              className="select"
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
            >
              {PALETTE_NAMES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {mode === 'flow' ? (
          <div className="card-body">
            <div className="label mb-2">Stage columns (left → right, in order)</div>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const idx = stages.indexOf(c.name);
                const active = idx >= 0;
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
                      setStages((s) =>
                        active ? s.filter((n) => n !== c.name) : [...s, c.name],
                      )
                    }
                  >
                    {active ? `${idx + 1}. ${c.name}` : c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Click columns in the order you want them to appear left-to-right. The
              flow weight is the count of rows that share each combination.
            </p>
          </div>
        ) : (
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="label mb-1">Source column</div>
              <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
                {cats.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label mb-1">Target column</div>
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                {cats.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label mb-1">Value column (optional, numeric)</div>
              <select className="select" value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
                <option value="">— count rows —</option>
                {numerics.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {!option ? (
        <p className="text-sm text-ink-500">
          {mode === 'flow'
            ? 'Pick at least two stage columns above to draw the sankey.'
            : 'Pick a source and target column above.'}
        </p>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="text-sm font-semibold">Preview</span>
            <button
              className="btn"
              onClick={() => {
                const tsv = optionToTsv(option);
                downloadText(tsv, 'sankey_links.tsv');
              }}
            >
              <Download className="h-4 w-4" /> Download links (.tsv)
            </button>
          </div>
          <div className="p-3">
            <ReactECharts option={option} style={{ height: 540 }} notMerge />
          </div>
        </div>
      )}
    </div>
  );
}

/** Build a sankey from N adjacent categorical-stage columns. */
function buildFlowSankey(
  table: Table,
  stages: string[],
  palette: string,
): EChartsOption {
  const linkCounts = new Map<string, number>();
  const nodes = new Set<string>();
  for (const r of table.rows) {
    for (let s = 0; s < stages.length - 1; s++) {
      const a = (r[stages[s]] ?? '').trim();
      const b = (r[stages[s + 1]] ?? '').trim();
      if (a === '' || b === '') continue;
      const aLabel = `${stages[s]}: ${a}`;
      const bLabel = `${stages[s + 1]}: ${b}`;
      nodes.add(aLabel);
      nodes.add(bLabel);
      const key = `${aLabel}${bLabel}`;
      linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
    }
  }
  return finalizeSankey(Array.from(nodes), linkCounts, palette);
}

function buildPairsSankey(
  table: Table,
  sourceCol: string,
  targetCol: string,
  valueCol: string | null,
  palette: string,
): EChartsOption {
  const linkValues = new Map<string, number>();
  const nodes = new Set<string>();
  for (const r of table.rows) {
    const a = (r[sourceCol] ?? '').trim();
    const b = (r[targetCol] ?? '').trim();
    if (a === '' || b === '') continue;
    const aLabel = `${sourceCol}: ${a}`;
    const bLabel = `${targetCol}: ${b}`;
    nodes.add(aLabel);
    nodes.add(bLabel);
    let v = 1;
    if (valueCol) {
      const n = Number((r[valueCol] ?? '').trim());
      if (!Number.isFinite(n) || n <= 0) continue;
      v = n;
    }
    const key = `${aLabel}${bLabel}`;
    linkValues.set(key, (linkValues.get(key) ?? 0) + v);
  }
  return finalizeSankey(Array.from(nodes), linkValues, palette);
}

function finalizeSankey(
  nodes: string[],
  linkMap: Map<string, number>,
  palette: string,
): EChartsOption {
  const colors = assignColors(nodes, palette);
  return {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'sankey',
        emphasis: { focus: 'adjacency' },
        nodeWidth: 14,
        nodeGap: 10,
        nodeAlign: 'justify',
        label: { fontSize: 11 },
        data: nodes.map((n) => ({ name: n, itemStyle: { color: colors[n] } })),
        links: Array.from(linkMap.entries()).map(([k, v]) => {
          const [source, target] = k.split('');
          return { source, target, value: v };
        }),
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.4 },
      },
    ],
  };
}

function optionToTsv(option: EChartsOption): string {
  const series = (option.series as { links: { source: string; target: string; value: number }[] }[])[0];
  const lines = ['source\ttarget\tvalue'];
  for (const l of series.links) lines.push(`${l.source}\t${l.target}\t${l.value}`);
  return lines.join('\n') + '\n';
}
