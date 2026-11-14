/*** Describe one selectable authoring node independent of a renderer implementation. */
export interface AuthoringTreeNode {
  readonly id: string;
  readonly children?: readonly AuthoringTreeNode[];
}

/*** Return the selected node only while it remains in the authored tree. */
export function resolveSelectedNodeId(
  root: AuthoringTreeNode | null,
  selectedNodeId: string | null,
): string | null {
  return selectedNodeId && findNode(root, selectedNodeId)
    ? selectedNodeId
    : null;
}

/*** Return a selected node's parent identifier, with the root deliberately parentless. */
export function resolveSelectedParentNodeId(
  root: AuthoringTreeNode | null,
  selectedNodeId: string | null,
): string | null {
  if (!root || !selectedNodeId || root.id === selectedNodeId) return null;
  return findParentId(root, selectedNodeId);
}

/*** Normalize a selection-provider change to one nullable selection value. */
export function resolveSingleSelection(ids: readonly string[]): string | null {
  return ids[0] ?? null;
}

/*** Find a node by id without coupling authoring state to a rendered component tree. */
function findNode(
  root: AuthoringTreeNode | null,
  id: string,
): AuthoringTreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  return (
    root.children?.map((child) => findNode(child, id)).find(Boolean) ?? null
  );
}

/*** Find a node's parent id in an immutable authoring tree. */
function findParentId(root: AuthoringTreeNode, id: string): string | null {
  if (root.children?.some((child) => child.id === id)) return root.id;
  return (
    root.children?.map((child) => findParentId(child, id)).find(Boolean) ?? null
  );
}
