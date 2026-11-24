import { isRecord } from '@ankhorage/utility/object';

import type {
  AuthoringDiagnostic,
  AuthoringNode,
  AuthoringPresentationPolicy,
  AuthoringPrimitive,
  AuthoringStructure,
} from '../model.js';
import { resolveAuthoringUnion } from '../utils/resolveAuthoringUnion.js';
import {
  readEntityRegistryValue,
  readOrderedListValue,
  readValueMapValue,
} from './deriveAuthoringCollectionValue.js';
import { readChoiceValue, readScalarValue, readSetValue } from './deriveAuthoringPrimitiveValue.js';

export interface DeriveAuthoringNodeArgs {
  readonly structure: AuthoringStructure;
  readonly value: unknown;
  readonly policy?: AuthoringPresentationPolicy;
  readonly path: readonly string[];
  readonly label: string;
  readonly optional: boolean;
  readonly inheritedReadOnly: boolean;
}
type DeriveNode = (args: DeriveAuthoringNodeArgs) => AuthoringNode;
interface Base {
  readonly path: readonly string[];
  readonly label: string;
  readonly description?: string;
  readonly optional: boolean;
  readonly readOnly: boolean;
  readonly editor?: NonNullable<AuthoringPresentationPolicy['editor']>;
  readonly inheritance?: { readonly value?: AuthoringPrimitive; readonly overridden: boolean };
}

/*** Dispatch one structural node to its portable authoring-model derivation. */
export function deriveAuthoringNode(
  args: DeriveAuthoringNodeArgs,
  deriveNode: DeriveNode,
): AuthoringNode {
  const base = createBase(args);
  switch (args.structure.kind) {
    case 'scalar':
      return primitiveNode(args, base, 'scalar');
    case 'choice':
      return primitiveNode(args, base, 'choice');
    case 'set':
      return primitiveNode(args, base, 'set');
    case 'ordered-list':
      return orderedListNode(args, base);
    case 'value-map':
      return valueMapNode(args, base, deriveNode);
    case 'entity-registry':
      return registryNode(args, base, deriveNode);
    case 'union':
      return unionNode(args, base, deriveNode);
    case 'object':
      return objectNode(args, base, deriveNode);
    case 'unsupported':
      return unsupportedNode(base, args.structure.diagnostic);
  }
}

/*** Create the presentation fields shared by every derived model node. */
function createBase(args: DeriveAuthoringNodeArgs): Base {
  const readOnly = args.inheritedReadOnly || args.policy?.readOnly === true;
  return {
    path: args.path,
    label: args.policy?.label ?? args.label,
    optional: args.optional,
    readOnly,
    ...(args.policy?.description ? { description: args.policy.description } : {}),
    ...(args.policy?.editor ? { editor: args.policy.editor } : {}),
    ...(args.policy?.inheritance
      ? { inheritance: { ...args.policy.inheritance, overridden: args.value !== undefined } }
      : {}),
  };
}

/*** Derive scalar, choice, and set nodes only after their values validate. */
function primitiveNode(
  args: DeriveAuthoringNodeArgs,
  base: Base,
  kind: 'scalar' | 'choice' | 'set',
): AuthoringNode {
  if (kind === 'scalar' && args.structure.kind === 'scalar') {
    const value = readScalarValue(args.structure.scalarType, args.value, args.optional);
    return value.ok
      ? {
          ...base,
          kind,
          scalarType: args.structure.scalarType,
          value: value.value,
          multiline: args.policy?.multiline === true,
        }
      : unsupportedNode(base, value.diagnostic);
  }
  if (kind === 'choice' && args.structure.kind === 'choice') {
    const value = readChoiceValue(args.structure.values, args.value, args.optional);
    return value.ok
      ? { ...base, kind, values: args.structure.values, value: value.value }
      : unsupportedNode(base, value.diagnostic);
  }
  if (kind === 'set' && args.structure.kind === 'set') {
    const value = readSetValue(args.structure.member, args.value, args.optional);
    return value.ok
      ? { ...base, kind, values: value.values, selected: value.selected }
      : unsupportedNode(base, value.diagnostic);
  }
  throw new Error('Unexpected primitive structure.');
}

/*** Derive an ordered primitive list while retaining authored position and duplicates. */
function orderedListNode(args: DeriveAuthoringNodeArgs, base: Base): AuthoringNode {
  if (args.structure.kind !== 'ordered-list') throw new Error('Expected ordered-list structure.');
  const value = readOrderedListValue(args.structure.item, args.value, args.optional);
  return value.ok
    ? { ...base, kind: 'ordered-list', item: value.item, items: value.items }
    : unsupportedNode(base, value.diagnostic);
}

/*** Derive keyed map entries, including valid presentation-only inherited owner keys. */
function valueMapNode(
  args: DeriveAuthoringNodeArgs,
  base: Base,
  deriveNode: DeriveNode,
): AuthoringNode {
  if (args.structure.kind !== 'value-map') throw new Error('Expected value-map structure.');
  const valueStructure = args.structure.value;
  const value = readValueMapValue(args.structure.key, args.value, args.optional);
  if (!value.ok) return unsupportedNode(base, value.diagnostic);
  const fields = args.policy?.fields;
  const entries = mergeMapEntries(value.entries, fields, value.key).map(
    ([key, entryValue, authored]) => {
      const policy = fieldPolicy(fields, key);
      return {
        key,
        authored,
        value: deriveNode({
          structure: valueStructure,
          value: entryValue,
          policy,
          path: [...args.path, key],
          label: 'Value',
          optional: policy?.inheritance !== undefined,
          inheritedReadOnly: base.readOnly,
        }),
      };
    },
  );
  return { ...base, kind: 'value-map', key: value.key, valueStructure, entries };
}

/*** Derive stable entity records and make a configured duplicated identity immutable. */
function registryNode(
  args: DeriveAuthoringNodeArgs,
  base: Base,
  deriveNode: DeriveNode,
): AuthoringNode {
  if (args.structure.kind !== 'entity-registry')
    throw new Error('Expected entity-registry structure.');
  const { identityField, value: valueStructure } = args.structure;
  const value = readEntityRegistryValue(
    args.structure.key,
    identityField,
    args.value,
    args.optional,
    args.path,
  );
  if (!value.ok) return unsupportedNode(base, value.diagnostic);
  return {
    ...base,
    kind: 'entity-registry',
    key: value.key,
    valueStructure,
    ...(identityField === undefined ? {} : { identityField }),
    entries: value.entries.map(([key, entryValue]) => ({
      key,
      value: deriveNode({
        structure: valueStructure,
        value: entryValue,
        policy: identityPolicy(fieldPolicy(args.policy?.fields, key), identityField),
        path: [...args.path, key],
        label: key,
        optional: false,
        inheritedReadOnly: base.readOnly,
      }),
    })),
  };
}

/*** Derive the active discriminated-union variant without duplicating its selector field. */
function unionNode(
  args: DeriveAuthoringNodeArgs,
  base: Base,
  deriveNode: DeriveNode,
): AuthoringNode {
  if (args.structure.kind !== 'union') throw new Error('Expected union structure.');
  const resolved = resolveAuthoringUnion(args.structure, args.value, args.path);
  if (!resolved.ok) return unsupportedNode(base, resolved.diagnostic);
  return {
    ...base,
    kind: 'union',
    discriminator: resolved.discriminator,
    variants: resolved.variants,
    selected: resolved.selected?.value,
    authoredValue: isRecord(args.value) ? args.value : undefined,
    value:
      resolved.selected === undefined
        ? undefined
        : deriveNode({
            ...args,
            structure: withoutDiscriminator(resolved.selected.structure, resolved.discriminator),
            optional: false,
            inheritedReadOnly: base.readOnly,
          }),
  };
}

/*** Derive fixed object fields recursively after rejecting non-record values. */
function objectNode(
  args: DeriveAuthoringNodeArgs,
  base: Base,
  deriveNode: DeriveNode,
): AuthoringNode {
  if (args.structure.kind !== 'object') throw new Error('Expected object structure.');
  if (args.value !== undefined && !isRecord(args.value))
    return unsupportedNode(base, {
      code: 'invalid-value',
      message: `Expected object value at ${formatPath(args.path)}.`,
      path: args.path,
    });
  const record = isRecord(args.value) ? args.value : {};
  return {
    ...base,
    kind: 'object',
    fields: args.structure.fields.map((field) =>
      deriveNode({
        structure: field.structure,
        value: record[field.name],
        policy: args.policy?.fields?.[field.name],
        path: [...args.path, field.name],
        label: humanize(field.name),
        optional: field.optional,
        inheritedReadOnly: base.readOnly,
      }),
    ),
  };
}

/*** Resolve a field policy without arbitrary dynamic object indexing. */
function fieldPolicy(
  fields: Readonly<Record<string, AuthoringPresentationPolicy>> | undefined,
  key: string,
): AuthoringPresentationPolicy | undefined {
  return Object.entries(fields ?? {}).find(([name]) => name === key)?.[1];
}
/*** Merge authored map entries with valid presentation-only inherited entries. */
function mergeMapEntries(
  entries: readonly (readonly [string, unknown])[],
  fields: Readonly<Record<string, AuthoringPresentationPolicy>> | undefined,
  key:
    { readonly kind: 'scalar' } | { readonly kind: 'choice'; readonly values: readonly string[] },
) {
  const authored = new Set(entries.map(([entryKey]) => entryKey));
  const inherited = Object.keys(fields ?? {}).filter(
    (entryKey) =>
      !authored.has(entryKey) && (key.kind === 'scalar' || key.values.includes(entryKey)),
  );
  return [
    ...entries.map(([entryKey, value]) => [entryKey, value, true] as const),
    ...inherited.map((entryKey) => [entryKey, undefined, false] as const),
  ].sort(([left], [right]) => left.localeCompare(right));
}
/*** Keep a configured entity identity immutable inside its keyed detail editor. */
function identityPolicy(
  policy: AuthoringPresentationPolicy | undefined,
  identityField: string | undefined,
): AuthoringPresentationPolicy | undefined {
  if (!identityField) return policy;
  return {
    ...policy,
    fields: {
      ...policy?.fields,
      [identityField]: { ...fieldPolicy(policy?.fields, identityField), readOnly: true },
    },
  };
}
/*** Remove the union selector from detail rendering because selection owns it. */
function withoutDiscriminator(
  structure: AuthoringStructure,
  discriminator: string,
): AuthoringStructure {
  return structure.kind === 'object'
    ? { ...structure, fields: structure.fields.filter((field) => field.name !== discriminator) }
    : structure;
}
/*** Convert an invalid runtime value to an explicit unsupported authoring node. */
function unsupportedNode(base: Base, diagnostic: AuthoringDiagnostic): AuthoringNode {
  return {
    ...base,
    kind: 'unsupported',
    diagnostic: { ...diagnostic, path: diagnostic.path.length > 0 ? diagnostic.path : base.path },
  };
}
/*** Convert one source property name to a default human-readable field label. */
function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replaceAll(/[-_]+/gu, ' ');
  const first = spaced.at(0);
  return first ? first.toUpperCase() + spaced.slice(1) : name;
}
/*** Format one authoring path for diagnostics without leaking implementation details. */
function formatPath(path: readonly string[]): string {
  return path.length === 0 ? 'root' : path.join('.');
}
