import { AuthoringSelectionAdapter } from '@ankhorage/zora/authoring';
import { Button, Card, Field, Text, TextInput, View } from '@ankhorage/zora/authoring';
import { useRef, useState } from 'react';

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
  const message = getVisibleScreenAuthoringMessage(
    error,
    creation.error,
    state.diagnostic?.message,
  );

  return (
    <View gap="m">
      <ScreenHeading />
      {message ? <ScreenAuthoringError message={message} /> : null}
      <CreateScreenCard creation={creation} disabled={disabled} onCreateScreen={onCreateScreen} />
      <ScreenList
        disabled={
          disabled || state.diagnostic !== undefined || onScreenSelectionChange === undefined
        }
        diagnostic={state.diagnostic?.message}
        onScreenSelectionChange={onScreenSelectionChange}
        screens={screens}
        selectedScreenId={selectedScreenId}
      />
    </View>
  );
}

/*** Prefer meaningful host errors without allowing blank host state to hide an internal diagnostic. */
function getVisibleScreenAuthoringMessage(
  externalError: string | undefined,
  creationError: string | null,
  diagnostic: string | undefined,
): string | undefined {
  const normalizedExternalError = externalError?.trim();
  const visibleExternalError =
    normalizedExternalError?.length === 0 ? undefined : normalizedExternalError;
  return visibleExternalError ?? creationError ?? diagnostic;
}

/*** Retain a screen-name draft until the host explicitly confirms that it saved the mutation. */
function useScreenCreation(
  onCreateScreen: ScreensAuthoringScreenProps['onCreateScreen'],
  disabled: boolean,
) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);
  const canCreate =
    !disabled && !isCreating && name.trim().length > 0 && onCreateScreen !== undefined;

  /*** Send one non-empty draft to the host while preserving it unless the host confirms persistence. */
  const create = async () => {
    const draft = name.trim();
    if (disabled || isCreatingRef.current || draft.length === 0 || onCreateScreen === undefined)
      return;

    isCreatingRef.current = true;
    setError(null);
    setIsCreating(true);
    try {
      const acknowledgement = await onCreateScreen(draft);
      if (acknowledgement.status === 'saved') {
        setName('');
      } else {
        setError(getScreenCreationError(acknowledgement.message));
      }
    } catch (cause) {
      setError(getScreenCreationError(cause instanceof Error ? cause.message : undefined));
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  };

  return { name, setName, error, isCreating, canCreate, create };
}

/*** Preserve a visible, retryable failure when a host declines to supply an error message. */
function getScreenCreationError(message: string | undefined): string {
  const normalizedMessage = message?.trim();
  return normalizedMessage === undefined || normalizedMessage.length === 0
    ? 'The screen could not be created.'
    : normalizedMessage;
}

/*** Identify the portable screen capability and its host-owned manifest boundary. */
function ScreenHeading() {
  return (
    <View accessibilityRole="header" gap="xs">
      <Text variant="body" weight="semiBold">
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
    <Card p="m" variant="outline">
      <View gap="xs">
        <Text weight="semiBold">Screen authoring unavailable</Text>
        <Text color="danger">{message}</Text>
      </View>
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
    <Card p="m" variant="outline">
      <View gap="s">
        <Text weight="semiBold">Create screen</Text>
        <Text color="neutral" emphasis="muted" variant="bodySmall">
          {onCreateScreen
            ? 'The host assigns identity and persists the manifest mutation.'
            : 'Creation is unavailable because no host manifest command was supplied.'}
        </Text>
        <Field label="New screen name">
          <TextInput
            accessibilityLabel="New screen name"
            disabled={disabled || creation.isCreating || onCreateScreen === undefined}
            onChangeText={creation.setName}
            onSubmitEditing={() => void creation.create()}
            placeholder="Screen name"
            value={creation.name}
          />
        </Field>
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
  diagnostic,
}: Pick<ScreensAuthoringScreenProps, 'screens' | 'selectedScreenId' | 'onScreenSelectionChange'> & {
  readonly disabled: boolean;
  readonly diagnostic?: string;
}) {
  if (screens.length === 0) {
    return (
      <Card p="m" variant="outline">
        <View gap="xs">
          <Text weight="semiBold">No screens available</Text>
          <Text color="neutral" emphasis="muted" variant="bodySmall">
            The current manifest did not provide any canonical screens.
          </Text>
        </View>
      </Card>
    );
  }
  if (diagnostic !== undefined) {
    return (
      <Card p="m" variant="outline">
        <View gap="xs">
          <Text weight="semiBold">Screen selection unavailable</Text>
          <Text color="neutral" emphasis="muted" variant="bodySmall">
            Correct the manifest screen identities before selecting a screen.
          </Text>
        </View>
      </Card>
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
    <Card p="m" variant={selected ? 'raised' : 'outline'}>
      <View gap="s">
        <View gap="xs">
          <Text weight="semiBold">{getAuthoringScreenLabel(item)}</Text>
          {item.description ? (
            <Text color="neutral" emphasis="muted" variant="bodySmall">
              {item.description}
            </Text>
          ) : null}
          <Text color="neutral" emphasis="muted" variant="caption">
            {item.id}
          </Text>
        </View>
        <Button disabled={disabled} onPress={select} variant={selected ? 'solid' : 'outline'}>
          {selected ? 'Selected' : 'Select'}
        </Button>
      </View>
    </Card>
  );
}
