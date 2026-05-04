import chroma from 'chroma-js';

export const PALETTES: Record<string, string[]> = {
  Set1: ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999'],
  Set2: ['#66c2a5','#fc8d62','#8da0cb','#e78ac3','#a6d854','#ffd92f','#e5c494','#b3b3b3'],
  Set3: ['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f'],
  Tableau10: ['#4e79a7','#f28e2c','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac'],
  Paired: ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'],
  Dark2: ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d','#666666'],
  Accent: ['#7fc97f','#beaed4','#fdc086','#ffff99','#386cb0','#f0027f','#bf5b17','#666666'],
  Earth: [
    '#2b4e14', // deep forest green
    '#50a10f', // vibrant green
    '#a3c34a', // olive
    '#ccf89e', // lime
    '#d4a017', // gold / ochre
    '#b8651d', // copper / terracotta
    '#8b5a2b', // earth brown
    '#79808a', // slate gray
    '#1f2937', // near-black
    '#fcf5d9', // cream
  ],
};

export const PALETTE_NAMES = Object.keys(PALETTES);

export const HEATMAP_SCALES: Record<string, [string, string, string]> = {
  viridis: ['#440154', '#21918c', '#fde725'],
  plasma:  ['#0d0887', '#cc4778', '#f0f921'],
  magma:   ['#000004', '#b73779', '#fcfdbf'],
  cividis: ['#00224e', '#7c7b78', '#fee838'],
  RdBu:    ['#053061', '#f7f7f7', '#67001f'],
  RdYlBu:  ['#a50026', '#ffffbf', '#313695'],
  BrBG:    ['#543005', '#f5f5f5', '#003c30'],
  PiYG:    ['#8e0152', '#f7f7f7', '#276419'],
  PuOr:    ['#7f3b08', '#f7f7f7', '#2d004b'],
  // sequential cream → olive → deep green
  Verdant: ['#fcf5d9', '#a3c34a', '#2b4e14'],
};

export const HEATMAP_SCALE_NAMES = Object.keys(HEATMAP_SCALES);

export function assignColors(values: string[], paletteName: string): Record<string, string> {
  const palette = PALETTES[paletteName] ?? PALETTES.Set1;
  const out: Record<string, string> = {};
  for (let i = 0; i < values.length; i++) {
    out[values[i]] = palette[i % palette.length];
  }
  return out;
}

/** Map a numeric value in [min, max] to a hex color from a 2- or 3-stop scale. */
export function numericToColor(
  v: number,
  min: number,
  max: number,
  scale: [string, string, string],
  useMid = true,
): string {
  if (!Number.isFinite(v)) return '#cccccc';
  if (max === min) return scale[1];
  const stops = useMid ? scale : [scale[0], scale[2]];
  const t = (v - min) / (max - min);
  return chroma.scale(stops).mode('lab')(t).hex();
}

/** Normalize numeric vector for heatmap display options. */
export function normalize(
  values: number[],
  mode: 'none' | 'zscore' | 'log10' | 'minmax',
): number[] {
  if (mode === 'none') return values;
  if (mode === 'log10') {
    return values.map((v) => (v > 0 ? Math.log10(v) : NaN));
  }
  if (mode === 'minmax') {
    const min = Math.min(...values.filter(Number.isFinite));
    const max = Math.max(...values.filter(Number.isFinite));
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) {
      return values.map(() => 0);
    }
    return values.map((v) => (v - min) / (max - min));
  }
  // zscore
  const finite = values.filter(Number.isFinite);
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const sd = Math.sqrt(
    finite.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, finite.length - 1),
  );
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / sd);
}
