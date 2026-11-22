import type { NativeSyntheticEvent, TextInputEndEditingEventData } from 'react-native';
import { Button, Field, Text, TextInput } from '@ankhorage/zora/reader-free';
import { View } from 'react-native';

import { createInitialAuthoringValue } from '../application/createInitialAuthoringValue.js';
import type {
  AuthoringEntityRegistryNode,
  AuthoringMutation,
  AuthoringOrderedListNode,
  AuthoringValue,
  AuthoringValueMapNode,
} from '../model.js';
import { AuthoringEditor, type AuthoringEditorProps } from './AuthoringEditor.js';
import { FiniteRegistryAdd, addRegistryEntity } from './RegistryAdd.js';
import { styles } from './styles.js';
import { encodeChoiceValue } from './utils.js';

type CollectionModel =
  AuthoringEntityRegistryNode | AuthoringOrderedListNode | AuthoringValueMapNode;
interface CollectionEditorProps {
  readonly model: CollectionModel;
  readonly onMutation: (mutation: AuthoringMutation) => void;
  readonly renderCustomControl?: AuthoringEditorProps['renderCustomControl'];
}

/*** Render ordered lists and keyed portable collection controls. */
export function CollectionEditor(props: CollectionEditorProps) {
  if (props.model.kind === 'ordered-list')
    return <OrderedListEditor {...props} model={props.model} />;
  if (props.model.kind === 'value-map') return <ValueMapEditor {...props} model={props.model} />;
  return <EntityRegistryEditor {...props} model={props.model} />;
}

/*** Render an ordered primitive list with editing, append, removal, and positional controls. */
function OrderedListEditor(props: {
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { model } = props;
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.membership}>
        {model.items.map((item, index) => (
          <OrderedListItem
            key={`${encodeChoiceValue(item)}:${index}`}
            item={item}
            index={index}
            model={model}
            onMutation={props.onMutation}
          />
        ))}
        <OrderedListAdd model={model} onMutation={props.onMutation} />
      </View>
    </Field>
  );
}

/*** Render and mutate one position in an ordered primitive collection. */
function OrderedListItem(props: {
  readonly item: AuthoringOrderedListNode['items'][number];
  readonly index: number;
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { index, item, model, onMutation } = props;
  return (
    <View style={styles.orderedListRow}>
      <OrderedListItemValue item={item} index={index} model={model} onMutation={onMutation} />
      <OrderedListItemActions index={index} model={model} onMutation={onMutation} />
    </View>
  );
}

/*** Render one ordered item without changing primitive type or list position. */
function OrderedListItemValue(props: {
  readonly item: AuthoringOrderedListNode['items'][number];
  readonly index: number;
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { item, index, model, onMutation } = props;
  if (model.item.kind === 'choice') return <Text>{String(item)}</Text>;
  return (
    <View style={styles.orderedListInput}>
      <TextInput
        value={typeof item === 'string' ? item : ''}
        autoCapitalize="none"
        onChangeText={(value: string) => updateListItem(model, index, value, onMutation)}
      />
    </View>
  );
}

/*** Render positional and removal actions for one ordered collection item. */
function OrderedListItemActions(props: {
  readonly index: number;
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { index, model, onMutation } = props;
  return (
    <>
      <Button
        variant="outline"
        disabled={index === 0}
        onPress={() => moveListItem(model, index, -1, onMutation)}
      >
        Up
      </Button>
      <Button
        variant="outline"
        disabled={index === model.items.length - 1}
        onPress={() => moveListItem(model, index, 1, onMutation)}
      >
        Down
      </Button>
      <Button variant="outline" onPress={() => removeListItem(model, index, onMutation)}>
        Remove
      </Button>
    </>
  );
}

/*** Replace one primitive list item while retaining every other owner-provided value. */
function updateListItem(
  model: AuthoringOrderedListNode,
  index: number,
  value: string,
  onMutation: CollectionEditorProps['onMutation'],
): void {
  setList(
    model,
    model.items.map((candidate, candidateIndex) => (candidateIndex === index ? value : candidate)),
    onMutation,
  );
}

/*** Reposition one primitive list item by a relative destination. */
function moveListItem(
  model: AuthoringOrderedListNode,
  index: number,
  offset: number,
  onMutation: CollectionEditorProps['onMutation'],
): void {
  setList(model, moveOrderedListItem(model.items, index, index + offset), onMutation);
}

/*** Render controls that append an owner-supported primitive list item. */
function OrderedListAdd(props: {
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { model, onMutation } = props;
  if (model.item.kind === 'choice')
    return (
      <View style={styles.orderedListAdd}>
        {model.item.values.map((value) => (
          <Button
            key={encodeChoiceValue(value)}
            variant="outline"
            onPress={() => setList(model, [...model.items, value], onMutation)}
          >{`Add ${String(value)}`}</Button>
        ))}
      </View>
    );
  return (
    <View style={styles.orderedListAdd}>
      <Button variant="outline" onPress={() => setList(model, [...model.items, ''], onMutation)}>
        Add item
      </Button>
    </View>
  );
}

/*** Emit list state or remove an empty optional list override. */
function setList(
  model: AuthoringOrderedListNode,
  items: AuthoringOrderedListNode['items'],
  onMutation: CollectionEditorProps['onMutation'],
): void {
  if (model.optional && items.length === 0) return onMutation({ kind: 'unset', path: model.path });
  onMutation({ kind: 'set', path: model.path, value: items });
}

/*** Remove one list item without deduplicating or reordering the remainder. */
function removeListItem(
  model: AuthoringOrderedListNode,
  index: number,
  onMutation: CollectionEditorProps['onMutation'],
): void {
  setList(
    model,
    model.items.filter((_, candidateIndex) => candidateIndex !== index),
    onMutation,
  );
}

/*** Move one ordered-list item immutably while preserving every other authored item. */
function moveOrderedListItem(
  items: AuthoringOrderedListNode['items'],
  fromIndex: number,
  toIndex: number,
): AuthoringOrderedListNode['items'] {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return items;
  const moved = items.at(fromIndex);
  const displaced = items.at(toIndex);
  return moved === undefined || displaced === undefined
    ? items
    : items.map((item, index) =>
        index === fromIndex ? displaced : index === toIndex ? moved : item,
      );
}

/*** Render keyed map entries with recursive values, atomic rename, removal, and structural insertion. */
function ValueMapEditor(props: {
  readonly model: AuthoringValueMapNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
  readonly renderCustomControl?: CollectionEditorProps['renderCustomControl'];
}) {
  const { model, onMutation, renderCustomControl } = props;
  const newKey = resolveNextValueMapKey(model);
  const initialValue = createInitialAuthoringValue(model.valueStructure);
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.membership}>
        {model.entries.map((entry) => (
          <ValueMapEntry
            key={entry.key}
            entry={entry}
            model={model}
            onMutation={onMutation}
            renderCustomControl={renderCustomControl}
          />
        ))}
        <ValueMapAdd
          model={model}
          keyValue={newKey}
          initialValue={initialValue}
          onMutation={onMutation}
        />
      </View>
    </Field>
  );
}

/*** Render one keyed map entry with its editable identity and recursive authoring value. */
function ValueMapEntry(props: {
  readonly entry: AuthoringValueMapNode['entries'][number];
  readonly model: AuthoringValueMapNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
  readonly renderCustomControl?: CollectionEditorProps['renderCustomControl'];
}) {
  const { entry, model, onMutation, renderCustomControl } = props;
  return (
    <View style={styles.valueMapRow}>
      <View style={styles.valueMapKey}>
        <TextInput
          defaultValue={entry.key}
          readOnly={!entry.authored}
          autoCapitalize="none"
          onEndEditing={(event: NativeSyntheticEvent<TextInputEndEditingEventData>) =>
            renameValueMapEntry(
              model,
              entry.key,
              entry.authored,
              event.nativeEvent.text,
              onMutation,
            )
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
        <Button variant="outline" onPress={() => removeMapEntry(model, entry.key, onMutation)}>
          Remove
        </Button>
      ) : null}
    </View>
  );
}

/*** Render structural insertion only when an owner-compatible key and initial value exist. */
function ValueMapAdd(props: {
  readonly model: AuthoringValueMapNode;
  readonly keyValue: string | undefined;
  readonly initialValue: AuthoringValue | undefined;
  readonly onMutation: CollectionEditorProps['onMutation'];
}) {
  const { model, keyValue, initialValue, onMutation } = props;
  return keyValue === undefined || initialValue === undefined ? null : (
    <Button
      variant="outline"
      onPress={() =>
        onMutation({ kind: 'set', path: [...model.path, keyValue], value: initialValue })
      }
    >
      Add entry
    </Button>
  );
}

/*** Rename a map key only when it is authored and does not collide with an existing entry. */
function renameValueMapEntry(
  model: AuthoringValueMapNode,
  fromKey: string,
  authored: boolean,
  toKey: string,
  onMutation: CollectionEditorProps['onMutation'],
): void {
  if (authored && toKey !== fromKey && !model.entries.some((entry) => entry.key === toKey))
    onMutation({ kind: 'rename-key', path: model.path, fromKey, toKey });
}

/*** Remove one map entry or its final optional collection override. */
function removeMapEntry(
  model: AuthoringValueMapNode,
  key: string,
  onMutation: CollectionEditorProps['onMutation'],
): void {
  const count = model.entries.filter((entry) => entry.authored).length;
  onMutation(
    model.optional && count === 1
      ? { kind: 'unset', path: model.path }
      : { kind: 'unset', path: [...model.path, key] },
  );
}

/*** Render stable keyed entities without exposing key rename as an entity operation. */
function EntityRegistryEditor(props: {
  readonly model: AuthoringEntityRegistryNode;
  readonly onMutation: CollectionEditorProps['onMutation'];
  readonly renderCustomControl?: CollectionEditorProps['renderCustomControl'];
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

/*** Choose a deterministic unused map key without assigning ordering semantics to persisted values. */
function resolveNextValueMapKey(model: AuthoringValueMapNode): string | undefined {
  const used = new Set(model.entries.map((entry) => entry.key));
  return model.key.kind === 'choice'
    ? model.key.values.find((candidate) => !used.has(candidate))
    : resolveOpenValueMapKey(used);
}

/*** Recursively find the first unused generic key for an open scalar-string value map. */
function resolveOpenValueMapKey(used: ReadonlySet<string>, index = 1): string {
  const candidate = index === 1 ? 'newKey' : `newKey${index}`;
  return used.has(candidate) ? resolveOpenValueMapKey(used, index + 1) : candidate;
}
