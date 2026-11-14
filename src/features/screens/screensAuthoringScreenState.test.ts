import { expect, test } from 'bun:test';

import {
  deriveAuthoringScreenListState,
  getAuthoringScreenLabel,
} from './screensAuthoringScreenState.js';

test('screen-list state rejects ambiguous stable identities without reordering valid screens', () => {
  expect(
    deriveAuthoringScreenListState([
      { id: 'home', name: 'Home' },
      { id: 'home', name: 'Duplicate home' },
    ]).diagnostic,
  ).toEqual({
    code: 'duplicate-screen-id',
    message: "Multiple screens use the stable id 'home', so selection is unavailable.",
  });
  expect(deriveAuthoringScreenListState([{ id: 'home', name: 'Home' }])).toEqual({});
});

test('screen labels prefer authored titles and retain a stable fallback', () => {
  expect(getAuthoringScreenLabel({ id: 'home', name: 'Home', title: '  Welcome  ' })).toBe(
    'Welcome',
  );
  expect(getAuthoringScreenLabel({ id: 'home', name: '  ' })).toBe('home');
});
