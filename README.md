# Lab Plots

A free, browser-only visualisation studio. Drop a metadata sheet, pick a
plot type, get a live render plus a downloadable file.

**v1 plot types:**
- **Phylogenetic tree** — drop a tree (Newick / Nexus / PhyloXML / NeXML / NHX)
  alongside a metadata sheet, render rectangular or radial layouts, color tips
  by any categorical column, customise tip labels, export as SVG.
- **Heatmap** — pick numeric columns, choose a colour scale (viridis / plasma /
  RdBu / RdYlBu / BrBG / Earth), normalise per column (z-score / min-max /
  log10), optionally cluster rows.
- **Sankey diagram** — flow across N categorical stages (counts rows per
  combination) or explicit source / target / value triples.

## Why

- **Zero install.** Open `index.html`, no Python, no R, no terminal.
- **Zero cost.** No paid services. No accounts.
- **Your data never leaves your computer.** Parsing and rendering happen
  entirely in the browser tab. The page makes no network requests after
  it loads. Strict CSP in `index.html` enforces this.
- **Metadata-agnostic.** Drop microbiome, clinical, ecological — anything with
  an ID column. Nothing about your domain is hardcoded.
- **Column-first.** Auto-detects the ID column, profiles every other column's
  datatype, lets you override per column, then routes you into a tool
  configured to that data shape.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static output in dist/
npm run preview      # serve the built bundle
npm run typecheck
npm test             # vitest, 75 unit tests
```

The built `dist/` folder is a fully-static SPA. Host it on GitHub Pages,
copy it onto a USB stick, or commit it into a private repo and serve it
from anywhere. It runs from `file://` too.

## Sample data

Three demo files under `public/examples/`, all synthetic and domain-neutral
(no real data, no taxa, no diagnoses):

| File | What it exercises |
|---|---|
| `lab_demo_metadata.csv` (25 rows × 16 cols: `id` + 4 categorical + 11 numeric) | All three tools. Use the matching tree for the tree tool, pick numeric `metric_*` and `abundance_*` columns for the heatmap, flow `group → region → treatment → cohort` for the sankey. |
| `lab_demo_tree.nwk` (25 tips, structured by `group`) | Tree tool. Tips line up 1:1 with the IDs in `lab_demo_metadata.csv`. Color tips by `group` to see the structure recovered visually. |
| `sankey_pairs_demo.csv` (15 rows: source / target / value triples) | Sankey "pairs" mode — `source_stage` → `target_stage`, weighted by `flow_value`. |
| `sample_metadata.csv` + `sample_tree.nwk` (10 rows / 10 tips) | Quick smoke test if you want a smaller fixture. |

**Quick walkthrough:** open the live site, click any tile, drop the
matching demo file. The app auto-detects the ID column, profiles the rest,
and routes you into the tool. For trees, drop `lab_demo_metadata.csv` AND
`lab_demo_tree.nwk` — the metadata is what colors the tips.

## Architecture

```
src/
├── App.tsx, main.tsx
├── components/   shared UI: file dropzone, column profile, eyedropper
├── core/         data layer (CSV/TSV/XLSX/JSON/GeoJSON parsing,
│                 datatype inference, ID-column detection, palettes,
│                 Newick/Nexus/PhyloXML tree parsers, blob downloads)
├── tools/
│   ├── tree/     Newick→D3 layout + SVG renderer (rectangular / radial)
│   ├── heatmap/  ECharts heatmap with normalisation + clustering
│   └── sankey/   ECharts sankey, two modes
├── store/        Zustand app state
└── types.ts      domain types
tests/            Vitest unit tests
.github/workflows/pages.yml   CI: typecheck → test → build → deploy
```

Adding a new plot type = drop a folder under `src/tools/`, add a tile to
the landing page in `App.tsx`. Same browser-only / no-server / static
hosting recipe.

## License

MIT.
