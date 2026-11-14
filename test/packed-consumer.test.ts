import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('packed package keeps its portable root runtime-importable without UI peers', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-core-consumer-'));
  const packageDirectory = join(workspace, 'package');
  const consumerDirectory = join(workspace, 'consumer');

  try {
    await Bun.$`mkdir -p ${packageDirectory} ${consumerDirectory}`;
    await Bun.$`npm pack --ignore-scripts --pack-destination ${packageDirectory}`;
    const archive = (await readdir(packageDirectory)).find((file) => file.endsWith('.tgz'));
    expect(archive).toBeDefined();
    await writeFile(
      join(consumerDirectory, 'package.json'),
      JSON.stringify({
        name: 'packed-portable-core-consumer',
        private: true,
        version: '0.0.0',
        dependencies: {
          '@ankhorage/studio-authoring': `file:${join(packageDirectory, archive!)}`,
        },
      }),
    );
    await writeFile(
      join(consumerDirectory, 'index.mjs'),
      `
        import { getAuthoringRouteDelivery } from '@ankhorage/studio-authoring';

        const screen = getAuthoringRouteDelivery('screens').screen;
        if (screen.status !== 'available' || screen.moduleSpecifier !== '@ankhorage/studio-authoring/screens') {
          throw new Error('The portable root did not expose the expected route declaration.');
        }
      `,
    );

    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const result = await Bun.$`bun ${join(consumerDirectory, 'index.mjs')}`.quiet();
    expect(result.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 30_000);

test('packed screen subpath imports and renders with published UI dependencies', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-screen-consumer-'));
  const packageDirectory = join(workspace, 'package');
  const consumerDirectory = join(workspace, 'consumer');

  try {
    await Bun.$`mkdir -p ${packageDirectory} ${consumerDirectory}`;
    await Bun.$`npm pack --ignore-scripts --pack-destination ${packageDirectory}`;
    const archive = (await readdir(packageDirectory)).find((file) => file.endsWith('.tgz'));
    expect(archive).toBeDefined();
    await writeFile(
      join(consumerDirectory, 'package.json'),
      JSON.stringify({
        name: 'packed-portable-screen-consumer',
        private: true,
        version: '0.0.0',
        dependencies: {
          '@ankhorage/studio-authoring': `file:${join(packageDirectory, archive!)}`,
          '@ankhorage/zora': '^27.1.0',
          react: '19.2.3',
          'react-test-renderer': '19.2.3',
        },
      }),
    );
    await writeFile(
      join(consumerDirectory, 'preload.mjs'),
      `
        import { mock } from 'bun:test';
        import { createElement } from 'react';

        const control = (type) => ({ children, ...props }) => createElement(type, props, children);
        mock.module('@ankhorage/zora/authoring', () => ({
          AuthoringSelectionAdapter: () => null,
        }));
        mock.module('@ankhorage/zora/reader-free', () => ({
          Button: control('Button'),
          Card: control('Card'),
          Text: control('Text'),
          TextInput: control('TextInput'),
          View: control('View'),
        }));
      `,
    );
    await writeFile(
      join(consumerDirectory, 'index.mjs'),
      `
        import { createElement } from 'react';
        import { act, create } from 'react-test-renderer';
        import { ScreensAuthoringScreen } from '@ankhorage/studio-authoring/screens';

        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        let renderer;
        await act(async () => {
          renderer = create(createElement(ScreensAuthoringScreen, {
            screens: [],
            onCreateScreen: async () => ({ status: 'saved' }),
          }));
        });
        if (renderer.toJSON() === null) throw new Error('Screen did not render.');
      `,
    );

    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const result =
      await Bun.$`bun --preload ${join(consumerDirectory, 'preload.mjs')} ${join(consumerDirectory, 'index.mjs')}`.quiet();
    expect(result.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 60_000);
