import { expect, test } from 'bun:test';

import { createInspectorRoute } from './inspectorRoute.js';

test('inspector routes encode the selected node identity', () => {
  expect(createInspectorRoute('properties', 'node / café')).toBe(
    '/ankh/properties/node%20%2F%20caf%C3%A9',
  );
});
