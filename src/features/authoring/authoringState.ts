/*** Represent the two existing authoring interaction modes. */
export type AuthoringMode = 'edit' | 'preview';

/*** Describe the mode-control presentation without imposing a design-system component. */
export interface AuthoringModeAction {
  readonly label: 'Edit' | 'Preview';
  readonly mode: AuthoringMode;
  readonly selectionEnabled: boolean;
}

/*** Describe the platform-neutral presentation of the Edit/Preview control. */
export interface AuthoringModeControl {
  readonly label: 'Edit' | 'Preview';
  readonly icon: { readonly name: 'create-outline' | 'eye-outline' };
  readonly color: 'neutral' | 'primary';
  readonly variant: 'ghost' | 'solid';
}

/*** Derive the behavior-preserving mode action used by the existing Studio toolbar. */
export function createAuthoringModeAction(mode: AuthoringMode): AuthoringModeAction {
  return mode === 'preview'
    ? { label: 'Edit', mode: 'edit', selectionEnabled: false }
    : { label: 'Preview', mode: 'preview', selectionEnabled: true };
}

/*** Resolve the existing reversible Edit/Preview control presentation for a UI adapter. */
export function resolveAuthoringModeControl(mode: AuthoringMode): AuthoringModeControl {
  return mode === 'preview'
    ? {
        label: 'Edit',
        icon: { name: 'create-outline' },
        color: 'primary',
        variant: 'solid',
      }
    : {
        label: 'Preview',
        icon: { name: 'eye-outline' },
        color: 'neutral',
        variant: 'ghost',
      };
}
