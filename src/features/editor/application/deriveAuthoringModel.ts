import type { AuthoringNode, AuthoringPresentationPolicy, AuthoringStructure } from '../model.js';
import { deriveAuthoringNode, type DeriveAuthoringNodeArgs } from './deriveAuthoringNode.js';

/*** Derive one UI-neutral authoring model from neutral structure semantics and a runtime value. */
export function deriveAuthoringModel(args: {
  readonly structure: AuthoringStructure;
  readonly value: unknown;
  readonly policy?: AuthoringPresentationPolicy;
  readonly label?: string;
  readonly path?: readonly string[];
  readonly optional?: boolean;
}): AuthoringNode {
  return deriveNode({
    structure: args.structure,
    value: args.value,
    policy: args.policy,
    path: args.path ?? [],
    label: args.label ?? args.policy?.label ?? 'Value',
    optional: args.optional ?? false,
    inheritedReadOnly: false,
  });
}

/*** Recursively derive one authoring node while retaining path, optionality, and inherited policy. */
function deriveNode(args: DeriveAuthoringNodeArgs): AuthoringNode {
  return deriveAuthoringNode(args, deriveNode);
}
