import { expect, test } from 'bun:test';

import { updateScreenMetadata, updateScreenRequirements } from './screenAuthoring.js';

const manifest = {
  screens: {
    home: {
      id: 'home',
      name: 'Home',
      title: 'Old title',
      description: 'Old description',
      root: { id: 'root', type: 'Screen' },
    },
  },
};

test('screen metadata changes preserve the authored screen payload', () => {
  const result = updateScreenMetadata(manifest, 'home', {
    id: 'home',
    name: 'Welcome',
    title: 'New title',
  });
  expect(result.ok).toBe(true);
  expect(result.manifest.screens.home).toMatchObject({
    id: 'home',
    name: 'Welcome',
    title: 'New title',
    root: { id: 'root' },
  });
  expect(result.manifest.screens.home).not.toHaveProperty('description');
});

test('screen requirements omit empty families and reject invalid screen identity', () => {
  const cleared = updateScreenRequirements(manifest, 'home', {
    permissions: {},
    capabilities: {},
  });
  expect(cleared.ok).toBe(true);
  expect(cleared.manifest.screens.home).not.toHaveProperty('requires');
  expect(
    updateScreenMetadata(manifest, 'missing', {
      id: 'missing',
      name: 'Missing',
    }).ok,
  ).toBe(false);
});
