/*** Identify an inspector target owned by the authoring core. */
export type InspectorTarget = "properties" | "bindings";

/*** Create the canonical contextual inspector path for one selected node. */
export function createInspectorRoute(
  target: InspectorTarget,
  nodeId: string,
): string {
  return `/ankh/${target}/${encodeURIComponent(nodeId)}`;
}
