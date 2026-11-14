import type { AppManifest } from '@ankhorage/contracts';

/** Identify the immutable persisted revision from which a manifest was read. */
export type ManifestRevision = string;

/** Carry a manifest together with the persisted revision that owns it. */
export interface ManifestDraftSnapshot<TManifest extends AppManifest = AppManifest> {
  readonly manifest: TManifest;
  readonly revision: ManifestRevision;
}

/** Describe a host refusal without giving the authoring core persistence ownership. */
export interface ManifestDraftFailure {
  readonly code: string;
  readonly message: string;
}

/** Declare the host operations required by portable manifest authoring. */
export interface ManifestDraftPort<TManifest extends AppManifest = AppManifest> {
  read(): Promise<ManifestDraftReadResult<TManifest>>;
  save(snapshot: ManifestDraftSnapshot<TManifest>): Promise<ManifestDraftSaveResult<TManifest>>;
}

/** Return a persisted manifest or an explicit host refusal when reading a draft. */
export type ManifestDraftReadResult<TManifest extends AppManifest = AppManifest> =
  | { readonly kind: 'saved'; readonly snapshot: ManifestDraftSnapshot<TManifest> }
  | { readonly kind: 'error'; readonly error: ManifestDraftFailure };

/** Return an acknowledged revision, refusal, or the newer revision that caused a conflict. */
export type ManifestDraftSaveResult<TManifest extends AppManifest = AppManifest> =
  | { readonly kind: 'saved'; readonly snapshot: ManifestDraftSnapshot<TManifest> }
  | { readonly kind: 'error'; readonly error: ManifestDraftFailure }
  | { readonly kind: 'conflict'; readonly snapshot: ManifestDraftSnapshot<TManifest> };

interface ManifestDraftBase<TManifest extends AppManifest> {
  readonly manifest: TManifest;
  readonly saved: ManifestDraftSnapshot<TManifest>;
}

/** Model the complete portable edit and persistence interaction state. */
export type ManifestDraftState<TManifest extends AppManifest = AppManifest> =
  | (ManifestDraftBase<TManifest> & { readonly status: 'saved' })
  | (ManifestDraftBase<TManifest> & { readonly status: 'dirty' })
  | (ManifestDraftBase<TManifest> & {
      readonly status: 'saving';
      readonly pending: ManifestDraftSnapshot<TManifest>;
    })
  | (ManifestDraftBase<TManifest> & {
      readonly status: 'error';
      readonly error: ManifestDraftFailure;
    })
  | (ManifestDraftBase<TManifest> & {
      readonly status: 'conflict';
      readonly conflict: ManifestDraftSnapshot<TManifest>;
    });

/** Select the deliberate outcome for a persisted revision conflict. */
export type ManifestDraftConflictResolution = 'reload' | 'keep-local';

/** Read the initial authoring state without treating a rejected read as a saved manifest. */
export async function readManifestDraft<TManifest extends AppManifest>(
  port: ManifestDraftPort<TManifest>,
): Promise<
  ManifestDraftState<TManifest> | { readonly status: 'error'; readonly error: ManifestDraftFailure }
> {
  try {
    const result = await port.read();
    return result.kind === 'saved'
      ? createManifestDraftState(result.snapshot)
      : { status: 'error', error: result.error };
  } catch (error) {
    return { status: 'error', error: toManifestDraftFailure('read-failed', error) };
  }
}

/** Create a saved state only from a snapshot acknowledged by the persistence owner. */
export function createManifestDraftState<TManifest extends AppManifest>(
  snapshot: ManifestDraftSnapshot<TManifest>,
): ManifestDraftState<TManifest> {
  return { status: 'saved', manifest: snapshot.manifest, saved: snapshot };
}

/** Apply an editor-owned immutable change while retaining the last persisted revision for rollback. */
export function updateManifestDraft<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
  update: (manifest: TManifest) => TManifest,
): ManifestDraftState<TManifest> {
  if (state.status === 'saving') return state;
  const manifest = update(state.manifest);
  if (manifest === state.manifest) return state;
  return { status: 'dirty', manifest, saved: state.saved };
}

/** Begin a host save only for a local change; saved, conflicted, and in-flight drafts are unchanged. */
export function beginManifestDraftSave<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
): ManifestDraftState<TManifest> {
  if (state.status !== 'dirty' && state.status !== 'error') return state;
  return {
    status: 'saving',
    manifest: state.manifest,
    saved: state.saved,
    pending: { manifest: state.manifest, revision: state.saved.revision },
  };
}

/** Apply the host's explicit persistence result without manufacturing a save acknowledgement. */
export function completeManifestDraftSave<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
  result: ManifestDraftSaveResult<TManifest>,
): ManifestDraftState<TManifest> {
  if (state.status !== 'saving') return state;
  if (result.kind === 'saved') return createManifestDraftState(result.snapshot);
  if (result.kind === 'conflict') {
    return {
      status: 'conflict',
      manifest: state.manifest,
      saved: state.saved,
      conflict: result.snapshot,
    };
  }
  return { status: 'error', manifest: state.manifest, saved: state.saved, error: result.error };
}

/** Invoke the host save port and preserve an error state if it rejects or throws. */
export async function saveManifestDraft<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
  port: ManifestDraftPort<TManifest>,
): Promise<ManifestDraftState<TManifest>> {
  const saving = beginManifestDraftSave(state);
  if (saving.status !== 'saving') return saving;
  try {
    return completeManifestDraftSave(saving, await port.save(saving.pending));
  } catch (error) {
    return completeManifestDraftSave(saving, {
      kind: 'error',
      error: toManifestDraftFailure('save-failed', error),
    });
  }
}

/** Restore the last persistence-confirmed manifest without mutating the saved snapshot. */
export function rollbackManifestDraft<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
): ManifestDraftState<TManifest> {
  if (state.status === 'saving') return state;
  return createManifestDraftState(state.saved);
}

/** Either reload the conflicting revision or retain the local draft for an explicit retry. */
export function resolveManifestDraftConflict<TManifest extends AppManifest>(
  state: ManifestDraftState<TManifest>,
  resolution: ManifestDraftConflictResolution,
): ManifestDraftState<TManifest> {
  if (state.status !== 'conflict') return state;
  return resolution === 'reload'
    ? createManifestDraftState(state.conflict)
    : { status: 'dirty', manifest: state.manifest, saved: state.conflict };
}

/** Normalize an unexpected host exception into a visible, retryable authoring failure. */
function toManifestDraftFailure(code: string, error: unknown): ManifestDraftFailure {
  return {
    code,
    message: error instanceof Error && error.message ? error.message : 'Manifest operation failed.',
  };
}
