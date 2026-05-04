import { describe, expect, it } from 'vitest';
import { parseGeojson } from '../src/core/geojson';

describe('parseGeojson', () => {
  it('flattens FeatureCollection properties + lat/lon', () => {
    const gj = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-122.4, 37.8] },
          properties: { id: 'A', country: 'US' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.35, 48.85] },
          properties: { id: 'B', country: 'FR' },
        },
      ],
    };
    const t = parseGeojson(JSON.stringify(gj));
    expect(t.columns).toContain('id');
    expect(t.columns).toContain('country');
    expect(t.columns).toContain('_lon');
    expect(t.columns).toContain('_lat');
    expect(t.columns).toContain('_geom_type');
    expect(t.rows[0].id).toBe('A');
    expect(t.rows[0]._lon).toBe('-122.4');
    expect(t.rows[0]._lat).toBe('37.8');
    expect(t.rows[1].country).toBe('FR');
  });

  it('accepts a single Feature', () => {
    const f = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { id: 'X' },
    };
    const t = parseGeojson(JSON.stringify(f));
    expect(t.rowCount).toBe(1);
    expect(t.rows[0].id).toBe('X');
  });

  it('hoists feature.id to a row id when properties.id is absent', () => {
    const f = {
      type: 'Feature',
      id: 'Z',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { country: 'CA' },
    };
    const t = parseGeojson(JSON.stringify(f));
    expect(t.rows[0].id).toBe('Z');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseGeojson('not json')).toThrow();
  });

  it('throws on non-Feature/FeatureCollection', () => {
    expect(() => parseGeojson('{"type":"Polygon"}')).toThrow();
  });

  it('handles empty feature collections', () => {
    const t = parseGeojson('{"type":"FeatureCollection","features":[]}');
    expect(t.rowCount).toBe(0);
  });
});
