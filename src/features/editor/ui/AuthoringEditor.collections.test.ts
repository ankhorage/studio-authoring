import { expect, test } from 'bun:test';

import { deriveAuthoringModel } from '../application/deriveAuthoringModel.js';
import type { AuthoringMutation } from '../model.js';
import { loadEditor, renderControls } from './AuthoringEditor.shared.test.js';

const editor = await loadEditor();

const FINITE_LIST_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'identifiers',
      optional: false,
      structure: {
        kind: 'ordered-list',
        item: { kind: 'choice', values: ['email', 'phone', 'username'] },
      },
    },
  ],
} as const;

const OPEN_VALUE_MAP_STRUCTURE = {
  kind: 'object',
  fields: [
    {
      name: 'spacing',
      optional: true,
      structure: {
        kind: 'value-map',
        key: { kind: 'scalar', scalarType: 'string' },
        value: { kind: 'scalar', scalarType: 'number' },
      },
    },
  ],
} as const;

test(
  'renders ordered primitive choices and emits reorder, remove, and append mutations',
  verifyFiniteOrderedListMutations,
);

function verifyFiniteOrderedListMutations(): void {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: FINITE_LIST_STRUCTURE,
    value: { identifiers: ['username', 'email'] },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const buttons = controls.filter((control) => control.type === 'Button');

  const firstDown = buttons.find(
    (control) => control.props.children === 'Down' && control.props.disabled === false,
  )?.props.onPress;
  if (typeof firstDown !== 'function') throw new Error('Missing ordered-list down handler.');
  Reflect.apply(firstDown, undefined, []);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['identifiers'],
    value: ['email', 'username'],
  });

  const firstRemove = buttons.find((control) => control.props.children === 'Remove')?.props.onPress;
  if (typeof firstRemove !== 'function') throw new Error('Missing ordered-list remove handler.');
  Reflect.apply(firstRemove, undefined, []);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['identifiers'],
    value: ['email'],
  });

  const addPhone = buttons.find((control) => control.props.children === 'Add phone')?.props.onPress;
  if (typeof addPhone !== 'function') throw new Error('Missing ordered-list append handler.');
  Reflect.apply(addPhone, undefined, []);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['identifiers'],
    value: ['username', 'email', 'phone'],
  });
}

test('edits and appends open ordered string items without a finite choice catalog', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'fields',
          optional: false,
          structure: {
            kind: 'ordered-list',
            item: { kind: 'scalar', scalarType: 'string' },
          },
        },
      ],
    },
    value: { fields: ['email', 'customField'] },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );

  const inputs = controls.filter((control) => control.type === 'TextInput');
  expect(inputs.map((control) => control.props.value)).toEqual(['email', 'customField']);

  const editSecond = inputs[1]?.props.onChangeText;
  if (typeof editSecond !== 'function') throw new Error('Missing ordered string edit handler.');
  Reflect.apply(editSecond, undefined, ['displayName']);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['fields'],
    value: ['email', 'displayName'],
  });

  const addItem = controls.find(
    (control) => control.type === 'Button' && control.props.children === 'Add item',
  )?.props.onPress;
  if (typeof addItem !== 'function') throw new Error('Missing ordered string append handler.');
  Reflect.apply(addItem, undefined, []);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['fields'],
    value: ['email', 'customField', ''],
  });
});

test(
  'renders open value maps and emits rename, update, remove, and add mutations',
  verifyOpenValueMapMutations,
);

function verifyOpenValueMapMutations(): void {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: OPEN_VALUE_MAP_STRUCTURE,
    value: { spacing: { m: 16 } },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );

  const inputs = controls.filter((control) => control.type === 'TextInput');
  const keyInput = inputs.find((control) => control.props.defaultValue === 'm');
  const valueInput = inputs.find((control) => control.props.value === '16');

  const rename = keyInput?.props.onEndEditing;
  if (typeof rename !== 'function') throw new Error('Missing value-map rename handler.');
  Reflect.apply(rename, undefined, [{ nativeEvent: { text: 'medium' } }]);
  expect(mutations.at(-1)).toEqual({
    kind: 'rename-key',
    path: ['spacing'],
    fromKey: 'm',
    toKey: 'medium',
  });

  const update = valueInput?.props.onChangeText;
  if (typeof update !== 'function') throw new Error('Missing value-map value handler.');
  Reflect.apply(update, undefined, ['20']);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['spacing', 'm'],
    value: 20,
  });

  const remove = controls.find(
    (control) => control.type === 'Button' && control.props.children === 'Remove',
  )?.props.onPress;
  if (typeof remove !== 'function') throw new Error('Missing value-map remove handler.');
  Reflect.apply(remove, undefined, []);
  expect(mutations.at(-1)).toEqual({ kind: 'unset', path: ['spacing'] });

  const add = controls.find(
    (control) => control.type === 'Button' && control.props.children === 'Add entry',
  )?.props.onPress;
  if (typeof add !== 'function') throw new Error('Missing value-map add handler.');
  Reflect.apply(add, undefined, []);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['spacing', 'newKey'],
    value: 0,
  });
}

test('adds object-valued map entries when every nested field is optional', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'headings',
          optional: true,
          structure: {
            kind: 'value-map',
            key: { kind: 'scalar', scalarType: 'string' },
            value: {
              kind: 'object',
              fields: [
                {
                  name: 'size',
                  optional: true,
                  structure: { kind: 'scalar', scalarType: 'number' },
                },
              ],
            },
          },
        },
      ],
    },
    value: { headings: {} },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );

  const add = controls.find(
    (control) => control.type === 'Button' && control.props.children === 'Add entry',
  )?.props.onPress;
  if (typeof add !== 'function') throw new Error('Missing object value-map add handler.');
  Reflect.apply(add, undefined, []);

  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['headings', 'newKey'],
    value: {},
  });
});

test('renders inherited value-map entries without emitting authored state', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'spacing',
          optional: true,
          structure: {
            kind: 'value-map',
            key: { kind: 'scalar', scalarType: 'string' },
            value: { kind: 'scalar', scalarType: 'number' },
          },
        },
      ],
    },
    value: {},
    policy: {
      fields: {
        spacing: {
          fields: {
            m: { inheritance: { value: 16 } },
          },
        },
      },
    },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );

  const inheritedKey = controls.find(
    (control) => control.type === 'TextInput' && control.props.defaultValue === 'm',
  );
  expect(inheritedKey?.props.readOnly).toBe(true);
  expect(
    controls.some((control) => control.type === 'TextInput' && control.props.value === '16'),
  ).toBe(true);
  expect(
    controls.some((control) => control.type === 'Button' && control.props.children === 'Remove'),
  ).toBe(false);
  expect(mutations).toEqual([]);
});
