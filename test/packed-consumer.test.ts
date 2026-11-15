import { expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

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

test('packed screen subpath exposes its public props to a consumer using released ZORA peers', async () => {
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
          ScreensAuthoringScreen,
          type ScreensAuthoringScreenProps,
        } from '@ankhorage/studio-authoring/screens';

        const props: ScreensAuthoringScreenProps = {
          screens: [{ id: 'home', name: 'Home' }],
          selectedScreenId: 'home',
          onScreenSelectionChange: (screen) => console.log(screen?.id),
          onCreateScreen: async () => ({ status: 'saved' }),
        };

        void [props, ScreensAuthoringScreen];
      `,
    );
    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const typecheck =
      await Bun.$`bun ${join(consumerDirectory, 'node_modules/typescript/bin/tsc')} --noEmit -p ${join(consumerDirectory, 'tsconfig.json')}`.quiet();
    expect(typecheck.exitCode).toBe(0);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 60_000);

test('packed screen renders and handles authoring interactions through Vite, RNW, and published ZORA', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-authoring-packed-browser-consumer-'));
  const npmCacheDirectory = join(workspace, 'npm-cache');
  const packageDirectory = join(workspace, 'package');
  const consumerDirectory = join(workspace, 'consumer');

  try {
    await Bun.$`mkdir -p ${packageDirectory} ${consumerDirectory}/src`;
    await Bun.$`npm --cache ${npmCacheDirectory} pack --ignore-scripts --pack-destination ${packageDirectory}`;
    const archive = (await readdir(packageDirectory)).find((file) => file.endsWith('.tgz'));
    expect(archive).toBeDefined();
    await writeFile(
      join(consumerDirectory, 'package.json'),
      JSON.stringify({
        name: 'packed-portable-screen-browser-consumer',
        private: true,
        version: '0.0.0',
        dependencies: {
          '@ankhorage/studio-authoring': `file:${join(packageDirectory, archive!)}`,
          '@ankhorage/zora': '27.2.0',
          react: '19.2.3',
          'react-dom': '19.2.3',
          'react-native-web': '0.21.4',
        },
        devDependencies: {
          vite: '8.3.8',
        },
      }),
    );
    await writeFile(
      join(consumerDirectory, 'vite.config.mjs'),
      `
        import { defineConfig } from 'vite';

        export default defineConfig({
          define: {
            'process.env.NODE_ENV': JSON.stringify('development'),
          },
          resolve: {
            alias: [{ find: 'react-native', replacement: 'react-native-web' }],
          },
          build: {
            emptyOutDir: true,
            lib: {
              entry: 'src/main.tsx',
              formats: ['iife'],
              name: 'PackedScreensAcceptance',
              fileName: 'acceptance',
            },
          },
        });
      `,
    );
    await writeFile(
      join(consumerDirectory, 'src/main.tsx'),
      `
        import { ScreensAuthoringScreen } from '@ankhorage/studio-authoring/screens';
        import { ThemeProvider } from '@ankhorage/zora/authoring';
        import { createRoot } from 'react-dom/client';
        import { createElement, useRef, useState } from 'react';

        function Harness() {
          const [selectedScreenId, setSelectedScreenId] = useState('home');
          const [selectionEvents, setSelectionEvents] = useState(0);
          const [disabled, setDisabled] = useState(false);
          const [hasHost, setHasHost] = useState(true);
          const [mode, setMode] = useState('saved');
          const [createAttempts, setCreateAttempts] = useState(0);
          const pendingReject = useRef();
          const onCreateScreen = hasHost
            ? async () => {
                setCreateAttempts((attempts) => attempts + 1);
                if (mode === 'rejected') return { status: 'rejected', message: 'Name already exists.' };
                if (mode === 'thrown') throw new Error('Manifest write failed.');
                if (mode === 'pending') {
                  return new Promise((_resolve, reject) => {
                    pendingReject.current = () => reject(new Error('Manifest write failed.'));
                  });
                }
                return { status: 'saved' };
              }
            : undefined;

          globalThis.__packedScreensAcceptance = {
            setDisabled,
            setHasHost,
            setMode,
            rejectPending: () => pendingReject.current?.(),
          };

          return createElement(
            ThemeProvider,
            null,
            createElement(ScreensAuthoringScreen, {
              screens: [
                { id: 'home', name: 'Home' },
                { id: 'settings', name: 'Settings' },
              ],
              selectedScreenId,
              disabled,
              onCreateScreen,
              onScreenSelectionChange: (screen) => {
                setSelectionEvents((events) => events + 1);
                setSelectedScreenId(screen?.id);
              },
            }),
            createElement('output', { id: 'selected-screen' }, selectedScreenId),
            createElement('output', { id: 'selection-events' }, String(selectionEvents)),
            createElement('output', { id: 'create-attempts' }, String(createAttempts)),
          );
        }

        createRoot(document.getElementById('root')).render(createElement(Harness));
      `,
    );
    await Bun.$`bun install --cwd ${consumerDirectory}`;
    const build =
      await Bun.$`bun --cwd ${consumerDirectory} ${join(consumerDirectory, 'node_modules/vite/bin/vite.js')} build`.quiet();
    expect(build.exitCode).toBe(0);

    const bundle = await Bun.file(join(consumerDirectory, 'dist/acceptance.iife.js')).text();
    const dom = new JSDOM('<!doctype html><div id="root"></div>', {
      runScripts: 'outside-only',
      url: 'http://packed-consumer.test/',
    });
    const { window } = dom;
    const browserErrors: string[] = [];
    window.addEventListener('error', (event) =>
      browserErrors.push(String(event.error ?? event.message)),
    );
    window.console.error = (...values: unknown[]) => browserErrors.push(values.join(' '));
    Object.assign(window, {
      matchMedia: () => ({
        addEventListener() {},
        addListener() {},
        matches: false,
        removeEventListener() {},
        removeListener() {},
      }),
      process: { env: { NODE_ENV: 'development' } },
      requestAnimationFrame: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
      cancelAnimationFrame: (handle: number) => window.clearTimeout(handle),
      ResizeObserver: class {
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    });
    window.eval(bundle);

    const settle = async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    };
    const acceptance = () =>
      (
        window as unknown as {
          __packedScreensAcceptance: {
            setDisabled(disabled: boolean): void;
            setHasHost(hasHost: boolean): void;
            setMode(mode: string): void;
            rejectPending(): void;
          };
        }
      ).__packedScreensAcceptance;
    const queryButton = (label: string) =>
      [...window.document.querySelectorAll('button')].find(
        (button) => button.textContent === label,
      );
    const input = () => window.document.querySelector('input[aria-label="New screen name"]');
    const setDraft = async (name: string) => {
      const control = input();
      expect(control).not.toBeNull();
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(control, name);
      control?.dispatchEvent(new window.Event('input', { bubbles: true }));
      await settle();
    };
    const create = async () => {
      const button = queryButton('Create screen');
      expect(button).toBeDefined();
      button?.click();
      await settle();
    };
    const output = (id: string) => window.document.getElementById(id)?.textContent;

    await settle();
    expect(window.document.body.textContent, browserErrors.join('\n')).toContain(
      'Canonical screens',
    );
    expect(queryButton('Selected')).toBeDefined();

    queryButton('Select')?.click();
    await settle();
    expect(output('selected-screen')).toBe('settings');
    expect(output('selection-events')).toBe('1');

    acceptance().setDisabled(true);
    await settle();
    expect(input()?.readOnly).toBe(true);
    expect(queryButton('Create screen')?.disabled).toBe(true);
    expect(queryButton('Select')?.disabled).toBe(true);

    acceptance().setDisabled(false);
    acceptance().setHasHost(false);
    await settle();
    expect(input()?.readOnly).toBe(true);
    expect(queryButton('Create screen')?.disabled).toBe(true);

    acceptance().setHasHost(true);
    acceptance().setMode('saved');
    await settle();
    await setDraft('Dashboard');
    await create();
    expect(input()?.value).toBe('');

    acceptance().setMode('rejected');
    await settle();
    await setDraft('Dashboard');
    await create();
    expect(input()?.value).toBe('Dashboard');
    expect(window.document.body.textContent).toContain('Name already exists.');

    acceptance().setMode('thrown');
    await settle();
    await create();
    expect(input()?.value).toBe('Dashboard');
    expect(window.document.body.textContent).toContain('Manifest write failed.');

    acceptance().setMode('pending');
    await settle();
    const pendingCreate = queryButton('Create screen');
    pendingCreate?.click();
    pendingCreate?.click();
    await settle();
    expect(output('create-attempts')).toBe('4');
    acceptance().rejectPending();
    await settle();

    acceptance().setMode('saved');
    await settle();
    await create();
    expect(output('create-attempts')).toBe('5');
    expect(input()?.value).toBe('');
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}, 180_000);
