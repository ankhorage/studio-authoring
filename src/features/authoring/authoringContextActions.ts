import type { InspectorTarget } from '../inspector/inspectorRoute.js';

/*** Describe one context-sensitive authoring action without selecting a UI renderer. */
export interface AuthoringContextAction {
  readonly id: InspectorTarget | 'insert' | 'delete' | 'selectParent' | 'clearSelection';
  readonly label: string;
}

/*** Supply the state needed to derive portable contextual authoring actions. */
export interface ResolveAuthoringContextActionsArgs {
  readonly mode: 'edit' | 'preview';
  readonly selectedNodeId: string | null;
  readonly parentNodeId: string | null;
  readonly canInsert: boolean;
  readonly canInsertInside: boolean;
  readonly canDelete: boolean;
}

/***
 * Derive the existing inspector and structural actions for a valid Edit selection.
 * Preview deliberately exposes none, so runtime interaction is not shadowed by authoring actions.
 */
export function resolveAuthoringContextActions(
  args: ResolveAuthoringContextActionsArgs,
): AuthoringContextAction[] {
  if (args.mode === 'preview' || !args.selectedNodeId) return [];

  const actions: AuthoringContextAction[] = [
    { id: 'properties', label: 'Properties' },
    { id: 'bindings', label: 'Bindings' },
  ];

  if (args.canInsert) {
    actions.push({ id: 'insert', label: args.canInsertInside ? 'Add child' : 'Insert' });
  }
  if (args.canDelete) actions.push({ id: 'delete', label: 'Delete' });
  if (args.parentNodeId) actions.push({ id: 'selectParent', label: 'Select parent' });

  actions.push({ id: 'clearSelection', label: 'Clear selection' });
  return actions;
}
