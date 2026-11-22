import { isRecord, readOwnProperty } from '@ankhorage/utility/object';
import { isValidElement, type ReactNode } from 'react';

import type { AuthoringEditorProps } from './AuthoringEditor.js';

export function renderControls(node: unknown): readonly {
  readonly type: string;
  readonly props: Record<string, unknown>;
}[] {
  if (Array.isArray(node)) return node.flatMap(renderControls);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  if (typeof node.type === 'function') {
    const rendered: unknown = Reflect.apply(node.type, undefined, [node.props]);
    return renderControls(rendered);
  }
  const children = renderControls(node.props.children);
  return typeof node.type === 'string'
    ? [{ type: node.type, props: node.props }, ...children]
    : children;
}

export async function loadEditor(): Promise<{
  AuthoringEditor: (props: AuthoringEditorProps) => ReactNode;
}> {
  const build = await Bun.build({
    entrypoints: [new URL('./AuthoringEditor.tsx', import.meta.url).pathname],
    target: 'bun',
    plugins: [
      {
        name: 'inert-authoring-controls',
        setup(builder) {
          builder.onResolve(
            { filter: /^(@ankhorage\/zora(?:\/reader-free)?|react-native)$/u },
            ({ path }) => ({
              path,
              namespace: 'inert-controls',
            }),
          );
          builder.onLoad({ filter: /.*/u, namespace: 'inert-controls' }, () => ({
            loader: 'js',
            contents: `export const Button='Button', Field='Field', Select='Select',
          Switch='Switch', Text='Text', TextInput='TextInput', View='View';
          export const StyleSheet={create: value => value};`,
          }));
        },
      },
    ],
  });
  if (!build.success || !build.outputs[0])
    throw new Error(build.logs.map((log) => log.message).join('\n'));
  const loaded: unknown = await import(
    `data:text/javascript;base64,${Buffer.from(await build.outputs[0].text()).toString('base64')}`
  );
  const component = isRecord(loaded) ? readOwnProperty(loaded, 'AuthoringEditor') : undefined;
  if (typeof component !== 'function') throw new Error('Missing bundled AuthoringEditor.');
  return {
    AuthoringEditor(props) {
      const rendered: unknown = Reflect.apply(component, undefined, [props]);
      if (!isValidElement(rendered)) throw new Error('Expected an authoring React element.');
      return rendered;
    },
  };
}
