import { parseDelimited } from './parse';
import type { Table } from '../types';

export type MicroreactExtract = {
  metadata: Table | null;
  metadataName: string | null;
  tree: string | null;
  treeName: string | null;
};

/**
 * Microreact `.microreact` files are JSON project bundles. The shape has
 * evolved between versions, so this is a tolerant best-effort extractor.
 *
 * Strategy:
 * 1. Walk every string-valued field in the JSON.
 * 2. If the string starts with `(` and ends with `;` → treat as Newick (tree).
 * 3. If the string has a comma in its first line and a newline somewhere →
 *    treat as CSV (metadata).
 * 4. If the string starts with `data:` → base64-decode the payload, then re-test.
 *
 * Returns whatever it could find; both fields may be null if the bundle uses
 * an unrecognised shape.
 */
export function parseMicroreact(text: string): MicroreactExtract {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error(`.microreact file is not valid JSON: ${(e as Error).message}`);
  }

  const out: MicroreactExtract = {
    metadata: null,
    metadataName: null,
    tree: null,
    treeName: null,
  };

  walk(obj, '', (path, value) => {
    if (typeof value !== 'string' || value.length < 2) return;
    const decoded = maybeDecodeDataUrl(value);
    const trimmed = decoded.trim();

    // Tree?
    if (out.tree === null && trimmed.startsWith('(') && trimmed.endsWith(';')) {
      out.tree = decoded;
      out.treeName = path || 'tree';
      return;
    }
    // Metadata as CSV/TSV?
    if (out.metadata === null && looksLikeDelimited(trimmed)) {
      try {
        const t = parseDelimited(decoded);
        if (t.columns.length > 0 && t.rowCount > 0) {
          out.metadata = t;
          out.metadataName = path || 'metadata';
        }
      } catch {
        // ignore — keep walking
      }
    }
  });

  return out;
}

function walk(node: unknown, path: string, visit: (path: string, value: unknown) => void): void {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    visit(path, node);
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk(node[i], `${path}[${i}]`, visit);
    }
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      walk(v, path ? `${path}.${k}` : k, visit);
    }
  }
}

function maybeDecodeDataUrl(s: string): string {
  if (!s.startsWith('data:')) return s;
  const idx = s.indexOf(',');
  if (idx === -1) return s;
  const meta = s.slice(5, idx);
  const payload = s.slice(idx + 1);
  if (/;\s*base64/i.test(meta)) {
    try {
      // base64 → string. Decode in browser with atob, in node with Buffer.
      const decoder = typeof atob === 'function'
        ? (b: string) => atob(b)
        : (b: string) => Buffer.from(b, 'base64').toString('utf8');
      return decoder(payload);
    } catch {
      return payload;
    }
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

function looksLikeDelimited(s: string): boolean {
  const newline = s.indexOf('\n');
  if (newline === -1) return false;
  const firstLine = s.slice(0, newline);
  // Need at least one delimiter on the header line + at least one further newline.
  if (!/[,;\t]/.test(firstLine)) return false;
  if (s.indexOf('\n', newline + 1) === -1 && s.length - newline < 2) return false;
  return true;
}
