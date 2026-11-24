import { expect, test } from 'bun:test';

import { deriveAuthoringModel } from '../application/deriveAuthoringModel.js';
import type { AuthoringMutation } from '../model.js';
import { loadEditor, renderControls } from './AuthoringEditor.shared.test.js';

const editor = await loadEditor();

const REGISTRY_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'products',
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
} as const;

const UNION_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'rollout',
      optional: true,
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
              { name: 'mode', optional: false, structure: { kind: 'choice', values: ['staged'] } },
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
} as const;

const PRODUCT_UNION_STRUCTURE = {
  kind: 'union',
  discriminator: 'kind',
  variants: [
    {
      kind: 'object',
      fields: [
        { name: 'id', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
        {
          name: 'basePrice',
          optional: false,
          structure: {
            kind: 'object',
            fields: [
              {
                name: 'amount',
                optional: false,
                structure: { kind: 'scalar', scalarType: 'string' },
              },
            ],
          },
        },
        { name: 'kind', optional: false, structure: { kind: 'choice', values: ['consumable'] } },
      ],
    },
    {
      kind: 'object',
      fields: [
        { name: 'id', optional: false, structure: { kind: 'scalar', scalarType: 'string' } },
        {
          name: 'basePrice',
          optional: false,
          structure: {
            kind: 'object',
            fields: [
              {
                name: 'amount',
                optional: false,
                structure: { kind: 'scalar', scalarType: 'string' },
              },
            ],
          },
        },
        { name: 'kind', optional: false, structure: { kind: 'choice', values: ['subscription'] } },
        {
          name: 'subscription',
          optional: false,
          structure: {
            kind: 'object',
            fields: [
              {
                name: 'period',
                optional: false,
                structure: { kind: 'choice', values: ['P1M', 'P1Y'] },
              },
            ],
          },
        },
      ],
    },
  ],
} as const;

test(
  'captures open registry identity before insertion and keeps existing identity immutable',
  verifyOpenRegistryIdentity,
);

function verifyOpenRegistryIdentity(): void {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: REGISTRY_STRUCTURE,
    value: { products: { alpha: { id: 'alpha', name: 'Alpha' } } },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );

  expect(
    controls.some(
      (control) => control.type === 'TextInput' && control.props.defaultValue === 'alpha',
    ),
  ).toBe(false);

  const remove = controls.find(
    (control) => control.type === 'Button' && control.props.children === 'Remove',
  )?.props.onPress;
  if (typeof remove !== 'function') throw new Error('Missing entity removal handler.');
  Reflect.apply(remove, undefined, []);
  expect(mutations.at(-1)).toEqual({ kind: 'unset', path: ['products', 'alpha'] });

  const identityInput = controls.find(
    (control) =>
      control.type === 'TextInput' &&
      control.props.placeholder === 'Entity identity · press Enter to add',
  );
  const submitIdentity = identityInput?.props.onSubmitEditing;
  if (typeof submitIdentity !== 'function') {
    throw new Error('Missing open registry identity submit handler.');
  }

  const beforeInvalid = mutations.length;
  Reflect.apply(submitIdentity, undefined, [{ nativeEvent: { text: '' } }]);
  Reflect.apply(submitIdentity, undefined, [{ nativeEvent: { text: 'alpha' } }]);
  expect(mutations).toHaveLength(beforeInvalid);

  Reflect.apply(submitIdentity, undefined, [{ nativeEvent: { text: ' beta ' } }]);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['products', 'beta'],
    value: { id: 'beta', name: '' },
  });
}

test(
  'renders discriminated union selection and initializes the selected owner variant',
  verifyUnionSelection,
);

function verifyUnionSelection(): void {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: UNION_STRUCTURE,
    value: { rollout: { mode: 'immediate' } },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const select = controls.find((control) => control.type === 'Select');
  expect(select?.props.options).toEqual([
    { label: 'immediate', value: 'string:"immediate"' },
    { label: 'staged', value: 'string:"staged"' },
  ]);

  const selectStaged = select?.props.onValueChange;
  if (typeof selectStaged !== 'function') throw new Error('Missing union variant handler.');
  Reflect.apply(selectStaged, undefined, ['string:"staged"']);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['rollout'],
    value: { mode: 'staged', fraction: '' },
  });
}

test(
  'preserves shared owner fields when switching a product-like discriminated union',
  verifyProductUnionSwitch,
);

function verifyProductUnionSwitch(): void {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: PRODUCT_UNION_STRUCTURE,
    value: { id: 'pro', basePrice: { amount: '19.90' }, kind: 'consumable' },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const select = controls.find((control) => control.type === 'Select');
  const selectSubscription = select?.props.onValueChange;
  if (typeof selectSubscription !== 'function') throw new Error('Missing union variant handler.');

  Reflect.apply(selectSubscription, undefined, ['string:"subscription"']);

  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: [],
    value: {
      id: 'pro',
      basePrice: { amount: '19.90' },
      kind: 'subscription',
      subscription: { period: 'P1M' },
    },
  });
}
