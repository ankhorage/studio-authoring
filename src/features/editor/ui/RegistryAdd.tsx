import { Button } from '@ankhorage/zora/reader-free';

import { createInitialEntityRegistryValue } from '../application/createInitialEntityRegistryValue.js';
import type { AuthoringEntityRegistryNode, AuthoringMutation } from '../model.js';

/*** Insert one open-key registry entity only after its stable owner identity has been supplied. */
export function addRegistryEntity(
  model: AuthoringEntityRegistryNode,
  candidate: string,
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  const key = candidate.trim();
  const initial =
    key === '' || model.entries.some((entry) => entry.key === key)
      ? undefined
      : createInitialEntityRegistryValue(model.valueStructure, model.identityField, key);
  if (initial !== undefined)
    onMutation({ kind: 'set', path: [...model.path, key], value: initial });
}

/*** Render deterministic insertion for finite owner-defined registry identities. */
export function FiniteRegistryAdd(props: {
  readonly model: AuthoringEntityRegistryNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
}) {
  const key = resolveNextFiniteRegistryKey(props.model);
  const initial =
    key === undefined
      ? undefined
      : createInitialEntityRegistryValue(
          props.model.valueStructure,
          props.model.identityField,
          key,
        );
  return initial === undefined || key === undefined ? null : (
    <Button
      variant="outline"
      onPress={() =>
        props.onMutation({ kind: 'set', path: [...props.model.path, key], value: initial })
      }
    >
      Add entity
    </Button>
  );
}

/*** Choose the next unused finite owner identity without assigning collection order semantics. */
function resolveNextFiniteRegistryKey(model: AuthoringEntityRegistryNode): string | undefined {
  return model.key.kind === 'choice'
    ? model.key.values.find((candidate) => !model.entries.some((entry) => entry.key === candidate))
    : undefined;
}
