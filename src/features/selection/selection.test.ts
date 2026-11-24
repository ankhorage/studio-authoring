import { expect, test } from 'bun:test';

import {
  createAuthoringSelectionContext,
  createAuthoringSelectionProviderProps,
  resolveSelectedNodeId,
  resolveSelectedParentNodeId,
  resolveSingleSelection,
} from './selection.js';

const tree = {
  id: 'screen',
  children: [{ id: 'section', children: [{ id: 'button' }] }],
};

test('selection is cleared when a node is no longer authored', () => {
  expect(resolveSelectedNodeId(tree, 'button')).toBe('button');
  expect(resolveSelectedNodeId(tree, 'removed')).toBeNull();
});

test('selection parents exclude the root and retain direct ownership', () => {
  expect(resolveSelectedParentNodeId(tree, 'screen')).toBeNull();
  expect(resolveSelectedParentNodeId(tree, 'button')).toBe('section');
  expect(resolveSingleSelection(['first', 'second'])).toBe('first');
  expect(resolveSingleSelection([])).toBeNull();
});

test('selection context clears stale identities and retains a selectable parent', () => {
  const root = {
    id: 'root',
    children: [{ id: 'child', children: [{ id: 'grandchild' }] }],
  };

  expect(createAuthoringSelectionContext({ root, selectedNodeId: 'grandchild' })).toEqual({
    selectedNodeId: 'grandchild',
    parentNodeId: 'child',
    canSelectParent: true,
  });
  expect(createAuthoringSelectionContext({ root, selectedNodeId: 'missing' })).toEqual({
    selectedNodeId: null,
    parentNodeId: null,
    canSelectParent: false,
  });
});

test('selection provider disables and clears selection in Preview', () => {
  const selected: (string | null)[] = [];
  const preview = createAuthoringSelectionProviderProps({
    mode: 'preview',
    selectedNodeId: 'node-1',
    selectNode: (id) => selected.push(id),
  });

  expect(preview).toEqual({
    mode: 'single',
    disabled: true,
    selectedIds: [],
    onSelectionChange: undefined,
  });

  const edit = createAuthoringSelectionProviderProps({
    mode: 'edit',
    selectedNodeId: 'node-1',
    selectNode: (id) => selected.push(id),
  });
  expect(edit.selectedIds).toEqual(['node-1']);
  edit.onSelectionChange?.(['node-2']);
  edit.onSelectionChange?.([]);
  expect(selected).toEqual(['node-2', null]);
});
