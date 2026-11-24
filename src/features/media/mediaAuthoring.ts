import type {
  AppManifest,
  MediaAsset,
  MediaAssetKind,
  MediaAssetReference,
  MediaAssetRegistry,
  UiNode,
} from '@ankhorage/contracts';
import { filterAndSort } from '@ankhorage/utility/array';
import { deleteOwnProperty, readOwnProperty, withOwnProperty } from '@ankhorage/utility/object';
import { slugifyAscii } from '@ankhorage/utility/string';
import { normalizeCredentialFreeHttpUrl } from '@ankhorage/utility/url';

/*** Identify one manifest property that references an authored media asset. */
export interface MediaAssetUsage {
  readonly screenId: string;
  readonly nodeId: string;
  readonly propertyPath: string;
}

/*** Describe the result of attempting to remove one authored media asset. */
export type MediaAssetRemovalResult =
  | { readonly ok: true; readonly manifest: AppManifest }
  | {
      readonly ok: false;
      readonly reason: 'not-found' | 'in-use';
      readonly usages: readonly MediaAssetUsage[];
    };

/*** Describe URL-media validation and construction. */
export type UrlMediaAssetResult =
  | { readonly ok: true; readonly asset: MediaAsset }
  | { readonly ok: false; readonly error: 'invalid-url' };

/*** List manifest media assets, optionally filter by kind, and sort them by name. */
export function listMediaAssets(
  manifest: AppManifest,
  mediaKinds?: readonly MediaAssetKind[],
): readonly MediaAsset[] {
  const assets = Object.values(manifest.media?.assets ?? {});
  return filterAndSort(
    assets,
    (asset) => !mediaKinds?.length || mediaKinds.includes(asset.kind),
    (left, right) => left.name.localeCompare(right.name),
  );
}

/*** Create the canonical media-reference object for one media id. */
export function createMediaAssetReference(mediaId: string): MediaAssetReference {
  return { mediaId };
}

/*** Parse an unknown value as an exact one-key media-reference object. */
export function readMediaAssetReference(value: unknown): MediaAssetReference | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== 1 || keys.at(0) !== 'mediaId') return null;
  const { mediaId } = value as { readonly mediaId?: unknown };
  return typeof mediaId === 'string' && mediaId.length > 0 ? { mediaId } : null;
}

/*** Create a unique slug-like media id from a name and an existing keyed registry. */
export function createMediaAssetId(name: string, registry: MediaAssetRegistry = {}): string {
  const base = slugifyAscii(name) || 'media';
  if (!readOwnProperty<MediaAsset>(registry, base)) return base;
  let suffix = 2;
  while (readOwnProperty<MediaAsset>(registry, `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/*** Create a URL-backed media asset after validating and normalizing its HTTP URL. */
export function createUrlMediaAsset(args: {
  readonly id: string;
  readonly name: string;
  readonly kind: MediaAssetKind;
  readonly url: string;
}): UrlMediaAssetResult {
  const url = normalizeCredentialFreeHttpUrl(args.url);
  if (!url) return { ok: false, error: 'invalid-url' };
  return {
    ok: true,
    asset: {
      id: args.id,
      name: args.name.trim() || args.id,
      kind: args.kind,
      source: { kind: 'url', url },
    },
  };
}

/*** Immutably insert or replace a keyed media asset in a manifest registry. */
export function upsertMediaAsset(manifest: AppManifest, asset: MediaAsset): AppManifest {
  return {
    ...manifest,
    media: { assets: withOwnProperty(manifest.media?.assets ?? {}, asset.id, asset) },
  };
}

/*** Collect every node-property usage of one media asset across all manifest screens. */
export function collectMediaAssetUsages(
  manifest: AppManifest,
  mediaId: string,
): readonly MediaAssetUsage[] {
  const usages: MediaAssetUsage[] = [];
  for (const [screenId, screen] of Object.entries(manifest.screens)) {
    collectNodeUsages(screenId, screen.root, mediaId, usages);
  }
  return usages;
}

/*** Remove an unused media asset and reject removal when the asset is missing or referenced. */
export function removeMediaAsset(manifest: AppManifest, mediaId: string): MediaAssetRemovalResult {
  if (!manifest.media || !readOwnProperty<MediaAsset>(manifest.media.assets, mediaId)) {
    return { ok: false, reason: 'not-found', usages: [] };
  }
  const usages = collectMediaAssetUsages(manifest, mediaId);
  if (usages.length > 0) return { ok: false, reason: 'in-use', usages };

  const nextAssets = { ...manifest.media.assets };
  deleteOwnProperty(nextAssets, mediaId);
  if (Object.keys(nextAssets).length > 0) {
    return { ok: true, manifest: { ...manifest, media: { assets: nextAssets } } };
  }
  const nextManifest = { ...manifest };
  delete nextManifest.media;
  return { ok: true, manifest: nextManifest };
}

/*** Recursively inspect every property in one authored UI node tree for media references. */
function collectNodeUsages(
  screenId: string,
  node: UiNode,
  mediaId: string,
  usages: MediaAssetUsage[],
): void {
  for (const [propertyName, value] of Object.entries(node.props ?? {})) {
    collectValueUsages(screenId, node.id, mediaId, value, propertyName, usages);
  }
  for (const child of node.children ?? []) collectNodeUsages(screenId, child, mediaId, usages);
}

/*** Walk nested arrays and records while carrying a property path for matching media references. */
function collectValueUsages(
  screenId: string,
  nodeId: string,
  mediaId: string,
  value: unknown,
  propertyPath: string,
  usages: MediaAssetUsage[],
): void {
  const reference = readMediaAssetReference(value);
  if (reference) {
    if (reference.mediaId === mediaId) usages.push({ screenId, nodeId, propertyPath });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectValueUsages(screenId, nodeId, mediaId, entry, `${propertyPath}.${index}`, usages),
    );
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, entry] of Object.entries(value)) {
    collectValueUsages(screenId, nodeId, mediaId, entry, `${propertyPath}.${key}`, usages);
  }
}
