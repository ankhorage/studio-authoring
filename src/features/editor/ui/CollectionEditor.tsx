import { Button, Field, Text, TextInput } from '@ankhorage/zora/reader-free';
import type { NativeSyntheticEvent, TextInputEndEditingEventData } from 'react-native';
import { View } from 'react-native';

import { createInitialAuthoringValue } from '../application/createInitialAuthoringValue.js';
import type {
  AuthoringEntityRegistryNode,
  AuthoringMutation,
  AuthoringOrderedListNode,
  AuthoringValueMapNode,
} from '../model.js';
import { AuthoringEditor, type AuthoringEditorProps } from './AuthoringEditor.js';
import { OrderedListEditor } from './OrderedListEditor.js';
import { addRegistryEntity, FiniteRegistryAdd } from './RegistryAdd.js';
import { styles } from './styles.js';

type Collection = AuthoringEntityRegistryNode | AuthoringValueMapNode | AuthoringOrderedListNode;
interface Props {
  readonly model: Collection;
  readonly onMutation: (mutation: AuthoringMutation) => void;
  readonly renderCustomControl?: AuthoringEditorProps['renderCustomControl'];
}

/*** Render descriptor-owned collection controls with caller-owned mutations. */
export function CollectionEditor(props: Props) {
  if (props.model.kind === 'ordered-list')
    return <OrderedListEditor {...props} model={props.model} />;
  return props.model.kind === 'value-map' ? (
    <Map {...props} model={props.model} />
  ) : (
    <Registry {...props} model={props.model} />
  );
}

/*** Render mutable keyed values with recursive controls. */
function Map(props: {
  readonly model: AuthoringValueMapNode;
  readonly onMutation: Props['onMutation'];
  readonly renderCustomControl?: Props['renderCustomControl'];
}) {
  const { model, onMutation, renderCustomControl } = props;
  const key = next(model);
  const initial = createInitialAuthoringValue(model.valueStructure);
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.membership}>
        {model.entries.map((entry) => (
          <View key={entry.key} style={styles.valueMapRow}>
            <View style={styles.valueMapKey}>
              <TextInput
                defaultValue={entry.key}
                readOnly={!entry.authored}
                autoCapitalize="none"
                onEndEditing={(event: NativeSyntheticEvent<TextInputEndEditingEventData>) =>
                  rename(model, entry.key, entry.authored, event.nativeEvent.text, onMutation)
                }
              />
            </View>
            <View style={styles.valueMapValue}>
              <AuthoringEditor
                model={entry.value}
                onMutation={onMutation}
                renderCustomControl={renderCustomControl}
              />
            </View>
            {entry.authored ? (
              <Button variant="outline" onPress={() => remove(model, entry.key, onMutation)}>
                Remove
              </Button>
            ) : null}
          </View>
        ))}
        {key === undefined || initial === undefined ? null : (
          <Button
            variant="outline"
            onPress={() => onMutation({ kind: 'set', path: [...model.path, key], value: initial })}
          >
            Add entry
          </Button>
        )}
      </View>
    </Field>
  );
}

/*** Rename an authored key only to a distinct unused key. */
function rename(
  model: AuthoringValueMapNode,
  fromKey: string,
  authored: boolean,
  toKey: string,
  onMutation: Props['onMutation'],
): void {
  if (authored && toKey !== fromKey && !model.entries.some((entry) => entry.key === toKey))
    onMutation({ kind: 'rename-key', path: model.path, fromKey, toKey });
}
/*** Remove a map entry while clearing a final optional override. */
function remove(model: AuthoringValueMapNode, key: string, onMutation: Props['onMutation']): void {
  const count = model.entries.filter((entry) => entry.authored).length;
  onMutation(
    model.optional && count === 1
      ? { kind: 'unset', path: model.path }
      : { kind: 'unset', path: [...model.path, key] },
  );
}
/*** Choose a deterministic available identity for a new map entry. */
function next(model: AuthoringValueMapNode): string | undefined {
  const used = new Set(model.entries.map((entry) => entry.key));
  if (model.key.kind === 'choice') return model.key.values.find((key) => !used.has(key));
  let index = 1;
  while (used.has(index === 1 ? 'newKey' : `newKey${index}`)) index += 1;
  return index === 1 ? 'newKey' : `newKey${index}`;
}

/*** Render stable entities without exposing record-key rename. */
function Registry(props: {
  readonly model: AuthoringEntityRegistryNode;
  readonly onMutation: Props['onMutation'];
  readonly renderCustomControl?: Props['renderCustomControl'];
}) {
  const { model, onMutation, renderCustomControl } = props;
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.membership}>
        {model.entries.map((entry) => (
          <View key={entry.key} style={styles.valueMapRow}>
            <View style={styles.valueMapKey}>
              <Text>{entry.key}</Text>
            </View>
            <View style={styles.valueMapValue}>
              <AuthoringEditor
                model={entry.value}
                onMutation={onMutation}
                renderCustomControl={renderCustomControl}
              />
            </View>
            <Button
              variant="outline"
              onPress={() => onMutation({ kind: 'unset', path: [...model.path, entry.key] })}
            >
              Remove
            </Button>
          </View>
        ))}
        {model.key.kind === 'scalar' ? (
          <TextInput
            placeholder="Entity identity · press Enter to add"
            autoCapitalize="none"
            onSubmitEditing={(event: NativeSyntheticEvent<TextInputEndEditingEventData>) =>
              addRegistryEntity(model, event.nativeEvent.text, onMutation)
            }
          />
        ) : (
          <FiniteRegistryAdd model={model} onMutation={onMutation} />
        )}
      </View>
    </Field>
  );
}
