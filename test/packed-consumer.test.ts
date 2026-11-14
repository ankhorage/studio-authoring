import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('packed package exposes the portable route delivery registry to an installed consumer', async () => {
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
        name: 'packed-route-delivery-consumer',
        private: true,
        version: '0.0.0',
        dependencies: {
          '@ankhorage/studio-authoring': `file:${join(packageDirectory, archive!)}`,
        },
      }),
    );
    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const result = await Bun.$`bun --cwd ${consumerDirectory} --eval ${`
      import { AUTHORING_ANKH_ROUTE_DELIVERIES } from '@ankhorage/studio-authoring';
      if (AUTHORING_ANKH_ROUTE_DELIVERIES.length !== 13) process.exit(1);
      if (AUTHORING_ANKH_ROUTE_DELIVERIES.some((route) => route.screen.status !== 'unresolved')) process.exit(1);
    `}`.quiet();
    expect(result.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
});
