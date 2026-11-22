import { Field, Select, Switch, Text, TextInput } from '@ankhorage/zora/reader-free';
import { View } from 'react-native';

import type {
  AuthoringChoiceNode,
  AuthoringMutation,
  AuthoringScalarNode,
  AuthoringSetNode,
} from '../model.js';
import { styles } from './styles.js';
import { encodeChoiceValue } from './utils.js';

interface PrimitiveEditorProps {
  readonly model: AuthoringChoiceNode | AuthoringScalarNode | AuthoringSetNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
}

/*** Render the portable scalar, finite-choice, and finite-set editor controls. */
export function PrimitiveEditor(props: PrimitiveEditorProps) {
  if (props.model.kind === 'choice') return <ChoiceEditor {...props} model={props.model} />;
  if (props.model.kind === 'set') return <SetEditor {...props} model={props.model} />;
  return <ScalarEditor {...props} model={props.model} />;
}

/*** Render one finite primitive choice and translate its control value back to the owner value. */
function ChoiceEditor(props: {
  readonly model: AuthoringChoiceNode;
  readonly onMutation: PrimitiveEditorProps['onMutation'];
}) {
  const { model } = props;
  const stringOnly = model.values.every((value) => typeof value === 'string');
  const effective = model.value === undefined ? model.inheritance?.value : model.value;
  const current =
    effective === undefined
      ? undefined
      : stringOnly
        ? String(effective)
        : encodeChoiceValue(effective);
  const options = model.values.map((value) => ({
    label: String(value),
    value: stringOnly ? String(value) : encodeChoiceValue(value),
  }));
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <Select
        options={options}
        value={current}
        onValueChange={(value: string) => selectChoice(model, stringOnly, value, props.onMutation)}
      />
    </Field>
  );
}

/*** Preserve the owner's primitive identity when a finite Select value changes. */
function selectChoice(
  model: AuthoringChoiceNode,
  stringOnly: boolean,
  controlValue: string,
  onMutation: PrimitiveEditorProps['onMutation'],
): void {
  const value = model.values.find((candidate) =>
    stringOnly ? candidate === controlValue : encodeChoiceValue(candidate) === controlValue,
  );
  if (value !== undefined) onMutation({ kind: 'set', path: model.path, value });
}

/*** Render finite unordered string membership with one switch per owner-provided member. */
function SetEditor(props: {
  readonly model: AuthoringSetNode;
  readonly onMutation: PrimitiveEditorProps['onMutation'];
}) {
  const { model } = props;
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <View style={styles.membership}>
        {model.values.map((member) => (
          <SetMember key={member} member={member} model={model} onMutation={props.onMutation} />
        ))}
      </View>
    </Field>
  );
}

/*** Toggle one member while maintaining portable unordered membership semantics. */
function SetMember(props: {
  readonly member: string;
  readonly model: AuthoringSetNode;
  readonly onMutation: PrimitiveEditorProps['onMutation'];
}) {
  const { member, model, onMutation } = props;
  return (
    <View style={styles.membershipRow}>
      <Switch
        checked={model.selected.includes(member)}
        onCheckedChange={(checked: boolean) => updateSetMember(model, member, checked, onMutation)}
      />
      <Text>{member}</Text>
    </View>
  );
}

/*** Emit a set or unset mutation for one changed finite member. */
function updateSetMember(
  model: AuthoringSetNode,
  member: string,
  checked: boolean,
  onMutation: PrimitiveEditorProps['onMutation'],
): void {
  const selected = checked
    ? model.values.filter((candidate) => candidate === member || model.selected.includes(candidate))
    : model.selected.filter((candidate) => candidate !== member);
  if (model.optional && selected.length === 0)
    return onMutation({ kind: 'unset', path: model.path });
  onMutation({
    kind: 'set',
    path: model.path,
    value: Object.fromEntries(selected.map((candidate) => [candidate, true] as const)),
  });
}

/*** Render one scalar authoring node and translate ZORA changes to neutral mutations. */
function ScalarEditor(props: {
  readonly model: AuthoringScalarNode;
  readonly onMutation: PrimitiveEditorProps['onMutation'];
}) {
  const { model } = props;
  if (model.scalarType === 'boolean')
    return (
      <Field label={model.label} description={model.description} required={!model.optional}>
        <Switch
          checked={(model.value === undefined ? model.inheritance?.value : model.value) === true}
          onCheckedChange={(checked: boolean) =>
            props.onMutation({ kind: 'set', path: model.path, value: checked })
          }
        />
      </Field>
    );
  if (model.scalarType === 'null')
    return (
      <Field label={model.label} description={model.description} required={!model.optional}>
        <Text>null</Text>
      </Field>
    );
  const effective = model.value === undefined ? model.inheritance?.value : model.value;
  const value =
    typeof effective === 'number' || typeof effective === 'string' ? String(effective) : '';
  const numeric = model.scalarType === 'integer' || model.scalarType === 'number';
  return (
    <Field label={model.label} description={model.description} required={!model.optional}>
      <TextInput
        value={value}
        keyboardType={numeric ? 'numeric' : undefined}
        multiline={model.multiline}
        numberOfLines={model.multiline ? 4 : undefined}
        onChangeText={(text: string) => updateScalar(model, text, props.onMutation)}
      />
    </Field>
  );
}

/*** Convert text input to a scalar set or unset mutation without coercing invalid numeric values. */
function updateScalar(
  model: AuthoringScalarNode,
  text: string,
  onMutation: PrimitiveEditorProps['onMutation'],
): void {
  if (model.optional && text === '') return onMutation({ kind: 'unset', path: model.path });
  if (model.scalarType === 'string')
    return onMutation({ kind: 'set', path: model.path, value: text });
  const numericValue = Number(text);
  if (
    Number.isFinite(numericValue) &&
    (model.scalarType !== 'integer' || Number.isInteger(numericValue))
  )
    onMutation({ kind: 'set', path: model.path, value: numericValue });
}
