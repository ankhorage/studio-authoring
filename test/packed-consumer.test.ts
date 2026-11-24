import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('packed package keeps its portable root runtime-importable without UI peers', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-core-consumer-'));
  const npmCacheDirectory = join(workspace, 'npm-cache');
  const packageDirectory = join(workspace, 'package');
  const consumerDirectory = join(workspace, 'consumer');

  try {
    await Bun.$`mkdir -p ${packageDirectory} ${consumerDirectory}`;
    await Bun.$`npm --cache ${npmCacheDirectory} pack --ignore-scripts --pack-destination ${packageDirectory}`;
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
    const installedManifest = await Bun.file(
      join(consumerDirectory, 'node_modules/@ankhorage/studio-authoring/package.json'),
    ).json();
    expect(installedManifest.exports['./screens']).toEqual({
      types: './dist/screens.d.ts',
      browser: './dist/screens.js',
      'react-native': './dist/screens.js',
    });
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 30_000);

test(
  'packed screen subpath exposes its public props to a consumer using released ZORA peers',
  () => verifyPackedScreenContract(),
  60_000,
);

async function verifyPackedScreenContract(): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-screen-consumer-'));
  const npmCacheDirectory = join(workspace, 'npm-cache');
  const packageDirectory = join(workspace, 'package');
  const consumerDirectory = join(workspace, 'consumer');

  try {
    await Bun.$`mkdir -p ${packageDirectory} ${consumerDirectory}`;
    await Bun.$`npm --cache ${npmCacheDirectory} pack --ignore-scripts --pack-destination ${packageDirectory}`;
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
          '@ankhorage/zora': '27.2.0',
          react: '19.2.3',
          'react-native': '0.86.3',
          typescript: '^5.9.3',
        },
      }),
    );
    await writeFile(
      join(consumerDirectory, 'tsconfig.json'),
      `
        {
          "compilerOptions": {
            "jsx": "react-jsx",
            "module": "NodeNext",
            "moduleResolution": "NodeNext",
            "noEmit": true,
            "strict": true,
            "skipLibCheck": true
          },
          "include": ["screen-contract.tsx"]
        }
      `,
    );
    await writeFile(
      join(consumerDirectory, 'screen-contract.tsx'),
      `
        import {
          AuthoringEditor,
          type AuthoringEditorProps,
          ScreensAuthoringScreen,
          type ScreensAuthoringScreenProps,
        } from '@ankhorage/studio-authoring/screens';

        const props: ScreensAuthoringScreenProps = {
          screens: [{ id: 'home', name: 'Home' }],
          selectedScreenId: 'home',
          onScreenSelectionChange: (screen) => console.log(screen?.id),
          onCreateScreen: async () => ({ status: 'saved' }),
        };

        const editorProps = {} as AuthoringEditorProps;
        void [props, editorProps, AuthoringEditor, ScreensAuthoringScreen];
      `,
    );
    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const typecheck =
      await Bun.$`bun ${join(consumerDirectory, 'node_modules/typescript/bin/tsc')} --noEmit -p ${join(consumerDirectory, 'tsconfig.json')}`.quiet();
    expect(typecheck.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}
