import { arrayToSingleSelection } from '@ankhorage/utility/selection';
import { findTreeNodeWithParent, type TreeAdapter, treeContainsId } from '@ankhorage/utility/tree';

/*** Describe one selectable authoring node independent of a renderer implementation. */
export interface AuthoringTreeNode {
  readonly id: string;
  readonly children?: readonly AuthoringTreeNode[];
}

const authoringTreeAdapter: TreeAdapter<AuthoringTreeNode> = {
  getId: (node) => node.id,
  getChildren: (node) => node.children,
  withChildren: (node, children) => ({ ...node, children: [...children] }),
};

/*** Return the selected node only while it remains in the authored tree. */
export function resolveSelectedNodeId(
  root: AuthoringTreeNode | null,
  selectedNodeId: string | null,
): string | null {
  return selectedNodeId && root && treeContainsId(root, selectedNodeId, authoringTreeAdapter)
    ? selectedNodeId
    : null;
}

/*** Return a selected node's parent identifier, with the root deliberately parentless. */
export function resolveSelectedParentNodeId(
  root: AuthoringTreeNode | null,
  selectedNodeId: string | null,
): string | null {
  if (!root || !selectedNodeId || root.id === selectedNodeId) return null;
  return findTreeNodeWithParent(root, selectedNodeId, authoringTreeAdapter)?.parent?.id ?? null;
}

/*** Normalize a selection-provider change to one nullable selection value. */
export function resolveSingleSelection(ids: readonly string[]): string | null {
  return arrayToSingleSelection(ids);
}
