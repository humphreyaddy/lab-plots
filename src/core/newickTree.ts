/**
 * Parse a Newick string into a nested tree structure suitable for layout.
 * The existing core/newick.ts only pulled tip names for ID validation;
 * this richer parser preserves topology + branch lengths + internal-node
 * names for actual rendering.
 */
export type TreeNode = {
  name: string;
  branchLength: number;
  children: TreeNode[];
};

export function parseNewickTree(text: string): TreeNode {
  const cleaned = text.replace(/\[[^\]]*\]/g, '').replace(/[\s;]+$/, '').trim();
  let i = 0;
  const root = readNode();
  return root;

  function readNode(): TreeNode {
    let children: TreeNode[] = [];
    if (cleaned[i] === '(') {
      i++;
      children.push(readNode());
      while (cleaned[i] === ',') {
        i++;
        children.push(readNode());
      }
      if (cleaned[i] === ')') i++;
    }
    let name = '';
    while (i < cleaned.length && !':,()'.includes(cleaned[i])) {
      name += cleaned[i++];
    }
    name = stripQuotes(name.trim());
    let branchLength = 0;
    if (cleaned[i] === ':') {
      i++;
      let bl = '';
      while (i < cleaned.length && !',()'.includes(cleaned[i])) bl += cleaned[i++];
      const n = Number(bl);
      branchLength = Number.isFinite(n) ? n : 0;
    }
    return { name, branchLength, children };
  }
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const a = s[0], b = s[s.length - 1];
    if ((a === "'" && b === "'") || (a === '"' && b === '"')) return s.slice(1, -1);
  }
  return s;
}

/** Walk a tree and collect leaves in left-to-right order. */
export function leaves(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  function rec(n: TreeNode) {
    if (n.children.length === 0) out.push(n);
    else for (const c of n.children) rec(c);
  }
  rec(root);
  return out;
}

/** Total leaves under a node. */
export function leafCount(n: TreeNode): number {
  if (n.children.length === 0) return 1;
  let sum = 0;
  for (const c of n.children) sum += leafCount(c);
  return sum;
}
