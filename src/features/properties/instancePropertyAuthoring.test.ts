import type { UiNode } from '@ankhorage/contracts';
import { expect, test } from 'bun:test';

import { deriveAuthoringModel } from '../editor/application/deriveAuthoringModel.js';
import {
  type AuthoringMetaRegistry,
  resolveInstancePropertyAuthoring,
} from './instancePropertyAuthoring.js';

const registry: AuthoringMetaRegistry = {
  Heading: {
    name: 'Heading',
    props: {
      text: {
        type: 'string',
        category: 'Content',
        label: 'Text',
        default: 'Heading',
        authoring: { authority: 'instance' },
      },
      level: {
        type: 'enum',
        category: 'Semantics',
        label: 'Level',
        enum: [1, 2, 3, 4, 5, 6],
        default: 2,
        authoring: { authority: 'instance' },
      },
      size: {
        type: 'enum',
        category: 'Style',
        enum: ['h1', 'h2'],
        authoring: { authority: 'theme' },
      },
    },
  },
  Image: {
    name: 'Image',
    props: {
      source: {
        type: 'media',
        category: 'Content',
        label: 'Source',
        mediaKinds: ['image'],
        authoring: { authority: 'instance' },
      },
    },
  },
  List: {
    name: 'List',
    props: {
      items: {
        type: 'array',
        category: 'Data',
        label: 'Items',
        authoring: { authority: 'instance' },
      },
    },
  },
};

test('derives grouped instance fields and owner defaults without exposing theme authority', () => {
  const node: UiNode = { id: 'heading', type: 'Heading', props: { level: 3 } };
  const authoring = resolveInstancePropertyAuthoring(node, registry);
  expect(authoring.componentName).toBe('Heading');
  expect(authoring.groups.map((group) => group.category)).toEqual(['Content', 'Semantics']);
  const [content, semantics] = authoring.groups;
  expect(
    deriveAuthoringModel({ ...content, value: node.props ?? {}, label: content.category }),
  ).toMatchObject({
    fields: [
      {
        path: ['text'],
        label: 'Text',
        value: undefined,
        inheritance: { value: 'Heading', overridden: false },
      },
    ],
  });
  expect(
    deriveAuthoringModel({ ...semantics, value: node.props ?? {}, label: semantics.category }),
  ).toMatchObject({
    fields: [
      {
        kind: 'choice',
        path: ['level'],
        values: [1, 2, 3, 4, 5, 6],
        value: 3,
        inheritance: { value: 2, overridden: true },
      },
    ],
  });
});

test('preserves media hints and rejects unknown owner property types', () => {
  const image = resolveInstancePropertyAuthoring(
    { id: 'image', type: 'Image', props: { source: { mediaId: 'hero' } } },
    registry,
  );
  const [imageGroup] = image.groups;
  expect(
    deriveAuthoringModel({
      ...imageGroup,
      value: { source: { mediaId: 'hero' } },
      label: imageGroup.category,
    }),
  ).toMatchObject({
    fields: [
      { kind: 'object', path: ['source'], editor: { kind: 'media', mediaKinds: ['image'] } },
    ],
  });
  const list = resolveInstancePropertyAuthoring(
    { id: 'list', type: 'List', props: { items: [] } },
    registry,
  );
  const [listGroup] = list.groups;
  expect(
    deriveAuthoringModel({ ...listGroup, value: { items: [] }, label: listGroup.category }),
  ).toMatchObject({
    fields: [
      {
        kind: 'unsupported',
        path: ['items'],
        diagnostic: { code: 'unsupported-structure', path: ['items'] },
      },
    ],
  });
});
