import { useMemo } from 'react';
import { compareIds } from '../core/newick';
import { parseTree, type TreeFormat } from '../core/tree';

type Props = {
  metaIds: string[];
  newick: string | null;
};

const FORMAT_LABEL: Record<TreeFormat, string> = {
  newick: 'Newick',
  nhx: 'NHX (extended Newick)',
  nexus: 'Nexus',
  phyloxml: 'PhyloXML',
  nexml: 'NeXML',
  dot: 'Graphviz DOT',
  unknown: 'unknown',
};

export function TreeMatchPanel({ metaIds, newick }: Props) {
  const parsed = useMemo(() => (newick ? parseTree(newick) : null), [newick]);
  const report = useMemo(() => {
    if (!parsed) return null;
    return compareIds(metaIds, parsed.tipNames);
  }, [metaIds, parsed]);

  if (!newick || !report || !parsed) {
    return (
      <p className="text-sm text-ink-500">
        Drop a Newick / Nexus / PhyloXML / NeXML / NHX / Graphviz DOT file above to
        see how your metadata IDs line up with the tree's tip names. Validation is
        optional — the annotation files are valid regardless.
      </p>
    );
  }
  if (parsed.format === 'unknown' || parsed.tipNames.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Could not extract tip names from the uploaded tree file. The format wasn't
        recognised as Newick, Nexus, PhyloXML, NeXML, or NHX, or the file is empty.
      </div>
    );
  }
  const total = report.matched.length + report.metadataOnly.length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        <span className="pill bg-ink-100 text-ink-700">
          format: {FORMAT_LABEL[parsed.format]}
        </span>
        <span>{parsed.tipNames.length} tips parsed</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Matched" value={`${report.matched.length} / ${total}`} tone="ok" />
        <Stat
          label="In metadata only"
          value={String(report.metadataOnly.length)}
          tone={report.metadataOnly.length ? 'warn' : 'ok'}
        />
        <Stat
          label="In tree only"
          value={String(report.treeOnly.length)}
          tone={report.treeOnly.length ? 'warn' : 'ok'}
        />
      </div>
      {report.fuzzyMatches.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900">
            Possible near-matches (Levenshtein ≤ 2)
          </div>
          <ul className="mt-2 space-y-1 text-amber-900">
            {report.fuzzyMatches.slice(0, 30).map((m) => (
              <li key={`${m.metaId}|${m.treeId}`}>
                <code>{m.metaId}</code> ↔ <code>{m.treeId}</code> (d={m.distance})
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-ink-600">Show full ID lists</summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          <IdList title="Metadata only" items={report.metadataOnly} />
          <IdList title="Tree only" items={report.treeOnly} />
          <IdList title="Matched" items={report.matched} />
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' }) {
  return (
    <div
      className={[
        'rounded-md border p-3',
        tone === 'ok' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
      ].join(' ')}
    >
      <div className="text-[11px] uppercase tracking-wide text-ink-500">{label}</div>
      <div className="text-lg font-semibold text-ink-800">{value}</div>
    </div>
  );
}

function IdList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="label mb-1">{title} ({items.length})</div>
      <div className="max-h-40 overflow-auto rounded-md border border-ink-200 bg-white p-2 font-mono text-[11px] text-ink-700">
        {items.length === 0 ? <span className="text-ink-400">— none —</span> : items.join('\n')}
      </div>
    </div>
  );
}
