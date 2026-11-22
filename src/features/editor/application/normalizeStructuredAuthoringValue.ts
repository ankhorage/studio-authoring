import {
  deleteOwnProperty,
  isRecord,
  readOwnProperty,
  setOwnProperty,
} from '@ankhorage/utility/object';

import type { AuthoringStructure } from '../model.js';
import { resolveAuthoringUnion } from '../utils/resolveAuthoringUnion.js';

/*** Normalize known owner structure recursively while preserving unknown sibling fields. */
export function normalizeStructuredAuthoringValue(
  structure: AuthoringStructure,
  value: unknown,
  pruneEmptyOverrides: boolean,
): unknown {
  if (!isRecord(value)) return value;
  if (structure.kind === 'union') {
    const resolved = resolveAuthoringUnion(structure, value, []);
    return resolved.ok && resolved.selected
      ? normalizeStructuredAuthoringValue(resolved.selected.structure, value, pruneEmptyOverrides)
      : value;
  }
  if (structure.kind === 'object') return normalizeObject(structure, value, pruneEmptyOverrides);
  if (structure.kind === 'entity-registry')
    return normalizeCollection(structure.value, value, pruneEmptyOverrides, false);
  if (structure.kind === 'value-map')
    return normalizeCollection(structure.value, value, pruneEmptyOverrides, true);
  return value;
}

/*** Normalize fixed object fields and prune empty optional override containers. */
function normalizeObject(
  structure: Extract<AuthoringStructure, { readonly kind: 'object' }>,
  value: Readonly<Record<string, unknown>>,
  pruneEmptyOverrides: boolean,
): Readonly<Record<string, unknown>> {
  const normalized = { ...value };
  for (const field of structure.fields) {
    const current = readOwnProperty<unknown>(normalized, field.name);
    if (current === undefined) continue;
    const next = normalizeStructuredAuthoringValue(field.structure, current, pruneEmptyOverrides);
    if (pruneEmptyOverrides && field.optional && isEmptyRecord(next)) {
      deleteOwnProperty(normalized, field.name);
    } else {
      setOwnProperty(normalized, field.name, next);
    }
  }
  return normalized;
}

/*** Normalize keyed values while pruning empty map overrides but never deleting stable entities. */
function normalizeCollection(
  valueStructure: AuthoringStructure,
  value: Readonly<Record<string, unknown>>,
  pruneEmptyOverrides: boolean,
  pruneEntries: boolean,
): Readonly<Record<string, unknown>> {
  const normalized: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    const next = normalizeStructuredAuthoringValue(valueStructure, current, pruneEmptyOverrides);
    if (pruneEntries && pruneEmptyOverrides && shouldPruneEmptyMapValue(valueStructure, next))
      continue;
    setOwnProperty(normalized, key, next);
  }
  return normalized;
}

/*** Remove empty object-valued map entries when every owner field is optional override state. */
function shouldPruneEmptyMapValue(structure: AuthoringStructure, value: unknown): boolean {
  return (
    isEmptyRecord(value) &&
    structure.kind === 'object' &&
    structure.fields.every((field) => field.optional)
  );
}

/*** Return whether a runtime value is an empty record. */
function isEmptyRecord(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 0;
}
