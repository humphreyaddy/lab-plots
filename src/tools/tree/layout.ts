import { hierarchy, cluster, type HierarchyPointNode } from 'd3-hierarchy';
import type { TreeNode } from '../../core/newickTree';

export type LayoutKind = 'rectangular' | 'radial';

export type PositionedNode = {
  name: string;
  isLeaf: boolean;
  /** Cartesian x for rectangular; angle in radians (0 = up) for radial. */
  x: number;
  /** Cartesian y for rectangular; radial distance for radial. */
  y: number;
  parent?: PositionedNode;
};

export type LayoutResult = {
  nodes: PositionedNode[];
  links: { source: PositionedNode; target: PositionedNode }[];
  width: number;
  height: number;
  kind: LayoutKind;
};

export function layoutTree(
  root: TreeNode,
  kind: LayoutKind,
  size: number,
): LayoutResult {
  // d3-hierarchy expects {name, children}; our TreeNode is compatible.
  const h = hierarchy<TreeNode>(root, (d) => (d.children.length ? d.children : null));
  const layout = cluster<TreeNode>().size(
    kind === 'rectangular' ? [size, size] : [2 * Math.PI, size / 2],
  );
  const laidOut = layout(h);

  // Convert to flat nodes/links.
  const nodes: PositionedNode[] = [];
  const map = new Map<HierarchyPointNode<TreeNode>, PositionedNode>();
  laidOut.each((n) => {
    const isLeaf = !n.children;
    const pos: PositionedNode = {
      name: n.data.name || (isLeaf ? '' : ''),
      isLeaf,
      x: kind === 'rectangular' ? n.x : n.x,
      y: kind === 'rectangular' ? n.y : n.y,
    };
    map.set(n, pos);
    nodes.push(pos);
  });
  laidOut.each((n) => {
    if (n.parent) {
      const pos = map.get(n)!;
      pos.parent = map.get(n.parent);
    }
  });

  const links: { source: PositionedNode; target: PositionedNode }[] = [];
  for (const n of nodes) {
    if (n.parent) links.push({ source: n.parent, target: n });
  }

  return { nodes, links, kind, width: size, height: size };
}

/** Convert a radial layout's (angle, radius) to (x, y) for rendering. */
export function polarToCartesian(angle: number, radius: number): [number, number] {
  return [Math.cos(angle - Math.PI / 2) * radius, Math.sin(angle - Math.PI / 2) * radius];
}
