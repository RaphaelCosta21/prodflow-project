import { ISubItem } from "../models";

export interface ISubItemNode extends ISubItem {
  children: ISubItemNode[];
}

// Derives the tree from the flat level/parentId list (source of truth) for indented render.
export function buildSubItemTree(items: ISubItem[]): ISubItemNode[] {
  const byId = new Map<string, ISubItemNode>();
  const roots: ISubItemNode[] = [];
  for (const item of items) {
    byId.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = byId.get(item.id) as ISubItemNode;
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
