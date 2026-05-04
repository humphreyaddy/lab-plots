import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { ColumnSpec, Table } from '../../types';
import { parseNewickTree } from '../../core/newickTree';
import { layoutTree, polarToCartesian, type LayoutKind } from './layout';
import { assignColors, PALETTE_NAMES } from '../../core/palettes';

type Props = {
  table: Table;
  idColumn: string;
  specs: ColumnSpec[];
  newick: string;
};

export function TreeTool({ table, idColumn, specs, newick }: Props) {
  const [layout, setLayout] = useState<LayoutKind>('rectangular');
  const [labelColumn, setLabelColumn] = useState<string>('');
  const [colorColumn, setColorColumn] = useState<string>('');
  const [palette, setPalette] = useState<string>('Earth');
  const [showStrip, setShowStrip] = useState<boolean>(true);

  const root = useMemo(() => {
    try {
      return parseNewickTree(newick);
    } catch {
      return null;
    }
  }, [newick]);

  const positioned = useMemo(() => {
    if (!root) return null;
    return layoutTree(root, layout, layout === 'rectangular' ? 800 : 700);
  }, [root, layout]);

  const idToRow = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    for (const r of table.rows) {
      const id = (r[idColumn] ?? '').trim();
      if (id) m.set(id, r);
    }
    return m;
  }, [table, idColumn]);

  const colorMap = useMemo(() => {
    if (!colorColumn) return {} as Record<string, string>;
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const r of table.rows) {
      const v = (r[colorColumn] ?? '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        ordered.push(v);
      }
    }
    return assignColors(ordered, palette);
  }, [table, colorColumn, palette]);

  const cats = specs.filter((s) => s.effectiveType === 'categorical' || s.effectiveType === 'binary');
  const labellable = specs.filter((s) => s.effectiveType !== 'numeric');

  if (!root || !positioned) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Could not parse the uploaded tree. Make sure you've dropped a Newick
        / Nexus / similar file into the tree slot above.
      </div>
    );
  }

  const tipLabels = (id: string): string => {
    const row = idToRow.get(id);
    if (!labelColumn || !row) return id;
    const v = (row[labelColumn] ?? '').trim();
    return v || id;
  };

  const tipColor = (id: string): string | undefined => {
    if (!colorColumn) return undefined;
    const row = idToRow.get(id);
    if (!row) return undefined;
    const v = (row[colorColumn] ?? '').trim();
    return colorMap[v];
  };

  const SIZE = 800;
  const PAD = 80;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="text-sm font-semibold">Configure tree</span>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="label mb-1">Layout</div>
            <select
              className="select"
              value={layout}
              onChange={(e) => setLayout(e.target.value as LayoutKind)}
            >
              <option value="rectangular">rectangular</option>
              <option value="radial">radial (circular)</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Tip labels</div>
            <select
              className="select"
              value={labelColumn}
              onChange={(e) => setLabelColumn(e.target.value)}
            >
              <option value="">use tip names from the tree</option>
              {labellable.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Color tips by</div>
            <select
              className="select"
              value={colorColumn}
              onChange={(e) => setColorColumn(e.target.value)}
            >
              <option value="">— none —</option>
              {cats.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
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
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300"
                checked={showStrip}
                onChange={(e) => setShowStrip(e.target.checked)}
              />
              Show color strip outside tips
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="text-sm font-semibold">Preview</span>
          <button
            className="btn"
            onClick={() => {
              const svg = document.getElementById('tree-svg');
              if (!svg) return;
              const xml = new XMLSerializer().serializeToString(svg);
              const blob = new Blob([xml], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'tree.svg';
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" /> Download (.svg)
          </button>
        </div>
        <div className="p-3 overflow-auto">
          {layout === 'rectangular' ? (
            <RectangularTree
              positioned={positioned}
              size={SIZE}
              pad={PAD}
              tipLabel={tipLabels}
              tipColor={tipColor}
              showStrip={showStrip && colorColumn !== ''}
            />
          ) : (
            <RadialTree
              positioned={positioned}
              size={SIZE}
              pad={PAD}
              tipLabel={tipLabels}
              tipColor={tipColor}
              showStrip={showStrip && colorColumn !== ''}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type RenderProps = {
  positioned: ReturnType<typeof layoutTree>;
  size: number;
  pad: number;
  tipLabel: (id: string) => string;
  tipColor: (id: string) => string | undefined;
  showStrip: boolean;
};

function RectangularTree({ positioned, size, pad, tipLabel, tipColor, showStrip }: RenderProps) {
  const W = size + 360;
  const H = size + 60;
  return (
    <svg id="tree-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <g transform={`translate(${pad}, 30)`}>
        {/* branches: right-angle elbows, parent on left */}
        {positioned.links.map((l, i) => (
          <path
            key={i}
            d={`M ${l.source.y} ${l.source.x} V ${l.target.x} H ${l.target.y}`}
            fill="none"
            stroke="#3d3f45"
            strokeWidth={1}
          />
        ))}
        {/* color strips */}
        {showStrip &&
          positioned.nodes
            .filter((n) => n.isLeaf)
            .map((n, i) => {
              const c = tipColor(n.name);
              if (!c) return null;
              return (
                <rect
                  key={`strip-${i}`}
                  x={size + 6}
                  y={n.x - 6}
                  width={14}
                  height={12}
                  fill={c}
                />
              );
            })}
        {/* tip labels */}
        {positioned.nodes
          .filter((n) => n.isLeaf)
          .map((n, i) => (
            <text
              key={`label-${i}`}
              x={size + (showStrip ? 26 : 6)}
              y={n.x + 3}
              fontSize={11}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#16171a"
            >
              {tipLabel(n.name)}
            </text>
          ))}
      </g>
    </svg>
  );
}

function RadialTree({ positioned, size, pad, tipLabel, tipColor, showStrip }: RenderProps) {
  const cx = size / 2 + pad;
  const cy = size / 2 + pad;
  const W = size + 2 * pad;
  const H = size + 2 * pad;
  return (
    <svg id="tree-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <g transform={`translate(${cx}, ${cy})`}>
        {positioned.links.map((l, i) => {
          // Two-segment radial elbow: an arc at parent radius, then a radial spoke.
          const [sx, sy] = polarToCartesian(l.source.x, l.source.y);
          const [tx, ty] = polarToCartesian(l.target.x, l.target.y);
          const [mx, my] = polarToCartesian(l.target.x, l.source.y);
          const sweep = l.target.x > l.source.x ? 1 : 0;
          const r = l.source.y;
          return (
            <path
              key={i}
              d={`M ${sx} ${sy} A ${r} ${r} 0 0 ${sweep} ${mx} ${my} L ${tx} ${ty}`}
              fill="none"
              stroke="#3d3f45"
              strokeWidth={1}
            />
          );
        })}
        {showStrip &&
          positioned.nodes
            .filter((n) => n.isLeaf)
            .map((n, i) => {
              const c = tipColor(n.name);
              if (!c) return null;
              const [x1, y1] = polarToCartesian(n.x, n.y + 6);
              const [x2, y2] = polarToCartesian(n.x, n.y + 18);
              return (
                <line
                  key={`strip-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={c}
                  strokeWidth={10}
                />
              );
            })}
        {positioned.nodes
          .filter((n) => n.isLeaf)
          .map((n, i) => {
            const angle = n.x;
            const flip = angle > Math.PI / 2 && angle < (3 * Math.PI) / 2;
            const r = n.y + (showStrip ? 28 : 10);
            const [x, y] = polarToCartesian(angle, r);
            const rotate = (angle * 180) / Math.PI - 90 + (flip ? 180 : 0);
            const anchor = flip ? 'end' : 'start';
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={y}
                fontSize={11}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill="#16171a"
                textAnchor={anchor}
                dominantBaseline="middle"
                transform={`rotate(${rotate}, ${x}, ${y})`}
              >
                {tipLabel(n.name)}
              </text>
            );
          })}
      </g>
    </svg>
  );
}
