import type { AppManifest } from '@ankhorage/contracts';
import { expect, test } from 'bun:test';

import {
  beginManifestDraftSave,
  completeManifestDraftSave,
  createManifestDraftState,
  type ManifestDraftPort,
  readManifestDraft,
  resolveManifestDraftConflict,
  rollbackManifestDraft,
  saveManifestDraft,
  updateManifestDraft,
} from './manifestDraft.js';

const manifest = {
  metadata: {
    name: 'Demo',
    slug: 'demo',
    version: '1.0.0',
    category: 'business_productivity',
    themeId: 'theme',
  },
  themes: {},
  activeThemeId: 'theme',
  infra: {},
  navigator: {},
  screens: {},
  settings: {},
} as AppManifest;

test('an editor change becomes dirty and saves only after host acknowledgement', () => {
  const saved = createManifestDraftState({ manifest, revision: 'r1' });
  const dirty = updateManifestDraft(saved, (current) => ({
    ...current,
    metadata: { ...current.metadata, name: 'Renamed' },
  }));
  const saving = beginManifestDraftSave(dirty);

  expect(dirty.status).toBe('dirty');
  expect(saving).toMatchObject({ status: 'saving', pending: { revision: 'r1' } });
  expect(
    completeManifestDraftSave(saving, {
      kind: 'saved',
      snapshot: { manifest: saving.manifest, revision: 'r2' },
    }),
  ).toMatchObject({ status: 'saved', saved: { revision: 'r2' } });
});

test('a rejected save keeps the draft and rollback restores only the last saved revision', () => {
  const dirty = updateManifestDraft(
    createManifestDraftState({ manifest, revision: 'r1' }),
    (current) => ({
      ...current,
      metadata: { ...current.metadata, name: 'Renamed' },
    }),
  );
  const rejected = completeManifestDraftSave(beginManifestDraftSave(dirty), {
    kind: 'error',
    error: { code: 'forbidden', message: 'Save permission denied.' },
  });

  expect(rejected).toMatchObject({
    status: 'error',
    manifest: { metadata: { name: 'Renamed' } },
    saved: { revision: 'r1', manifest: { metadata: { name: 'Demo' } } },
  });
  expect(rollbackManifestDraft(rejected)).toMatchObject({
    status: 'saved',
    manifest: { metadata: { name: 'Demo' } },
  });
});

test('a revision conflict can reload the owner snapshot or retain the local draft for retry', () => {
  const dirty = updateManifestDraft(
    createManifestDraftState({ manifest, revision: 'r1' }),
    (current) => ({
      ...current,
      metadata: { ...current.metadata, name: 'Local name' },
    }),
  );
  const conflict = completeManifestDraftSave(beginManifestDraftSave(dirty), {
    kind: 'conflict',
    snapshot: {
      manifest: { ...manifest, metadata: { ...manifest.metadata, name: 'Owner name' } },
      revision: 'r2',
    },
  });

  expect(resolveManifestDraftConflict(conflict, 'reload')).toMatchObject({
    status: 'saved',
    manifest: { metadata: { name: 'Owner name' } },
  });
  expect(resolveManifestDraftConflict(conflict, 'keep-local')).toMatchObject({
    status: 'dirty',
    manifest: { metadata: { name: 'Local name' } },
    saved: { revision: 'r2' },
  });
});

test('a rejected read never becomes a fake saved state', async () => {
  const port: ManifestDraftPort = {
    read: () =>
      Promise.resolve({
        kind: 'error',
        error: { code: 'forbidden', message: 'Read permission denied.' },
      }),
    save: () =>
      Promise.resolve({
        kind: 'error',
        error: { code: 'forbidden', message: 'Save permission denied.' },
      }),
  };

  expect(await readManifestDraft(port)).toEqual({
    status: 'error',
    error: { code: 'forbidden', message: 'Read permission denied.' },
  });
});

test('a throwing host save becomes a visible error rather than a fake saved state', async () => {
  const port: ManifestDraftPort = {
    read: () => Promise.resolve({ kind: 'saved', snapshot: { manifest, revision: 'r1' } }),
    save: () => Promise.reject(new Error('Connection lost.')),
  };
  const dirty = updateManifestDraft(
    createManifestDraftState({ manifest, revision: 'r1' }),
    (current) => ({
      ...current,
      metadata: { ...current.metadata, name: 'Renamed' },
    }),
  );

  expect(await saveManifestDraft(dirty, port)).toMatchObject({
    status: 'error',
    error: { code: 'save-failed', message: 'Connection lost.' },
  });
});
