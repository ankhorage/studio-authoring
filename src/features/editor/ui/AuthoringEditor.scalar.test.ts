import { expect, test } from 'bun:test';

import { deriveAuthoringModel } from '../application/deriveAuthoringModel.js';
import type { AuthoringMutation, AuthoringNode } from '../model.js';
// Bundle only this adapter against inert control contracts; no global module mocks or native runtime.
import { loadEditor, renderControls } from './AuthoringEditor.shared.test.js';

const editor = await loadEditor();

test('renders inherited boolean defaults and emits explicit false without materializing defaults', () => {
  const mutations: AuthoringMutation[] = [];
  const controls = renderControls(
    editor.AuthoringEditor({
      model: booleanModel(undefined),
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const toggle = controls.find((control) => control.type === 'Switch');
  expect(toggle?.props.checked).toBe(true);
  expect(controls.find((control) => control.type === 'Button')?.props.disabled).toBe(true);
  expect(mutations).toEqual([]);
  const change = toggle?.props.onCheckedChange;
  if (typeof change !== 'function') throw new Error('Missing boolean change handler.');
  Reflect.apply(change, undefined, [false]);
  expect(mutations).toEqual([{ kind: 'set', path: ['enabled'], value: false }]);
});

test('resets an explicit boolean override through an unset mutation', () => {
  const mutations: AuthoringMutation[] = [];
  const controls = renderControls(
    editor.AuthoringEditor({
      model: booleanModel(false),
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  expect(controls.find((control) => control.type === 'Switch')?.props.checked).toBe(false);
  const reset = controls.find((control) => control.type === 'Button');
  expect(reset?.props.disabled).toBe(false);
  const press = reset?.props.onPress;
  if (typeof press !== 'function') throw new Error('Missing inheritance reset handler.');
  Reflect.apply(press, undefined, []);
  expect(mutations).toEqual([{ kind: 'unset', path: ['enabled'] }]);
});

test('keeps invalid overrides resettable and read-only fields immutable', () => {
  for (const readOnly of [false, true]) {
    const model = booleanModel('invalid', readOnly);
    const controls = renderControls(
      editor.AuthoringEditor({
        model,
        onMutation: () => {
          throw new Error('Rendering must not mutate authoring state.');
        },
      }),
    );
    expect(controls.some((control) => control.type === 'Switch')).toBe(false);
    expect(controls.some((control) => control.type === 'Button')).toBe(!readOnly);
  }
});

test('shows an inherited finite string choice and emits the selected owner value', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'tone',
          optional: true,
          structure: { kind: 'choice', values: ['default', 'subtle'] },
        },
      ],
    },
    value: {},
    policy: { fields: { tone: { inheritance: { value: 'default' } } } },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const select = controls.find((control) => control.type === 'Select');
  expect(select?.props.value).toBe('default');
  expect(select?.props.options).toEqual([
    { label: 'default', value: 'default' },
    { label: 'subtle', value: 'subtle' },
  ]);
  const change = select?.props.onValueChange;
  if (typeof change !== 'function') throw new Error('Missing choice change handler.');
  Reflect.apply(change, undefined, ['subtle']);
  expect(mutations).toEqual([{ kind: 'set', path: ['tone'], value: 'subtle' }]);
});

test('preserves numeric finite-choice identity instead of coercing owner values to strings', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'level',
          optional: true,
          structure: { kind: 'choice', values: [1, 2, 3] },
        },
      ],
    },
    value: { level: 2 },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const select = controls.find((control) => control.type === 'Select');
  expect(select?.props.value).toBe('number:2');
  expect(select?.props.options).toEqual([
    { label: '1', value: 'number:1' },
    { label: '2', value: 'number:2' },
    { label: '3', value: 'number:3' },
  ]);
  const change = select?.props.onValueChange;
  if (typeof change !== 'function') throw new Error('Missing numeric choice handler.');
  Reflect.apply(change, undefined, ['number:3']);
  expect(mutations).toEqual([{ kind: 'set', path: ['level'], value: 3 }]);
});

test('renders finite set membership and emits canonical unordered membership', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'permissions',
          optional: true,
          structure: {
            kind: 'set',
            member: { kind: 'choice', values: ['camera', 'microphone'] },
          },
        },
      ],
    },
    value: { permissions: { camera: true } },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
    }),
  );
  const switches = controls.filter((control) => control.type === 'Switch');
  expect(switches.map((control) => control.props.checked)).toEqual([true, false]);

  const addMicrophone = switches[1]?.props.onCheckedChange;
  if (typeof addMicrophone !== 'function') throw new Error('Missing membership change handler.');
  Reflect.apply(addMicrophone, undefined, [true]);
  expect(mutations.at(-1)).toEqual({
    kind: 'set',
    path: ['permissions'],
    value: { camera: true, microphone: true },
  });

  const removeCamera = switches[0]?.props.onCheckedChange;
  if (typeof removeCamera !== 'function') throw new Error('Missing membership removal handler.');
  Reflect.apply(removeCamera, undefined, [false]);
  expect(mutations.at(-1)).toEqual({ kind: 'unset', path: ['permissions'] });
});
function booleanModel(value: unknown, readOnly = false): AuthoringNode {
  return deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        { name: 'enabled', optional: true, structure: { kind: 'scalar', scalarType: 'boolean' } },
      ],
    },
    value: { enabled: value },
    policy: { fields: { enabled: { inheritance: { value: true }, readOnly } } },
  });
}
