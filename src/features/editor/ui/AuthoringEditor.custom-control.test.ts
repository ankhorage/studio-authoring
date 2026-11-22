import { expect, test } from 'bun:test';
import { createElement } from 'react';

import { deriveAuthoringModel } from '../application/deriveAuthoringModel.js';
import type { AuthoringMutation } from '../model.js';
import { loadEditor, renderControls } from './AuthoringEditor.shared.test.js';

const editor = await loadEditor();

test('delegates owner-requested custom controls while retaining the central Field wrapper', () => {
  const mutations: AuthoringMutation[] = [];
  const model = deriveAuthoringModel({
    structure: {
      kind: 'object',
      fields: [
        {
          name: 'source',
          optional: true,
          structure: {
            kind: 'object',
            fields: [
              {
                name: 'mediaId',
                optional: true,
                structure: { kind: 'scalar', scalarType: 'string' },
              },
            ],
          },
        },
      ],
    },
    value: { source: { mediaId: 'hero' } },
    policy: {
      fields: {
        source: { label: 'Source', editor: { kind: 'media', mediaKinds: ['image'] } },
      },
    },
  });
  const controls = renderControls(
    editor.AuthoringEditor({
      model,
      onMutation: (mutation) => mutations.push(mutation),
      renderCustomControl: ({ model: field, onMutation }) =>
        field.editor?.kind === 'media'
          ? createElement('span', {
              onClick: () =>
                onMutation({ kind: 'set', path: field.path, value: { mediaId: 'replacement' } }),
            })
          : undefined,
    }),
  );
  expect(controls.some((control) => control.type === 'Field')).toBe(true);
  const custom = controls.find((control) => control.type === 'span');
  const click = custom?.props.onClick;
  if (typeof click !== 'function') throw new Error('Missing custom editor handler.');
  Reflect.apply(click, undefined, []);
  expect(mutations).toEqual([{ kind: 'set', path: ['source'], value: { mediaId: 'replacement' } }]);
});
