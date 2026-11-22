import { isRecord, readOwnProperty } from '@ankhorage/utility/object';

import type {
  AuthoringCollectionKey,
  AuthoringDiagnostic,
  AuthoringOrderedListItem,
  AuthoringPrimitive,
  AuthoringStructure,
  AuthoringValueMapKey,
} from '../model.js';
import { isAuthoringCollectionKeyAllowed } from '../utils/isAuthoringCollectionKeyAllowed.js';
import { resolveAuthoringCollectionKey } from '../utils/resolveAuthoringCollectionKey.js';

type MapResult =
  | {
      readonly ok: true;
      readonly key: AuthoringValueMapKey;
      readonly entries: readonly (readonly [string, unknown])[];
    }
  | { readonly ok: false; readonly diagnostic: AuthoringDiagnostic };
type RegistryResult =
  | {
      readonly ok: true;
      readonly key: AuthoringCollectionKey;
      readonly entries: readonly (readonly [string, unknown])[];
    }
  | { readonly ok: false; readonly diagnostic: AuthoringDiagnostic };
type ListResult =
  | {
      readonly ok: true;
      readonly item: AuthoringOrderedListItem;
      readonly items: readonly AuthoringPrimitive[];
    }
  | { readonly ok: false; readonly diagnostic: AuthoringDiagnostic };

/*** Validate keyed value-map state while keeping key identity distinct from collection order. */
export function readValueMapValue(
  keyStructure: AuthoringStructure,
  value: unknown,
  optional: boolean,
): MapResult {
  const key = resolveAuthoringCollectionKey(keyStructure);
  if (!key)
    return unsupported(
      'Value-map authoring requires scalar-string or finite-string-choice keys.',
      [],
    );
  if (value === undefined && optional) return { ok: true, key, entries: [] };
  if (!isRecord(value)) return invalid('Expected value-map object.', []);
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const invalidKey = entries.find(
    ([candidate]) => !isAuthoringCollectionKeyAllowed(key, candidate),
  );
  return invalidKey
    ? invalid(`Invalid value-map key "${invalidKey[0]}".`, [])
    : { ok: true, key, entries };
}

/*** Validate one stable entity registry without assigning semantic meaning to record order. */
export function readEntityRegistryValue(
  keyStructure: AuthoringStructure,
  identityField: string | undefined,
  value: unknown,
  optional: boolean,
  path: readonly string[],
): RegistryResult {
  const key = resolveAuthoringCollectionKey(keyStructure);
  if (!key)
    return unsupported(
      'Entity-registry authoring requires scalar-string or finite-string-choice keys.',
      path,
    );
  if (value === undefined && optional) return { ok: true, key, entries: [] };
  if (!isRecord(value)) return invalid('Expected entity-registry object.', path);
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  for (const [entryKey, entryValue] of entries) {
    if (!isAuthoringCollectionKeyAllowed(key, entryKey))
      return invalid(`Invalid entity-registry key "${entryKey}".`, path);
    if (
      identityField !== undefined &&
      (!isRecord(entryValue) || readOwnProperty<unknown>(entryValue, identityField) !== entryKey)
    )
      return invalid(
        isRecord(entryValue)
          ? `Entity-registry key must match owner identity field "${identityField}".`
          : 'Entity-registry identity requires object values.',
        isRecord(entryValue) ? [...path, entryKey, identityField] : path,
      );
  }
  return { ok: true, key, entries };
}

/*** Validate one ordered primitive list while preserving authored order and duplicates. */
export function readOrderedListValue(
  item: AuthoringStructure,
  value: unknown,
  optional: boolean,
): ListResult {
  if (item.kind === 'choice') return readChoiceList(item.values, value, optional);
  if (item.kind === 'scalar' && item.scalarType === 'string')
    return readStringList(value, optional);
  return unsupported(
    'Ordered-list authoring supports finite primitive choices or scalar string items.',
    [],
  );
}

/*** Validate one finite-choice ordered list. */
function readChoiceList(
  values: readonly AuthoringPrimitive[],
  value: unknown,
  optional: boolean,
): ListResult {
  if (value === undefined && optional)
    return { ok: true, item: { kind: 'choice', values }, items: [] };
  if (!Array.isArray(value)) return invalid('Expected ordered-list array value.', []);
  return value.some((candidate) => !values.some((allowed) => Object.is(allowed, candidate)))
    ? invalid('Ordered-list item is not one of the finite descriptor choices.', [])
    : { ok: true, item: { kind: 'choice', values }, items: value };
}

/*** Validate one open scalar-string ordered list. */
function readStringList(value: unknown, optional: boolean): ListResult {
  if (value === undefined && optional)
    return { ok: true, item: { kind: 'scalar', scalarType: 'string' }, items: [] };
  if (!Array.isArray(value)) return invalid('Expected ordered-list array value.', []);
  return value.every((candidate) => typeof candidate === 'string')
    ? { ok: true, item: { kind: 'scalar', scalarType: 'string' }, items: value }
    : invalid('Ordered-list item must be a string.', []);
}

/*** Create one invalid runtime-value diagnostic at a precise path. */
function invalid(
  message: string,
  path: readonly string[],
): { readonly ok: false; readonly diagnostic: AuthoringDiagnostic } {
  return { ok: false, diagnostic: { code: 'invalid-value', message, path } };
}
/*** Create one unsupported-structure diagnostic at a precise path. */
function unsupported(
  message: string,
  path: readonly string[],
): { readonly ok: false; readonly diagnostic: AuthoringDiagnostic } {
  return { ok: false, diagnostic: { code: 'unsupported-structure', message, path } };
}
