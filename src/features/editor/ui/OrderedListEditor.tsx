import { Button, Field, Text, TextInput } from '@ankhorage/zora/reader-free';
import { View } from 'react-native';

import type { AuthoringMutation, AuthoringOrderedListNode } from '../model.js';
import { styles } from './styles.js';
import { encodeChoiceValue } from './utils.js';

/*** Render ordered primitive authoring values without assigning identity or deduplicating entries. */
export function OrderedListEditor(props: {
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
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
            {...props}
          />
        ))}
        <OrderedListAdd {...props} />
      </View>
    </Field>
  );
}

/*** Render and mutate one stable ordered-list position. */
function OrderedListItem(props: {
  readonly item: AuthoringOrderedListNode['items'][number];
  readonly index: number;
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
}) {
  const { item, index, model, onMutation } = props;
  return (
    <View style={styles.orderedListRow}>
      {model.item.kind === 'choice' ? (
        <Text>{String(item)}</Text>
      ) : (
        <View style={styles.orderedListInput}>
          <TextInput
            value={typeof item === 'string' ? item : ''}
            autoCapitalize="none"
            onChangeText={(value: string) => update(model, index, value, onMutation)}
          />
        </View>
      )}
      <Button
        variant="outline"
        disabled={index === 0}
        onPress={() => move(model, index, -1, onMutation)}
      >
        Up
      </Button>
      <Button
        variant="outline"
        disabled={index === model.items.length - 1}
        onPress={() => move(model, index, 1, onMutation)}
      >
        Down
      </Button>
      <Button variant="outline" onPress={() => remove(model, index, onMutation)}>
        Remove
      </Button>
    </View>
  );
}

/*** Append a descriptor-supported primitive item. */
function OrderedListAdd(props: {
  readonly model: AuthoringOrderedListNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
}) {
  const { model, onMutation } = props;
  return model.item.kind === 'choice' ? (
    <View style={styles.orderedListAdd}>
      {model.item.values.map((value) => (
        <Button
          key={encodeChoiceValue(value)}
          variant="outline"
          onPress={() => set(model, [...model.items, value], onMutation)}
        >{`Add ${String(value)}`}</Button>
      ))}
    </View>
  ) : (
    <View style={styles.orderedListAdd}>
      <Button variant="outline" onPress={() => set(model, [...model.items, ''], onMutation)}>
        Add item
      </Button>
    </View>
  );
}

/*** Emit list state or remove an empty optional override. */
function set(
  model: AuthoringOrderedListNode,
  items: AuthoringOrderedListNode['items'],
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  onMutation(
    model.optional && items.length === 0
      ? { kind: 'unset', path: model.path }
      : { kind: 'set', path: model.path, value: items },
  );
}

/*** Replace one item without altering other positions. */
function update(
  model: AuthoringOrderedListNode,
  index: number,
  value: string,
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  set(
    model,
    model.items.map((item, itemIndex) => (itemIndex === index ? value : item)),
    onMutation,
  );
}

/*** Swap an item with its valid adjacent destination. */
function move(
  model: AuthoringOrderedListNode,
  index: number,
  offset: number,
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  const destination = index + offset;
  if (destination < 0 || destination >= model.items.length) return;
  const moved = model.items.at(index);
  const displaced = model.items.at(destination);
  if (moved === undefined || displaced === undefined) return;
  set(
    model,
    model.items.map((item, itemIndex) =>
      itemIndex === index ? displaced : itemIndex === destination ? moved : item,
    ),
    onMutation,
  );
}

/*** Remove one item while preserving order and duplicates. */
function remove(
  model: AuthoringOrderedListNode,
  index: number,
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  set(
    model,
    model.items.filter((_, itemIndex) => itemIndex !== index),
    onMutation,
  );
}
