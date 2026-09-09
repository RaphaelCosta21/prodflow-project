import { ISubItem } from "../models";

export interface ISubItemNode extends ISubItem {
  children: ISubItemNode[];
}

// Derives the tree from the flat level/parentId list (source of truth) for indented render.
// Siblings are ordered by find number (F/N), falling back to their original BOM order so the
// hierarchical numbering reads 1, 1.1, 1.2, 1.3… instead of the raw import order.
export function buildSubItemTree(items: ISubItem[]): ISubItemNode[] {
  const byId = new Map<string, ISubItemNode>();
  const order = new Map<string, number>();
  const roots: ISubItemNode[] = [];
  items.forEach((item, i) => {
    byId.set(item.id, { ...item, children: [] });
    order.set(item.id, i);
  });
  for (const item of items) {
    const node = byId.get(item.id) as ISubItemNode;
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const fnValue = (n: ISubItemNode): number => {
    const v = parseFloat(String(n.findNumber ?? ""));
    return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
  };
  const sortSiblings = (nodes: ISubItemNode[]): void => {
    nodes.sort((a, b) => {
      const diff = fnValue(a) - fnValue(b);
      if (diff !== 0) return diff;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
    for (const n of nodes) sortSiblings(n.children);
  };
  sortSiblings(roots);

  return roots;
}
