import { Button, Field, Select } from '@ankhorage/zora/reader-free';
import { View } from 'react-native';

import { createAuthoringUnionVariantValue } from '../application/createAuthoringUnionVariantValue.js';
import type { AuthoringMutation, AuthoringUnionNode } from '../model.js';
import { AuthoringEditor, type AuthoringEditorProps } from './AuthoringEditor.js';
import { styles } from './styles.js';
import { encodeChoiceValue } from './utils.js';

/*** Render explicit discriminated-union selection plus the selected variant detail editor. */
export function UnionEditor(props: {
  readonly model: AuthoringUnionNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
  readonly renderCustomControl?: AuthoringEditorProps['renderCustomControl'];
}) {
  const { model, onMutation, renderCustomControl } = props;
  const options = model.variants.map((variant) => ({
    label: String(variant.value),
    value: encodeChoiceValue(variant.value),
  }));
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.fields}>
        <Select
          options={options}
          value={model.selected === undefined ? undefined : encodeChoiceValue(model.selected)}
          onValueChange={(value: string) => selectUnionVariant(model, value, onMutation)}
        />
        {model.value ? (
          <AuthoringEditor
            model={model.value}
            onMutation={onMutation}
            renderCustomControl={renderCustomControl}
          />
        ) : null}
        {model.optional && model.selected !== undefined ? (
          <Button variant="outline" onPress={() => onMutation({ kind: 'unset', path: model.path })}>
            Remove
          </Button>
        ) : null}
      </View>
    </Field>
  );
}

/*** Create and apply the newly selected union variant through its owner structures. */
function selectUnionVariant(
  model: AuthoringUnionNode,
  controlValue: string,
  onMutation: (mutation: AuthoringMutation) => void,
): void {
  const target = model.variants.find(
    (variant) => encodeChoiceValue(variant.value) === controlValue,
  );
  const current = model.variants.find((variant) => Object.is(variant.value, model.selected));
  const next =
    target &&
    createAuthoringUnionVariantValue({
      currentValue: model.authoredValue,
      currentStructure: current?.structure,
      targetStructure: target.structure,
      discriminator: model.discriminator,
    });
  if (next !== undefined) onMutation({ kind: 'set', path: model.path, value: next });
}
