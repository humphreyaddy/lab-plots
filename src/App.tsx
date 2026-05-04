import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  GitFork,
  Grid3x3,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { parseFile } from './core/parse';
import { reportIdColumn } from './core/idColumn';
import { TREE_EXTENSIONS } from './core/tree';
import { useAppStore } from './store/useAppStore';
import { FileDropzone } from './components/FileDropzone';
import { ColumnProfile } from './components/ColumnProfile';
import { HeatmapTool } from './tools/heatmap/HeatmapTool';
import { SankeyTool } from './tools/sankey/SankeyTool';
import { TreeTool } from './tools/tree/TreeTool';
import type { PlotKind } from './types';

const PLOTS: { kind: PlotKind; title: string; blurb: string; icon: React.ReactNode }[] = [
  {
    kind: 'tree',
    title: 'Phylogenetic tree',
    blurb:
      'Drop a Newick / Nexus / PhyloXML / NeXML / NHX tree, optionally pair it with metadata, and render rectangular or radial layouts with tip-coloring strips.',
    icon: <GitFork className="h-5 w-5" />,
  },
  {
    kind: 'heatmap',
    title: 'Heatmap',
    blurb:
      'Select numeric columns from a metadata sheet and render a heatmap with adjustable colour scale, normalisation (z-score / min-max / log10), and row clustering.',
    icon: <Grid3x3 className="h-5 w-5" />,
  },
  {
    kind: 'sankey',
    title: 'Sankey diagram',
    blurb:
      'Trace flows across two or more categorical columns. Either count rows per combination, or supply explicit source / target / value columns.',
    icon: <Workflow className="h-5 w-5" />,
  },
];

export default function App() {
  const store = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const handleMetadata = async (file: File) => {
    setError(null);
    try {
      const result = await parseFile(file);
      if (result.tables.length > 0 && result.tables[0].columns.length > 0) {
        store.setTables(result.tables, file.name);
      } else if (!result.bundledTree) {
        setError('No columns detected. Is the file empty or unsupported?');
        return;
      }
      if (result.bundledTree) {
        store.setTree(result.bundledTree.text, `${file.name} → ${result.bundledTree.name}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleTree = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      store.setTree(text, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const idReport = useMemo(
    () => (store.table && store.idColumn ? reportIdColumn(store.table, store.idColumn) : null),
    [store.table, store.idColumn],
  );

  if (store.plot === null) return <Landing onPick={(k) => store.setPlot(k)} />;
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Header
        title={PLOTS.find((p) => p.kind === store.plot)?.title ?? ''}
        onBack={() => store.setPlot(null)}
      />
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Section title="1. Data sheet">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FileDropzone
            onFile={handleMetadata}
            accept=".csv,.tsv,.tab,.txt,.dat,.xlsx,.xls,.ods,.json,.geojson"
            hint="CSV / TSV / TAB / TXT / DAT / XLSX / XLS / ODS / JSON / GeoJSON. Parsed entirely in this browser tab."
            fileName={store.fileName}
          />
          {store.plot === 'tree' && (
            <FileDropzone
              onFile={handleTree}
              accept={TREE_EXTENSIONS.join(',')}
              hint="Newick / Nexus / PhyloXML / NeXML / NHX tree."
              fileName={store.treeFileName}
            />
          )}
        </div>
        {store.sheets.length > 1 && (
          <div className="mt-3">
            <div className="label mb-1">Sheet</div>
            <select
              className="select max-w-xs"
              value={store.activeSheet}
              onChange={(e) => store.setActiveSheet(Number(e.target.value))}
            >
              {store.sheets.map((s, i) => (
                <option key={s.sheetName ?? i} value={i}>
                  {s.sheetName ?? `sheet ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </Section>

      {store.table && (
        <Section title="2. Pick the ID column">
          <p className="mb-2 text-sm text-ink-600">
            The column whose values match the row identifier you want everywhere
            else (tree tip names for trees, row labels for heatmap rows). The
            app pre-selects a likely candidate — change it if it guessed wrong.
          </p>
          <select
            className="select max-w-md"
            value={store.idColumn ?? ''}
            onChange={(e) => store.setIdColumn(e.target.value || null)}
          >
            <option value="">— select ID column —</option>
            {(store.table.columns ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {idReport && (
            <p className="mt-2 text-xs text-ink-500">
              {idReport.uniqueCount} unique IDs · {idReport.duplicates.length}{' '}
              duplicate(s) · {idReport.empties} empty
            </p>
          )}
        </Section>
      )}

      {store.table && store.idColumn && (
        <Section title="3. Variables & datatypes">
          <ColumnProfile
            specs={store.columnSpecs}
            selected={new Set()}
            onToggle={() => {}}
            onOverride={(c, t) => store.overrideType(c, t)}
          />
        </Section>
      )}

      {store.table && store.idColumn && store.plot === 'heatmap' && (
        <Section title="4. Heatmap">
          <HeatmapTool table={store.table} idColumn={store.idColumn} specs={store.columnSpecs} />
        </Section>
      )}

      {store.table && store.idColumn && store.plot === 'sankey' && (
        <Section title="4. Sankey">
          <SankeyTool table={store.table} specs={store.columnSpecs} />
        </Section>
      )}

      {store.table && store.idColumn && store.plot === 'tree' && store.treeText && (
        <Section title="4. Phylogenetic tree">
          <TreeTool
            table={store.table}
            idColumn={store.idColumn}
            specs={store.columnSpecs}
            newick={store.treeText}
          />
        </Section>
      )}

      {store.plot === 'tree' && store.table && store.idColumn && !store.treeText && (
        <p className="text-sm text-ink-500">
          Drop a Newick / Nexus / similar tree file in the right-hand box above to see the rendering.
        </p>
      )}

      <Footer />
    </div>
  );
}

function Landing({ onPick }: { onPick: (k: PlotKind) => void }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Lab Plots</h1>
        <p className="text-lg text-ink-500">
          Phylogenetic trees · heatmaps · sankey diagrams. From a metadata sheet, in your browser, in three clicks.
        </p>
        <div className="inline-flex items-center gap-2">
          <span className="pill bg-emerald-100 text-emerald-800">
            <ShieldCheck className="mr-1 h-3 w-3" /> runs entirely in your browser
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLOTS.map((p) => (
          <button
            key={p.kind}
            type="button"
            className="card p-6 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ink-400"
            onClick={() => onPick(p.kind)}
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink-100 text-ink-700">
              {p.icon}
            </div>
            <div className="text-lg font-semibold text-ink-800">{p.title}</div>
            <p className="mt-2 text-sm text-ink-500">{p.blurb}</p>
          </button>
        ))}
      </div>

      <Footer />
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-ink-500">Lab Plots</p>
        </div>
      </div>
      <span className="pill bg-emerald-100 text-emerald-800">
        <ShieldCheck className="mr-1 h-3 w-3" /> runs in your browser
      </span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="pt-4 text-center text-xs text-ink-500">
      <p>No data leaves your machine. The page never makes a network request after it loads.</p>
    </footer>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
        {right}
      </div>
      <div>{children}</div>
    </section>
  );
}
