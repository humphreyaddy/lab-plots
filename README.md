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

`public/examples/sample_metadata.csv` and `public/examples/sample_tree.nwk`
are included. They're synthetic and small; adequate to verify any of the
three tools end-to-end.

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
