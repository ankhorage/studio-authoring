import type { AuthoringNode, AuthoringPrimitive } from '../model.js';

/*** Encode a primitive choice into a stable Select value without losing its runtime type. */
export function encodeChoiceValue(value: AuthoringPrimitive): string {
  return `${typeof value}:${JSON.stringify(value)}`;
}

/*** Format one supported authored node for read-only presentation. */
export function formatAuthoringNodeValue(
  model: Exclude<AuthoringNode, { readonly kind: 'object' | 'unsupported' }>,
): string {
  if (model.kind === 'value-map' || model.kind === 'entity-registry')
    return model.entries.length > 0
      ? model.entries.map((entry) => entry.key).join(', ')
      : 'Not set';
  if (model.kind === 'union')
    return model.selected === undefined ? 'Not set' : String(model.selected);
  if (model.kind === 'set')
    return model.selected.length > 0 ? model.selected.join(', ') : 'Not set';
  if (model.kind === 'ordered-list')
    return model.items.length > 0 ? model.items.map(String).join(', ') : 'Not set';
  if (model.value === undefined) return 'Not set';
  return model.value === null ? 'null' : String(model.value);
}
