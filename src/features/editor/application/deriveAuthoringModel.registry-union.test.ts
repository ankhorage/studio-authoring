import { expect, test } from 'bun:test';

import { deriveAuthoringModel } from './deriveAuthoringModel.js';

test('derives stable entity-registry details and keeps duplicated identity read-only', () => {
  const model = deriveAuthoringModel({
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
    value: {
      alpha: { id: 'alpha', name: 'Alpha' },
    },
  });

  expect(model).toMatchObject({
    kind: 'entity-registry',
    identityField: 'id',
    entries: [{ key: 'alpha', value: { kind: 'object', path: ['alpha'] } }],
  });
  if (model.kind !== 'entity-registry') return;
  const entry = model.entries.at(0)?.value;
  if (entry?.kind !== 'object') return;
  expect(entry.fields.find((field) => field.path.at(-1) === 'id')).toMatchObject({
    kind: 'scalar',
    value: 'alpha',
    readOnly: true,
  });
});

test('rejects entity-registry key and identity-field mismatches explicitly', () => {
  const model = deriveAuthoringModel({
    structure: {
      kind: 'entity-registry',
      key: { kind: 'scalar', scalarType: 'string' },
      identityField: 'id',
      value: {
        kind: 'object',
        fields: [
          { name: 'id', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
        ],
      },
    },
    value: { alpha: { id: 'other' } },
  });

  expect(model).toMatchObject({
    kind: 'unsupported',
    diagnostic: {
      code: 'invalid-value',
      path: ['alpha', 'id'],
    },
  });
});

test('derives the active discriminated union variant without duplicating its discriminator field', () => {
  const model = deriveAuthoringModel({
    structure: {
      kind: 'union',
      discriminator: 'kind',
      variants: [
        {
          kind: 'object',
          fields: [
            { name: 'kind', optional: false, structure: { kind: 'choice', values: ['alpha'] } },
            { name: 'label', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
          ],
        },
        {
          kind: 'object',
          fields: [
            { name: 'kind', optional: false, structure: { kind: 'choice', values: ['beta'] } },
            {
              name: 'count',
              optional: false,
              structure: { kind: 'scalar', scalarType: 'integer' },
            },
          ],
        },
      ],
    },
    value: { kind: 'beta', count: 2 },
  });

  expect(model).toMatchObject({
    kind: 'union',
    discriminator: 'kind',
    selected: 'beta',
    value: {
      kind: 'object',
      fields: [{ kind: 'scalar', value: 2 }],
    },
  });
});

test('fails closed for unions without an explicit owner discriminator', () => {
  const model = deriveAuthoringModel({
    structure: {
      kind: 'union',
      variants: [
        {
          kind: 'object',
          fields: [
            { name: 'value', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
          ],
        },
      ],
    },
    value: { value: 'x' },
  });

  expect(model).toMatchObject({
    kind: 'unsupported',
    diagnostic: { code: 'unsupported-structure' },
  });
});
