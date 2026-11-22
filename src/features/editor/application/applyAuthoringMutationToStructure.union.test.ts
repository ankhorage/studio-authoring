import { expect, test } from 'bun:test';

import type { AuthoringStructure } from '../model.js';
import { applyAuthoringMutationToStructure } from './applyAuthoringMutationToStructure.js';

const UNION_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'rollout',
      optional: false,
      structure: {
        kind: 'union',
        discriminator: 'mode',
        variants: [
          {
            kind: 'object',
            fields: [
              {
                name: 'mode',
                optional: false,
                structure: { kind: 'choice', values: ['immediate'] },
              },
            ],
          },
          {
            kind: 'object',
            fields: [
              {
                name: 'mode',
                optional: false,
                structure: { kind: 'choice', values: ['staged'] },
              },
              {
                name: 'fraction',
                optional: false,
                structure: { kind: 'scalar', scalarType: 'string' },
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies AuthoringStructure;
test('switches discriminated union variants and edits only the active variant', () => {
  const current: Readonly<Record<string, unknown>> = { rollout: { mode: 'immediate' } };
  const switched = applyAuthoringMutationToStructure(current, UNION_STRUCTURE, {
    kind: 'set',
    path: ['rollout'],
    value: { mode: 'staged', fraction: '0.25' },
  });
  expect(switched).toEqual({
    ok: true,
    value: { rollout: { mode: 'staged', fraction: '0.25' } },
  });
  if (!switched.ok) return;

  expect(
    applyAuthoringMutationToStructure(switched.value, UNION_STRUCTURE, {
      kind: 'set',
      path: ['rollout', 'fraction'],
      value: '0.5',
    }),
  ).toEqual({
    ok: true,
    value: { rollout: { mode: 'staged', fraction: '0.5' } },
  });
});

test('replaces a root discriminated union with a validated target variant', () => {
  const rootUnion = {
    kind: 'union',
    discriminator: 'kind',
    variants: [
      {
        kind: 'object',
        fields: [{ name: 'kind', optional: false, structure: { kind: 'choice', values: ['a'] } }],
      },
      {
        kind: 'object',
        fields: [
          { name: 'kind', optional: false, structure: { kind: 'choice', values: ['b'] } },
          { name: 'label', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
        ],
      },
    ],
  } as const satisfies AuthoringStructure;

  const current: Readonly<Record<string, unknown>> = { kind: 'a' };
  expect(
    applyAuthoringMutationToStructure(current, rootUnion, {
      kind: 'set',
      path: [],
      value: { kind: 'b', label: 'B' },
    }),
  ).toEqual({
    ok: true,
    value: { kind: 'b', label: 'B' },
  });
});

test('rejects nested edits when the current union discriminator is unknown', () => {
  const result = applyAuthoringMutationToStructure(
    { rollout: { mode: 'unknown' } },
    UNION_STRUCTURE,
    {
      kind: 'set',
      path: ['rollout', 'fraction'],
      value: '0.5',
    },
  );

  expect(result).toMatchObject({
    ok: false,
    diagnostic: { code: 'mutation-rejected' },
  });
});
