import { expect, test } from 'bun:test';

import { resolveAuthoringContextActions } from './authoringContextActions.js';

test('preserves inspector targets and structural action order for an Edit selection', () => {
  expect(
    resolveAuthoringContextActions({
      mode: 'edit',
      selectedNodeId: 'child',
      parentNodeId: 'root',
      canInsert: true,
      canInsertInside: true,
      canDelete: true,
    }),
  ).toEqual([
    { id: 'properties', label: 'Properties' },
    { id: 'bindings', label: 'Bindings' },
    { id: 'insert', label: 'Add child' },
    { id: 'delete', label: 'Delete' },
    { id: 'selectParent', label: 'Select parent' },
    { id: 'clearSelection', label: 'Clear selection' },
  ]);
});

test('suppresses all authoring actions in Preview or without a selected node', () => {
  const args = {
    selectedNodeId: 'child',
    parentNodeId: 'root',
    canInsert: true,
    canInsertInside: true,
    canDelete: true,
  } as const;

  expect(resolveAuthoringContextActions({ ...args, mode: 'preview' })).toEqual([]);
  expect(resolveAuthoringContextActions({ ...args, mode: 'edit', selectedNodeId: null })).toEqual(
    [],
  );
  expect(resolveAuthoringContextActions({ ...args, mode: 'edit', selectedNodeId: '' })).toEqual([]);
});

test('does not expose parent selection for an empty parent identity', () => {
  expect(
    resolveAuthoringContextActions({
      mode: 'edit',
      selectedNodeId: 'child',
      parentNodeId: '',
      canInsert: false,
      canInsertInside: false,
      canDelete: false,
    }).map((action) => action.id),
  ).toEqual(['properties', 'bindings', 'clearSelection']);
});

test('preserves availability-dependent labels and omissions', () => {
  expect(
    resolveAuthoringContextActions({
      mode: 'edit',
      selectedNodeId: 'leaf',
      parentNodeId: null,
      canInsert: true,
      canInsertInside: false,
      canDelete: false,
    }),
  ).toEqual([
    { id: 'properties', label: 'Properties' },
    { id: 'bindings', label: 'Bindings' },
    { id: 'insert', label: 'Insert' },
    { id: 'clearSelection', label: 'Clear selection' },
  ]);
});
