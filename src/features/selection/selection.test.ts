import { expect, test } from 'bun:test';

import {
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
