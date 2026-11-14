import { expect, mock, test } from 'bun:test';
import { type ComponentProps, createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const control =
  (type: string) =>
  ({ children, ...props }: { readonly children?: ReactNode } & Record<string, unknown>) =>
    createElement(type, props, children);

void mock.module('@ankhorage/zora/authoring', () => ({
  AuthoringSelectionAdapter: () => null,
}));
void mock.module('@ankhorage/zora/reader-free', () => ({
  Button: control('Button'),
  Card: control('Card'),
  Text: control('Text'),
  TextInput: control('TextInput'),
  View: control('View'),
}));

const { ScreensAuthoringScreen } = await import('./screensAuthoringScreen.js');

interface TestControlProps {
  readonly disabled?: boolean;
  readonly editable?: boolean;
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
  expect(renderer.root.findAllByType('Text' as never).at(-1)?.children).toEqual([
    'Name already exists.',
  ]);
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
  expect(renderer.root.findAllByType('Text' as never).at(-1)?.children).toEqual([
    'Manifest write failed.',
  ]);
});

test('screen creation remains unavailable without a host command or when disabled', async () => {
  const unavailable = await renderScreen(createProps());
  expect(
    unavailable.root.findByProps({ accessibilityLabel: 'New screen name' }).props.editable,
  ).toBe(false);
  expect(unavailable.root.findByType('Button' as never).props.disabled).toBe(true);

  const disabled = await renderScreen({
    ...createProps(() => Promise.resolve({ status: 'saved' as const })),
    disabled: true,
  });
  expect(disabled.root.findByProps({ accessibilityLabel: 'New screen name' }).props.editable).toBe(
    false,
  );
  expect(disabled.root.findByType('Button' as never).props.disabled).toBe(true);
});
