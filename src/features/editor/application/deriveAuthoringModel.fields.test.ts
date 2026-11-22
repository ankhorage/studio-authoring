import { expect, test } from 'bun:test';

import type { AuthoringNode, AuthoringStructure } from '../model.js';
import { deriveAuthoringModel } from './deriveAuthoringModel.js';

const SCREEN_METADATA_STRUCTURE = {
  kind: 'object',
  fields: [
    { name: 'id', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
    { name: 'name', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
    { name: 'title', optional: true, structure: { kind: 'scalar', scalarType: 'string' } },
    {
      name: 'description',
      optional: true,
      structure: { kind: 'scalar', scalarType: 'string' },
    },
  ],
} as const satisfies AuthoringStructure;

const NEUTRAL_OBJECT_FIELD_EXPECTATION: ReturnType<typeof toFieldSummary>[] = [
  {
    label: 'Stable screen ID',
    kind: 'scalar',
    optional: false,
    readOnly: true,
    multiline: false,
    value: 'screen-home',
  },
  {
    label: 'Name',
    kind: 'scalar',
    optional: false,
    readOnly: false,
    multiline: false,
    value: 'Home',
  },
  {
    label: 'Title',
    kind: 'scalar',
    optional: true,
    readOnly: false,
    multiline: false,
    value: undefined,
  },
  {
    label: 'Description',
    kind: 'scalar',
    optional: true,
    readOnly: false,
    multiline: true,
    value: 'Landing screen',
  },
];

test('derives a selected owner substructure at its canonical base path', () => {
  const model = deriveAuthoringModel({
    structure: { kind: 'scalar', scalarType: 'string' },
    value: undefined,
    path: ['tokens', 'weights', 'body'],
    optional: true,
    policy: { inheritance: { value: '400' } },
  });

  expect(model).toMatchObject({
    kind: 'scalar',
    path: ['tokens', 'weights', 'body'],
    optional: true,
    value: undefined,
    inheritance: { value: '400', overridden: false },
  });
});

test(
  'derives scalar and optional fields from one neutral object structure',
  verifyNeutralObjectFields,
);

function verifyNeutralObjectFields(): void {
  const model = deriveAuthoringModel({
    structure: SCREEN_METADATA_STRUCTURE,
    value: {
      id: 'screen-home',
      name: 'Home',
      description: 'Landing screen',
    },
    policy: {
      label: 'Screen metadata',
      fields: {
        id: { readOnly: true, label: 'Stable screen ID' },
        description: { multiline: true },
      },
    },
  });

  expect(model.kind).toBe('object');
  if (model.kind !== 'object') return;

  expect(model.fields.map(toFieldSummary)).toEqual(NEUTRAL_OBJECT_FIELD_EXPECTATION);
}

function toFieldSummary(
  field: Extract<AuthoringNode, { readonly kind: 'object' }>['fields'][number],
) {
  return {
    label: field.label,
    kind: field.kind,
    optional: field.optional,
    readOnly: field.readOnly,
    multiline: field.kind === 'scalar' ? field.multiline : undefined,
    value: field.kind === 'scalar' || field.kind === 'choice' ? field.value : undefined,
  };
}
