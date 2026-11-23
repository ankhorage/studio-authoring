import { expect, test } from 'bun:test';

import { createAuthoringModeAction, resolveAuthoringModeControl } from './authoringState.js';

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

test('preserves the reversible Edit and Preview control presentation', () => {
  expect(resolveAuthoringModeControl('edit')).toEqual({
    label: 'Preview',
    icon: { name: 'eye-outline' },
    color: 'neutral',
    variant: 'ghost',
  });
  expect(resolveAuthoringModeControl('preview')).toEqual({
    label: 'Edit',
    icon: { name: 'create-outline' },
    color: 'primary',
    variant: 'solid',
  });
});
