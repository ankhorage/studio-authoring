import type { AuthoringMode } from "../authoring/authoringState.js";

/*** Describe renderer-neutral runtime interaction policy for authoring overlays. */
export interface RuntimeOverlayState {
  readonly selectionEnabled: boolean;
  readonly suppressRuntimeActions: boolean;
  readonly showSelectionOverlay: boolean;
}

/*** Preserve Studio's edit/preview invariant at the runtime overlay boundary. */
export function createRuntimeOverlayState(
  mode: AuthoringMode,
): RuntimeOverlayState {
  const previewMode = mode === "preview";
  return {
    selectionEnabled: !previewMode,
    suppressRuntimeActions: !previewMode,
    showSelectionOverlay: !previewMode,
  };
}
