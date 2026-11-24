import { expect, test } from 'bun:test';

import type { AuthoringStructure } from '../model.js';
import { applyAuthoringMutationToStructure } from './applyAuthoringMutationToStructure.js';

const REGISTRY_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'items',
      optional: false,
      structure: {
        kind: 'entity-registry',
        key: { kind: 'scalar', scalarType: 'string' },
        identityField: 'id',
        value: {
          kind: 'object',
          fields: [
            { name: 'id', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
            { name: 'name', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
          ],
        },
      },
    },
  ],
} as const satisfies AuthoringStructure;

test('adds and removes stable registry entities by record identity', () => {
  const added = applyAuthoringMutationToStructure({ items: {} }, REGISTRY_STRUCTURE, {
    kind: 'set',
    path: ['items', 'alpha'],
    value: { id: 'alpha', name: 'Alpha' },
  });
  expect(added).toEqual({
    ok: true,
    value: { items: { alpha: { id: 'alpha', name: 'Alpha' } } },
  });
  if (!added.ok) return;

  expect(
    applyAuthoringMutationToStructure(added.value, REGISTRY_STRUCTURE, {
      kind: 'unset',
      path: ['items', 'alpha'],
    }),
  ).toEqual({ ok: true, value: { items: {} } });
});

test('rejects empty registry identity keys at the application boundary', () => {
  const result = applyAuthoringMutationToStructure({ items: {} }, REGISTRY_STRUCTURE, {
    kind: 'set',
    path: ['items', ''],
    value: { id: '', name: 'Invalid' },
  });

  expect(result).toMatchObject({
    ok: false,
    diagnostic: { code: 'mutation-rejected' },
  });
});

test('rejects registry identity-field mutation and mismatched inserted identity', () => {
  const current = { items: { alpha: { id: 'alpha', name: 'Alpha' } } };
  const identityMutation = applyAuthoringMutationToStructure(current, REGISTRY_STRUCTURE, {
    kind: 'set',
    path: ['items', 'alpha', 'id'],
    value: 'other',
  });
  expect(identityMutation).toMatchObject({
    ok: false,
    diagnostic: { code: 'mutation-rejected' },
  });

  const mismatchedInsert = applyAuthoringMutationToStructure(current, REGISTRY_STRUCTURE, {
    kind: 'set',
    path: ['items', 'beta'],
    value: { id: 'other', name: 'Beta' },
  });
  expect(mismatchedInsert).toMatchObject({
    ok: false,
    diagnostic: { code: 'mutation-rejected', path: ['items', 'beta', 'id'] },
  });
});
