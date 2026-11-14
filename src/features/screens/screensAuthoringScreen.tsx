import { AuthoringSelectionAdapter } from '@ankhorage/zora/authoring';
import { Button, Card, Text, TextInput, View } from '@ankhorage/zora/reader-free';
import { useState } from 'react';

import {
  type AuthoringScreenListItem,
  deriveAuthoringScreenListState,
  getAuthoringScreenLabel,
} from './screensAuthoringScreenState.js';

export type { AuthoringScreenListItem } from './screensAuthoringScreenState.js';

/*** Define the host-owned ports for the portable `/ankh/screens` composition. */
export interface ScreensAuthoringScreenProps {
  readonly screens: readonly AuthoringScreenListItem[];
  readonly selectedScreenId?: string;
  readonly onScreenSelectionChange?: (screen: AuthoringScreenListItem | null) => void;
  readonly onCreateScreen?: (name: string) => Promise<ScreenCreationAcknowledgement>;
  readonly disabled?: boolean;
  readonly error?: string;
}

/*** Represent the host's explicit outcome for a requested manifest mutation. */
export type ScreenCreationAcknowledgement =
  { readonly status: 'saved' } | { readonly status: 'rejected'; readonly message: string };

interface ScreenSelectionRenderState {
  readonly item: AuthoringScreenListItem;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly select: () => void;
}

/*** Render portable screen authoring without taking ownership of host storage, routing, or identity allocation. */
export function ScreensAuthoringScreen({
  screens,
  selectedScreenId,
  onScreenSelectionChange,
  onCreateScreen,
  disabled = false,
  error,
}: ScreensAuthoringScreenProps) {
  const state = deriveAuthoringScreenListState(screens);
  const creation = useScreenCreation(onCreateScreen, disabled);
  const message = error ?? creation.error ?? state.diagnostic?.message;

  return (
    <View gap="m">
      <ScreenHeading />
      {message ? <ScreenAuthoringError message={message} /> : null}
      <CreateScreenCard creation={creation} disabled={disabled} onCreateScreen={onCreateScreen} />
      <ScreenList
        disabled={
          disabled || state.diagnostic !== undefined || onScreenSelectionChange === undefined
        }
        onScreenSelectionChange={onScreenSelectionChange}
        screens={screens}
        selectedScreenId={selectedScreenId}
      />
    </View>
  );
}

/*** Retain a screen-name draft until the host explicitly confirms that it saved the mutation. */
function useScreenCreation(
  onCreateScreen: ScreensAuthoringScreenProps['onCreateScreen'],
  disabled: boolean,
) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const canCreate =
    !disabled && !isCreating && name.trim().length > 0 && onCreateScreen !== undefined;

  /*** Send a non-empty draft to the host while preserving it unless the host confirms persistence. */
  const create = async () => {
    if (!canCreate) return;
    setError(null);
    setIsCreating(true);
    try {
      const acknowledgement = await onCreateScreen(name.trim());
      if (acknowledgement.status === 'saved') {
        setName('');
      } else {
        setError(acknowledgement.message);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The screen could not be created.');
    } finally {
      setIsCreating(false);
    }
  };

  return { name, setName, error, isCreating, canCreate, create };
}

/*** Identify the portable screen capability and its host-owned manifest boundary. */
function ScreenHeading() {
  return (
    <View gap="xs">
      <Text variant="lead" weight="semiBold">
        Screens
      </Text>
      <Text color="neutral" emphasis="muted" variant="bodySmall">
        Select a canonical screen or request one through the host-owned manifest command.
      </Text>
    </View>
  );
}

/*** Render a host or validation failure without pretending that an authoring operation succeeded. */
function ScreenAuthoringError({ message }: { readonly message: string }) {
  return (
    <Card title="Screen authoring unavailable" tone="outline">
      <Text color="danger">{message}</Text>
    </Card>
  );
}

/*** Render creation controls only through a host-supplied command port. */
function CreateScreenCard({
  creation,
  disabled,
  onCreateScreen,
}: {
  readonly creation: ReturnType<typeof useScreenCreation>;
  readonly disabled: boolean;
  readonly onCreateScreen: ScreensAuthoringScreenProps['onCreateScreen'];
}) {
  return (
    <Card
      title="Create screen"
      description={
        onCreateScreen
          ? 'The host assigns identity and persists the manifest mutation.'
          : 'Creation is unavailable because no host manifest command was supplied.'
      }
    >
      <View gap="s">
        <TextInput
          accessibilityLabel="New screen name"
          editable={!disabled && !creation.isCreating && onCreateScreen !== undefined}
          onChangeText={creation.setName}
          onSubmitEditing={() => void creation.create()}
          placeholder="Screen name"
          value={creation.name}
        />
        <Button disabled={!creation.canCreate} onPress={() => void creation.create()}>
          Create screen
        </Button>
      </View>
    </Card>
  );
}

/*** Render canonical screen selection through ZORA's released controlled-selection adapter. */
function ScreenList({
  screens,
  selectedScreenId,
  onScreenSelectionChange,
  disabled,
}: Pick<ScreensAuthoringScreenProps, 'screens' | 'selectedScreenId' | 'onScreenSelectionChange'> & {
  readonly disabled: boolean;
}) {
  if (screens.length === 0) {
    return (
      <Card
        title="No screens available"
        description="The current manifest did not provide any canonical screens."
      />
    );
  }
  return (
    <View gap="s">
      <Text weight="semiBold">Canonical screens</Text>
      <AuthoringSelectionAdapter<AuthoringScreenListItem>
        disabled={disabled}
        getItemId={(screen: AuthoringScreenListItem) => screen.id}
        items={screens}
        onSelectionChange={onScreenSelectionChange}
        renderItem={renderScreenSelectionItem}
        selectedItemId={selectedScreenId}
      />
    </View>
  );
}

/*** Present one selectable screen with an explicit selected state and its stable identity. */
function renderScreenSelectionItem({
  item,
  selected,
  disabled,
  select,
}: ScreenSelectionRenderState) {
  return (
    <Card
      actions={
        <Button disabled={disabled} onPress={select} variant={selected ? 'solid' : 'outline'}>
          {selected ? 'Selected' : 'Select'}
        </Button>
      }
      description={item.description}
      title={getAuthoringScreenLabel(item)}
      tone={selected ? 'default' : 'outline'}
    >
      <Text color="neutral" emphasis="muted" variant="caption">
        {item.id}
      </Text>
    </Card>
  );
}
