import { expect, test } from 'bun:test';

import { createRuntimeOverlayState } from './runtimeOverlay.js';

test('edit suppresses runtime actions and preview restores them', () => {
  expect(createRuntimeOverlayState('edit')).toEqual({
    selectionEnabled: true,
    suppressRuntimeActions: true,
    showSelectionOverlay: true,
  });
  expect(createRuntimeOverlayState('preview')).toEqual({
    selectionEnabled: false,
    suppressRuntimeActions: false,
    showSelectionOverlay: false,
  });
});
