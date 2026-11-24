import { expect, test } from 'bun:test';

import { collectBindingCapabilityOptions } from './bindingPolicy.js';

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
