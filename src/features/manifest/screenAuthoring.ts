import type {
  AppManifest,
  ScreenMetadataSpec,
  ScreenRequirements,
} from "@ankhorage/contracts";

/*** Update one screen's metadata without changing its identity, UI tree, or route ownership. */
export function updateScreenMetadata<
  TManifest extends Pick<AppManifest, "screens">,
>(
  manifest: TManifest,
  screenId: string,
  metadata: ScreenMetadataSpec,
): { readonly ok: boolean; readonly manifest: TManifest } {
  const screen = manifest.screens[screenId];
  if (!screen || screen.id !== screenId || metadata.id !== screenId)
    return { ok: false, manifest };
  const {
    title: _title,
    description: _description,
    ...withoutMetadata
  } = screen;
  const nextScreen = {
    ...withoutMetadata,
    id: metadata.id,
    name: metadata.name,
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    ...(metadata.description === undefined
      ? {}
      : { description: metadata.description }),
  };
  return {
    ok: true,
    manifest: {
      ...manifest,
      screens: { ...manifest.screens, [screenId]: nextScreen },
    },
  };
}

/*** Update one screen's explicit requirements and omit empty requirement families. */
export function updateScreenRequirements<
  TManifest extends Pick<AppManifest, "screens">,
>(
  manifest: TManifest,
  screenId: string,
  requirements: ScreenRequirements | undefined,
): { readonly ok: boolean; readonly manifest: TManifest } {
  const screen = manifest.screens[screenId];
  if (!screen || screen.id !== screenId) return { ok: false, manifest };
  const { requires: _requires, ...withoutRequirements } = screen;
  const normalized = normalizeRequirements(requirements);
  const nextScreen = {
    ...withoutRequirements,
    ...(normalized ? { requires: normalized } : {}),
  };
  return {
    ok: true,
    manifest: {
      ...manifest,
      screens: { ...manifest.screens, [screenId]: nextScreen },
    },
  };
}

/*** Remove empty requirement families so the portable manifest stays canonical. */
function normalizeRequirements(
  requirements: ScreenRequirements | undefined,
): ScreenRequirements | undefined {
  if (!requirements) return undefined;
  const permissions =
    requirements.permissions && Object.keys(requirements.permissions).length > 0
      ? requirements.permissions
      : undefined;
  const capabilities =
    requirements.capabilities &&
    Object.keys(requirements.capabilities).length > 0
      ? requirements.capabilities
      : undefined;
  return permissions || capabilities
    ? {
        ...(permissions ? { permissions } : {}),
        ...(capabilities ? { capabilities } : {}),
      }
    : undefined;
}
