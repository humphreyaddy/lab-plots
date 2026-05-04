import type { Table } from '../types';

/**
 * GeoJSON → tabular metadata. Each `Feature.properties` becomes a row.
 * `geometry.type` and (for points) longitude/latitude are exposed as
 * extra columns: `_geom_type`, `_lon`, `_lat`.
 *
 * Supports `Feature` and `FeatureCollection` per RFC 7946.
 */
export function parseGeojson(text: string): Table {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error(`GeoJSON file is not valid JSON: ${(e as Error).message}`);
  }
  const features = extractFeatures(obj);
  if (features.length === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  const flatRows = features.map(flattenFeature);
  return tableFromObjects(flatRows);
}

function extractFeatures(obj: unknown): Record<string, unknown>[] {
  if (!obj || typeof obj !== 'object') {
    throw new Error('GeoJSON must be a Feature or FeatureCollection.');
  }
  const o = obj as Record<string, unknown>;
  if (o.type === 'FeatureCollection' && Array.isArray(o.features)) {
    return o.features.filter((f) => f && typeof f === 'object') as Record<string, unknown>[];
  }
  if (o.type === 'Feature') {
    return [o];
  }
  throw new Error(
    'GeoJSON metadata must be a Feature or FeatureCollection (got type=' +
      String(o.type ?? 'undefined') +
      ').',
  );
}

function flattenFeature(f: Record<string, unknown>): Record<string, unknown> {
  const props = (f.properties && typeof f.properties === 'object'
    ? (f.properties as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...props };
  const geom = f.geometry as Record<string, unknown> | undefined;
  if (geom && typeof geom === 'object') {
    out._geom_type = geom.type;
    if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      const [lon, lat] = geom.coordinates as number[];
      out._lon = lon;
      out._lat = lat;
    }
  }
  if (typeof f.id !== 'undefined' && out.id === undefined) {
    out.id = f.id;
  }
  return out;
}

function tableFromObjects(arr: Record<string, unknown>[]): Table {
  if (arr.length === 0) return { columns: [], rows: [], rowCount: 0 };
  const order: string[] = [];
  const seen = new Set<string>();
  for (const r of arr) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
  }
  const rows = arr.map((r) => {
    const out: Record<string, string> = {};
    for (const k of order) {
      const v = r[k];
      out[k] = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return out;
  });
  return { columns: order, rows, rowCount: rows.length };
}
