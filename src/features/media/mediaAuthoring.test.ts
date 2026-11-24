import type { AppManifest, MediaAsset } from '@ankhorage/contracts';
import { describe, expect, test } from 'bun:test';

import {
  collectMediaAssetUsages,
  createMediaAssetId,
  createMediaAssetReference,
  createUrlMediaAsset,
  listMediaAssets,
  readMediaAssetReference,
  removeMediaAsset,
  upsertMediaAsset,
} from './mediaAuthoring.js';

const imageAsset: MediaAsset = {
  id: 'hero',
  name: 'Hero',
  kind: 'image',
  source: { kind: 'url', url: 'https://example.com/hero.png' },
};

const baseManifest: AppManifest = {
  metadata: {
    name: 'Media Test',
    slug: 'media-test',
    version: '1.0.0',
    category: 'developer_tools',
    themeId: 'default',
  },
  settings: { localization: { defaultLocale: 'en', locales: ['en'] } },
  infra: {
    environments: {
      local: { deployment: { compute: { provider: 'local' }, runtime: { provider: 'minikube' } } },
    },
    modules: {},
  },
  navigator: {
    type: 'stack',
    initialRouteName: 'Home',
    routes: [{ name: 'Home', screenId: 'home' }],
  },
  screens: {
    home: {
      id: 'home',
      name: 'Home',
      root: {
        id: 'root',
        type: 'Screen',
        children: [{ id: 'image', type: 'Image', props: { source: { mediaId: 'hero' } } }],
      },
    },
  },
  themes: {
    default: {
      id: 'default',
      name: 'Default',
      light: { primaryColor: '#3366ff', harmony: 'analogous' },
      dark: { primaryColor: '#6699ff', harmony: 'analogous' },
    },
  },
  activeThemeId: 'default',
};

const unusedManifest: AppManifest = {
  ...baseManifest,
  screens: { home: { id: 'home', name: 'Home', root: { id: 'root', type: 'Screen' } } },
};

describe('media authoring asset construction', () => {
  test('lists app-authoring media independently of runtime user storage', () => {
    const manifest = upsertMediaAsset(baseManifest, imageAsset);
    expect(listMediaAssets(manifest)).toEqual([imageAsset]);
    expect(listMediaAssets(manifest, ['audio'])).toEqual([]);
  });

  test('creates exact canonical media references', () => {
    expect(createMediaAssetReference('hero')).toEqual({ mediaId: 'hero' });
    expect(readMediaAssetReference({ mediaId: 'hero' })).toEqual({ mediaId: 'hero' });
    expect(readMediaAssetReference({ mediaId: 'hero', uri: 'blob:preview' })).toBeNull();
  });

  test('creates collision-safe stable media ids', () => {
    expect(createMediaAssetId('Hero image')).toBe('hero-image');
    expect(createMediaAssetId('Hero image', { 'hero-image': imageAsset })).toBe('hero-image-2');
  });

  test('accepts stable HTTP URLs and rejects transient or credential-bearing URLs', () => {
    expect(
      createUrlMediaAsset({
        id: 'hero',
        name: 'Hero',
        kind: 'image',
        url: 'https://example.com/a.png',
      }),
    ).toMatchObject({ ok: true, asset: { source: { kind: 'url' } } });
    for (const url of [
      'blob:https://example.com/preview',
      'file:///tmp/a.png',
      'content://media/1',
      'data:image/png;base64,abc',
      'https://user:secret@example.com/a.png',
    ]) {
      expect(createUrlMediaAsset({ id: 'x', name: 'X', kind: 'image', url })).toEqual({
        ok: false,
        error: 'invalid-url',
      });
    }
  });
});

describe('media authoring safe removal', () => {
  test('finds nested component-property usage before deletion', () => {
    const manifest = upsertMediaAsset(baseManifest, imageAsset);
    expect(collectMediaAssetUsages(manifest, 'hero')).toEqual([
      { screenId: 'home', nodeId: 'image', propertyPath: 'source' },
    ]);
    expect(removeMediaAsset(manifest, 'hero')).toEqual({
      ok: false,
      reason: 'in-use',
      usages: [{ screenId: 'home', nodeId: 'image', propertyPath: 'source' }],
    });
  });

  test('removes unused media and drops the empty media registry', () => {
    const result = removeMediaAsset(upsertMediaAsset(unusedManifest, imageAsset), 'hero');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.manifest.media).toBeUndefined();
  });
});
