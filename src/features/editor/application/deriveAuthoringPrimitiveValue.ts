import { isRecord } from '@ankhorage/utility/object';

import type {
  AuthoringDiagnostic,
  AuthoringPrimitive,
  AuthoringScalarType,
  AuthoringStructure,
} from '../model.js';

type PrimitiveResult =
  | { readonly ok: true; readonly value: AuthoringPrimitive | undefined }
  | { readonly ok: false; readonly diagnostic: AuthoringDiagnostic };
type SetResult =
  | { readonly ok: true; readonly values: readonly string[]; readonly selected: readonly string[] }
  | { readonly ok: false; readonly diagnostic: AuthoringDiagnostic };

/*** Read and validate one scalar runtime value against its portable structural type. */
export function readScalarValue(
  scalarType: AuthoringScalarType,
  value: unknown,
  optional: boolean,
): PrimitiveResult {
  if (value === undefined && optional) return { ok: true, value: undefined };
  return isScalarTypeValue(scalarType, value)
    ? { ok: true, value }
    : invalid(`Expected ${scalarType} authoring value.`);
}

/*** Read one finite-choice value without coercing values outside the descriptor options. */
export function readChoiceValue(
  values: readonly AuthoringPrimitive[],
  value: unknown,
  optional: boolean,
): PrimitiveResult {
  if (value === undefined && optional) return { ok: true, value: undefined };
  return values.some((candidate) => Object.is(candidate, value))
    ? { ok: true, value: value as AuthoringPrimitive }
    : invalid('Authored value is not one of the finite descriptor choices.');
}

/*** Validate canonical unordered string membership against finite owner-provided choices. */
export function readSetValue(
  member: AuthoringStructure,
  value: unknown,
  optional: boolean,
): SetResult {
  if (
    member.kind !== 'choice' ||
    !member.values.every((candidate) => typeof candidate === 'string')
  )
    return unsupported('Set authoring requires finite string member choices.');
  if (value === undefined && optional) return { ok: true, values: member.values, selected: [] };
  if (!isRecord(value)) return invalid('Expected serializable set membership object.');
  const entries = Object.entries(value);
  const invalidMember = entries.find(
    ([key, memberValue]) => memberValue !== true || !member.values.includes(key),
  );
  if (invalidMember) return invalid(`Invalid set member "${invalidMember[0]}".`);
  const selected = new Set(entries.map(([key]) => key));
  return {
    ok: true,
    values: member.values,
    selected: member.values.filter((candidate) => selected.has(candidate)),
  };
}

/*** Decide whether one unknown runtime value satisfies a scalar descriptor type. */
function isScalarTypeValue(
  scalarType: AuthoringScalarType,
  value: unknown,
): value is AuthoringPrimitive {
  switch (scalarType) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
      return typeof value === 'string';
  }
}

/*** Create one invalid runtime-value diagnostic. */
function invalid(message: string): {
  readonly ok: false;
  readonly diagnostic: AuthoringDiagnostic;
} {
  return { ok: false, diagnostic: { code: 'invalid-value', message, path: [] } };
}

/*** Create one unsupported-structure diagnostic. */
function unsupported(message: string): {
  readonly ok: false;
  readonly diagnostic: AuthoringDiagnostic;
} {
  return { ok: false, diagnostic: { code: 'unsupported-structure', message, path: [] } };
}
