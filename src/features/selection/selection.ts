import { arrayToSingleSelection } from '@ankhorage/utility/selection';
import { findTreeNodeWithParent, type TreeAdapter, treeContainsId } from '@ankhorage/utility/tree';

/*** Describe one selectable authoring node independent of a renderer implementation. */
export interface AuthoringTreeNode {
  readonly id: string;
  readonly children?: readonly AuthoringTreeNode[];
}

/*** Describe the single-selection contract expected by an owning UI adapter. */
export interface AuthoringSelectionProviderProps {
  readonly mode: 'single';
  readonly disabled: boolean;
  readonly selectedIds: readonly string[];
  readonly onSelectionChange?: (ids: readonly string[]) => void;
}

/*** Describe the portable selection state used by inspector and toolbar models. */
export interface AuthoringSelectionContext {
  readonly selectedNodeId: string | null;
  readonly parentNodeId: string | null;
  readonly canSelectParent: boolean;
}

const authoringTreeAdapter: TreeAdapter<AuthoringTreeNode> = {
  getId: (node) => node.id,
  getChildren: (node) => node.children,
  withChildren: (node, children) => ({ ...node, children: [...children] }),
};
const EMPTY_SELECTION: readonly string[] = [];

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

/*** Build selection state while clearing identities that no longer belong to the active tree. */
export function createAuthoringSelectionContext(args: {
  readonly root: AuthoringTreeNode | null;
  readonly selectedNodeId: string | null;
}): AuthoringSelectionContext {
  const selectedNodeId = resolveSelectedNodeId(args.root, args.selectedNodeId);
  const parentNodeId = resolveSelectedParentNodeId(args.root, selectedNodeId);

  return {
    selectedNodeId,
    parentNodeId,
    canSelectParent: parentNodeId !== null,
  };
}

/*** Adapt nullable authoring selection to a controlled single-selection UI port. */
export function createAuthoringSelectionProviderProps(args: {
  readonly mode: 'edit' | 'preview';
  readonly selectedNodeId: string | null;
  readonly selectNode: (id: string | null) => void;
}): AuthoringSelectionProviderProps {
  const disabled = args.mode === 'preview';

  return {
    mode: 'single',
    disabled,
    selectedIds: disabled
      ? EMPTY_SELECTION
      : args.selectedNodeId === null
        ? EMPTY_SELECTION
        : [args.selectedNodeId],
    onSelectionChange: disabled
      ? undefined
      : (ids) => {
          args.selectNode(resolveSingleSelection(ids));
        },
  };
}
