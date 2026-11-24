import type {
  ApiDefinition,
  ApiDefinitionRegistry,
  ComponentDataBinding,
  ComponentDataBindingRegistry,
  DataOperationConfig,
  DataSchema,
  EventBinding,
  PropBinding,
  UiBindableValueMeta,
  UiNode,
} from '@ankhorage/contracts';
import type { Capability } from '@ankhorage/contracts/capability';
import {
  deleteOwnProperty,
  isEmptyRecord,
  readOwnProperty,
  setOwnProperty,
} from '@ankhorage/utility/object';

export interface BindingCapabilityOption {
  readonly capability: Capability;
  readonly label: string;
  readonly apiLabel: string;
  readonly inputFields: readonly BindingInputFieldOption[];
  readonly responsePaths: readonly BindingResponsePathOption[];
}

export interface BindingInputFieldOption {
  readonly name: string;
  readonly label: string;
  readonly value: UiBindableValueMeta;
  readonly required: boolean;
}

export interface BindingResponsePathOption {
  readonly path: string;
  readonly label: string;
  readonly value: UiBindableValueMeta;
}

/*** Project injected host capabilities and portable API operations into deterministic binding choices. */
export function collectBindingCapabilityOptions(args: {
  readonly apis: ApiDefinitionRegistry;
  readonly capabilities: readonly Capability[];
}): readonly BindingCapabilityOption[] {
  return [
    ...args.capabilities.map(projectCapability),
    ...Object.values(args.apis).flatMap(projectApiOperations),
  ].sort((left, right) => left.label.localeCompare(right.label));
}

/*** Find a selected capability option without coupling policy to any host-owned catalog. */
export function findBindingCapabilityOption(
  options: readonly BindingCapabilityOption[],
  capability: Capability['id'],
): BindingCapabilityOption | undefined {
  return options.find((option) => option.capability.id === capability);
}

/*** Add or replace one prop binding while normalizing component identity in the portable registry. */
export function upsertBindingProp(
  registry: ComponentDataBindingRegistry,
  node: UiNode,
  propName: string,
  binding: PropBinding,
): ComponentDataBindingRegistry {
  const current = readOwnProperty<ComponentDataBinding>(registry, node.id);
  return writeBinding(registry, node, {
    ...current,
    props: { ...current?.props, [propName]: binding },
  });
}

/*** Append an event binding without replacing independently authored actions for that event. */
export function appendBindingEvent(
  registry: ComponentDataBindingRegistry,
  node: UiNode,
  eventName: string,
  binding: EventBinding,
): ComponentDataBindingRegistry {
  const current = readOwnProperty<ComponentDataBinding>(registry, node.id);
  const events = { ...current?.events };
  setOwnProperty(events, eventName, [
    ...(readOwnProperty<readonly EventBinding[]>(events, eventName) ?? []),
    binding,
  ]);
  return writeBinding(registry, node, { ...current, events });
}

/*** Remove one prop binding and delete an otherwise empty component registry entry. */
export function removeBindingProp(
  registry: ComponentDataBindingRegistry,
  node: UiNode,
  propName: string,
): ComponentDataBindingRegistry {
  const current = readOwnProperty<ComponentDataBinding>(registry, node.id);
  if (!current?.props || !readOwnProperty<PropBinding>(current.props, propName)) return registry;
  const props = { ...current.props };
  deleteOwnProperty(props, propName);
  return writeBinding(registry, node, { ...current, props });
}

/*** Convert one injected executable capability into portable binding metadata. */
function projectCapability(capability: Capability): BindingCapabilityOption {
  return {
    capability,
    label: capability.id,
    apiLabel: capability.owner,
    inputFields: projectObjectFields(capability.input?.schema),
    responsePaths: [],
  };
}

/*** Project every declared API operation into an executable portable capability choice. */
function projectApiOperations(api: ApiDefinition): readonly BindingCapabilityOption[] {
  return Object.values(api.endpoints).flatMap((endpoint) =>
    Object.values(endpoint.operations).map((operation) => ({
      capability: {
        id: `api.${api.id}.${operation.id}`,
        owner: '@ankhorage/runtime',
        access: ['invoke'],
        binding: { kind: 'api', bindableAs: ['source', 'target'] },
        input: operation.request,
        output: operation.response,
      },
      label: `${api.name ?? api.id} · ${operation.name ?? operation.id}`,
      apiLabel: `${api.id} · ${api.origin} · ${api.protocol}`,
      inputFields: projectOperationFields(operation),
      responsePaths: projectResponsePaths(operation.response?.schema),
    })),
  );
}

/*** Project parameters and request-body fields while preserving parameter precedence. */
function projectOperationFields(
  operation: DataOperationConfig,
): readonly BindingInputFieldOption[] {
  return [
    ...(operation.request?.parameters ?? []).map((parameter) => ({
      name: parameter.name,
      label: parameter.description ?? parameter.name,
      value: projectSchema(parameter.schema),
      required: parameter.required ?? false,
    })),
    ...projectObjectFields(operation.request?.schema),
  ].filter(
    (field, index, fields) =>
      fields.findIndex((candidate) => candidate.name === field.name) === index,
  );
}

/*** Project one object schema's immediate fields for capability input authoring. */
function projectObjectFields(schema: DataSchema | undefined): readonly BindingInputFieldOption[] {
  return Object.entries(schema?.properties ?? {}).map(([name, value]) => ({
    name,
    label: value.title ?? name,
    value: projectSchema(value),
    required: schema?.required?.includes(name) ?? false,
  }));
}

/*** Project the response root and its immediate fields into deterministic selectable paths. */
function projectResponsePaths(
  schema: DataSchema | undefined,
): readonly BindingResponsePathOption[] {
  return [
    { path: '', label: 'Response', value: projectSchema(schema) },
    ...Object.entries(schema?.properties ?? {}).map(([name, value]) => ({
      path: name,
      label: name,
      value: projectSchema(value),
    })),
  ];
}

/*** Translate portable schema primitives into the existing bindable value vocabulary. */
function projectSchema(schema: DataSchema | undefined): UiBindableValueMeta {
  if (!schema) return { type: 'unknown' };
  if (schema.type === 'integer') return { type: 'number' };
  if (schema.type === 'array') return { type: 'array', itemType: projectSchema(schema.items).type };
  if (schema.type === 'object') return { type: 'object' };
  return {
    type:
      schema.type === 'boolean' || schema.type === 'number' || schema.type === 'string'
        ? schema.type
        : 'unknown',
  };
}

/*** Commit one normalized component binding or remove its registry entry when no bindings remain. */
function writeBinding(
  registry: ComponentDataBindingRegistry,
  node: UiNode,
  value: Omit<ComponentDataBinding, 'componentId' | 'componentType'>,
): ComponentDataBindingRegistry {
  const next = { ...registry };
  const binding: ComponentDataBinding = {
    ...value,
    componentId: node.id,
    componentType: node.type,
  };
  if (isEmptyRecord(binding.props ?? {}) && isEmptyRecord(binding.events ?? {}))
    deleteOwnProperty(next, node.id);
  else setOwnProperty(next, node.id, binding);
  return next;
}
