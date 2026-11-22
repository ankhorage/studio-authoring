import { isRecord, setOwnProperty } from '@ankhorage/utility/object';

import type { AuthoringStructure, AuthoringValue } from '../model.js';
import { createInitialAuthoringValue } from './createInitialAuthoringValue.js';

/*** Create one registry entity and materialize its owner identity field from the stable record key. */
export function createInitialEntityRegistryValue(
  structure: AuthoringStructure,
  identityField: string | undefined,
  key: string,
): AuthoringValue | undefined {
  const initial = createInitialAuthoringValue(structure);
  if (!identityField) return initial;
  if (!isRecord(initial)) return undefined;

  const value = { ...initial };
  setOwnProperty(value, identityField, key);
  return value;
}
