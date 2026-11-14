import { expect, mock, test } from 'bun:test';
import { type ComponentProps, createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const control =
  (type: string) =>
  ({ children, ...props }: { readonly children?: ReactNode } & Record<string, unknown>) =>
    createElement(type, props, children);

const authoringSelectionAdapter = mock(() => null);

void mock.module('@ankhorage/zora/authoring', () => ({
  AuthoringSelectionAdapter: authoringSelectionAdapter,
  Button: control('Button'),
  Card: control('Card'),
  Field: control('Field'),
  Text: control('Text'),
  TextInput: control('TextInput'),
  View: control('View'),
}));

const { ScreensAuthoringScreen } = await import('./screensAuthoringScreen.js');

interface TestControlProps {
  readonly disabled?: boolean;
  readonly onChangeText?: (name: string) => void;
  readonly onPress?: () => void;
  readonly value?: string;
}

const createProps = (
  onCreateScreen?: ComponentProps<typeof ScreensAuthoringScreen>['onCreateScreen'],
) => ({
  screens: [],
  onCreateScreen,
});

async function renderScreen(
  props: ComponentProps<typeof ScreensAuthoringScreen>,
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(() => {
    renderer = create(createElement(ScreensAuthoringScreen, props));
  });
  return renderer;
}

async function setDraft(renderer: ReactTestRenderer, name: string) {
  await act(() => {
    const input = renderer.root.findByProps({
      accessibilityLabel: 'New screen name',
    }) as unknown as {
      readonly props: TestControlProps;
    };
    input.props.onChangeText?.(name);
  });
}

async function createScreen(renderer: ReactTestRenderer) {
  await act(async () => {
    const button = renderer.root.findByType('Button' as never) as unknown as {
      readonly props: TestControlProps;
    };
    button.props.onPress?.();
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('screen creation clears a draft only after the host confirms it saved', async () => {
  const onCreateScreen = mock(() => Promise.resolve({ status: 'saved' as const }));
  const renderer = await renderScreen(createProps(onCreateScreen));

  await setDraft(renderer, '  Dashboard  ');
  await createScreen(renderer);

  expect(onCreateScreen).toHaveBeenCalledWith('Dashboard');
  expect(renderer.root.findByProps({ accessibilityLabel: 'New screen name' }).props.value).toBe('');
});

test('screen creation preserves a rejected draft and displays the host error', async () => {
  const renderer = await renderScreen(
    createProps(() => Promise.resolve({ status: 'rejected', message: 'Name already exists.' })),
  );

  await setDraft(renderer, 'Dashboard');
  await createScreen(renderer);

  expect(renderer.root.findByProps({ accessibilityLabel: 'New screen name' }).props.value).toBe(
    'Dashboard',
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Name already exists.');
});

test('screen creation displays a fallback error when the host rejects without a message', async () => {
  const renderer = await renderScreen(
    createProps(() => Promise.resolve({ status: 'rejected', message: '   ' })),
  );

  await setDraft(renderer, 'Dashboard');
  await createScreen(renderer);

  expect(JSON.stringify(renderer.toJSON())).toContain('The screen could not be created.');
});

test('blank external errors do not hide a rejected host acknowledgement', async () => {
  const renderer = await renderScreen({
    ...createProps(() => Promise.resolve({ status: 'rejected', message: 'Name already exists.' })),
    error: '   ',
  });

  await setDraft(renderer, 'Dashboard');
  await createScreen(renderer);

  expect(JSON.stringify(renderer.toJSON())).toContain('Name already exists.');
});

test('invalid screen identities show their diagnostic without mounting the ZORA selection adapter', async () => {
  for (const screens of [
    [
      { id: 'home', name: 'Home' },
      { id: 'home', name: 'Duplicate home' },
    ],
    [{ id: '', name: 'Missing id' }],
  ]) {
    authoringSelectionAdapter.mockClear();
    const renderer = await renderScreen({
      screens,
      error: ' ',
    });

    expect(authoringSelectionAdapter).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('Screen selection unavailable');
  }
});

test('screen creation preserves a draft and displays a rejected host operation', async () => {
  const renderer = await renderScreen(
    createProps(() => Promise.reject(new Error('Manifest write failed.'))),
  );

  await setDraft(renderer, 'Dashboard');
  await createScreen(renderer);

  expect(renderer.root.findByProps({ accessibilityLabel: 'New screen name' }).props.value).toBe(
    'Dashboard',
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Manifest write failed.');
});

test('screen creation remains unavailable without a host command or when disabled', async () => {
  const unavailable = await renderScreen(createProps());
  expect(
    unavailable.root.findByProps({ accessibilityLabel: 'New screen name' }).props.disabled,
  ).toBe(true);
  expect(unavailable.root.findByType('Button' as never).props.disabled).toBe(true);

  const disabled = await renderScreen({
    ...createProps(() => Promise.resolve({ status: 'saved' as const })),
    disabled: true,
  });
  expect(disabled.root.findByProps({ accessibilityLabel: 'New screen name' }).props.disabled).toBe(
    true,
  );
  expect(disabled.root.findByType('Button' as never).props.disabled).toBe(true);
});

test('screen creation admits one immediate submission and allows a retry after rejection', async () => {
  let rejectFirstCreation!: (cause: Error) => void;
  const firstCreation = new Promise<never>((_resolve, reject) => {
    rejectFirstCreation = reject;
  });
  const onCreateScreen = mock(() =>
    onCreateScreen.mock.calls.length === 1
      ? firstCreation
      : Promise.resolve({ status: 'saved' as const }),
  );
  const renderer = await renderScreen(createProps(onCreateScreen));

  await setDraft(renderer, 'Dashboard');
  await act(() => {
    const button = renderer.root.findByType('Button' as never) as unknown as {
      readonly props: TestControlProps;
    };
    button.props.onPress?.();
    button.props.onPress?.();
  });

  expect(onCreateScreen).toHaveBeenCalledTimes(1);

  await act(async () => {
    rejectFirstCreation(new Error('Manifest write failed.'));
    await Promise.resolve();
  });

  await createScreen(renderer);

  expect(onCreateScreen).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByProps({ accessibilityLabel: 'New screen name' }).props.value).toBe('');
});
