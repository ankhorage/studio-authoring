/*** Represent the two existing authoring interaction modes. */
export type AuthoringMode = "edit" | "preview";

/*** Describe the mode-control presentation without imposing a design-system component. */
export interface AuthoringModeAction {
  readonly label: "Edit" | "Preview";
  readonly mode: AuthoringMode;
  readonly selectionEnabled: boolean;
}

/*** Derive the behavior-preserving mode action used by the existing Studio toolbar. */
export function createAuthoringModeAction(
  mode: AuthoringMode,
): AuthoringModeAction {
  return mode === "preview"
    ? { label: "Edit", mode: "edit", selectionEnabled: false }
    : { label: "Preview", mode: "preview", selectionEnabled: true };
}
