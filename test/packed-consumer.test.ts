import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('packed package exposes its declared portable screen module to an installed consumer', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-consumer-'));
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
          react: '19.2.3',
          'react-native': '0.86.3',
        },
      }),
    );
    await writeFile(
      join(consumerDirectory, 'index.tsx'),
      `
        import type React from 'react';
        import { ScreensAuthoringScreen, type ScreensAuthoringScreenProps } from '@ankhorage/studio-authoring';

        const props: ScreensAuthoringScreenProps = {
          screens: [{ id: 'home', name: 'Home' }],
          onScreenSelectionChange: () => undefined,
          onCreateScreen: async () => undefined,
        };
        const screen: (props: ScreensAuthoringScreenProps) => React.JSX.Element = ScreensAuthoringScreen;
        void props;
        void screen;
      `,
    );
    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const result =
      await Bun.$`bun ${join(process.cwd(), 'node_modules/typescript/bin/tsc')} --noEmit --jsx react-jsx --module NodeNext --moduleResolution NodeNext --skipLibCheck --strict ${join(consumerDirectory, 'index.tsx')}`.quiet();
    expect(result.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 30_000);
