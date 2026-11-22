import { Button, Field, Text } from '@ankhorage/zora/reader-free';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { AuthoringMutation, AuthoringNode } from '../model.js';
import { CollectionEditor } from './CollectionEditor.js';
import { PrimitiveEditor } from './PrimitiveEditor.js';
import { styles } from './styles.js';
import { UnionEditor } from './UnionEditor.js';
import { formatAuthoringNodeValue } from './utils.js';

export interface AuthoringCustomControlProps {
  readonly model: AuthoringNode;
  readonly onMutation: (mutation: AuthoringMutation) => void;
}

export interface AuthoringEditorProps extends AuthoringCustomControlProps {
  readonly renderCustomControl?: (props: AuthoringCustomControlProps) => ReactNode | undefined;
}

/*** Render one neutral authoring model with ZORA controls without owning product-specific schema. */
export function AuthoringEditor(props: AuthoringEditorProps) {
  const { model, onMutation } = props;
  const { inheritance } = model;
  if (!inheritance || !model.optional || model.readOnly) return <AuthoringControl {...props} />;
  return (
    <View style={styles.fields}>
      <AuthoringControl {...props} />
      <Text color="neutral" emphasis="muted" variant="caption">
        {inheritance.overridden ? 'Override' : 'Inherited'}
        {inheritance.value === undefined ? '' : ` (default: ${String(inheritance.value)})`}
      </Text>
      <Button
        variant="outline"
        disabled={!inheritance.overridden}
        onPress={() => onMutation({ kind: 'unset', path: model.path })}
      >
        {`Use inherited ${model.label}`}
      </Button>
    </View>
  );
}

/*** Choose the ZORA control for one neutral structural node. */
function AuthoringControl(props: AuthoringEditorProps) {
  const { model, onMutation, renderCustomControl } = props;
  const customControl = model.editor ? renderCustomControl?.({ model, onMutation }) : undefined;
  if (customControl !== undefined && !model.readOnly)
    return (
      <Field label={model.label} description={model.description} required={!model.optional}>
        {customControl}
      </Field>
    );
  if (model.kind === 'object')
    return (
      <View style={styles.fields}>
        {model.fields.map((field) => (
          <AuthoringEditor
            key={field.path.join('.')}
            model={field}
            onMutation={onMutation}
            renderCustomControl={renderCustomControl}
          />
        ))}
      </View>
    );
  if (model.kind === 'unsupported')
    return (
      <Field label={model.label} description={model.description} required={!model.optional}>
        <Text color="neutral" emphasis="muted" variant="caption">
          {model.diagnostic.message}
        </Text>
      </Field>
    );
  if (model.readOnly) return <ReadonlyAuthoringControl model={model} />;
  if (model.kind === 'choice' || model.kind === 'set' || model.kind === 'scalar')
    return <PrimitiveEditor model={model} onMutation={onMutation} />;
  if (
    model.kind === 'ordered-list' ||
    model.kind === 'value-map' ||
    model.kind === 'entity-registry'
  )
    return (
      <CollectionEditor
        model={model}
        onMutation={onMutation}
        renderCustomControl={renderCustomControl}
      />
    );
  return (
    <UnionEditor model={model} onMutation={onMutation} renderCustomControl={renderCustomControl} />
  );
}

/*** Render a supported node's stable authored state without exposing mutation controls. */
function ReadonlyAuthoringControl(props: {
  readonly model: Exclude<AuthoringNode, { readonly kind: 'object' | 'unsupported' }>;
}) {
  const { model } = props;
  return (
    <Field label={model.label} description={model.description} readOnly required={!model.optional}>
      <Text>{formatAuthoringNodeValue(model)}</Text>
    </Field>
  );
}
