import type { ApiDefinitionRegistry } from '@ankhorage/contracts';
import { expect, test } from 'bun:test';

import {
  collectBindingCapabilityOptions,
  findBindingCapabilityOption,
  projectBindingInputFieldMetadata,
} from './bindingPolicy.js';

const testApis: ApiDefinitionRegistry = {
  weather: {
    id: 'weather',
    name: 'Weather',
    basePath: '/',
    origin: 'internal',
    protocol: 'rest',
    schemas: { city: { type: 'string', title: 'City name' } },
    endpoints: {
      forecast: {
        id: 'forecast',
        kind: 'rest',
        operations: {
          get: {
            id: 'get',
            protocol: 'rest',
            intent: 'read',
            request: {
              parameters: [
                {
                  name: 'city',
                  location: 'query',
                  required: true,
                  schemaRef: { id: 'city' },
                },
              ],
              schema: {
                type: 'object',
                properties: { units: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
};

test('projects only the host-injected capability catalog', () => {
  expect(
    collectBindingCapabilityOptions({
      apis: {},
      capabilities: [
        {
          id: 'host.alert',
          owner: '@host/runtime',
          access: ['invoke'],
          binding: { kind: 'action', bindableAs: ['target'] },
        },
      ],
    }),
  ).toMatchObject([{ capability: { id: 'host.alert' }, label: 'host.alert' }]);
});

test('projects host metadata from a selected option without changing the portable option', () => {
  const options = collectBindingCapabilityOptions({ apis: testApis, capabilities: [] });
  const option = findBindingCapabilityOption(options, 'api.weather.get');
  if (!option) throw new Error('Expected generated API capability option');

  const projection = projectBindingInputFieldMetadata({
    option,
    apis: testApis,
    project: ({ inputField, schema, api }) => ({
      editorLabel: schema?.title ?? inputField.label,
      apiId: api?.id,
    }),
  });

  expect(projection).toEqual([
    {
      inputField: option.inputFields[0],
      metadata: { editorLabel: 'City name', apiId: 'weather' },
    },
    {
      inputField: option.inputFields[1],
      metadata: { editorLabel: 'units', apiId: 'weather' },
    },
  ]);
  expect(option.inputFields).toEqual([
    {
      name: 'city',
      label: 'city',
      value: { type: 'unknown' },
      required: true,
    },
    {
      name: 'units',
      label: 'units',
      value: { type: 'string' },
      required: false,
    },
  ]);
});
