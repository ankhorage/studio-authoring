import { expect, test } from 'bun:test';

import { createAuthoringModeAction } from './authoringState.js';

test('edit and preview preserve their inverse toolbar actions', () => {
  expect(createAuthoringModeAction('edit')).toEqual({
    label: 'Preview',
    mode: 'preview',
    selectionEnabled: true,
  });
  expect(createAuthoringModeAction('preview')).toEqual({
    label: 'Edit',
    mode: 'edit',
    selectionEnabled: false,
  });
});
