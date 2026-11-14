/*** Define portable `/ankh` routes owned by the reusable authoring core. */
export type AnkhRouteId =
  "overview" | "screens" | "screen-detail" | "properties" | "bindings";

/*** Resolve the reusable authoring route identity while rejecting malformed paths. */
export function resolveAnkhRouteId(pathname: string): AnkhRouteId | null {
  if (pathname === "/ankh") return "overview";
  if (pathname === "/ankh/screens") return "screens";
  if (hasEncodedIdentifier(pathname, "/ankh/screens/")) return "screen-detail";
  if (hasEncodedIdentifier(pathname, "/ankh/properties/")) return "properties";
  if (hasEncodedIdentifier(pathname, "/ankh/bindings/")) return "bindings";
  return null;
}

/*** Accept exactly one decodable non-empty contextual path segment. */
function hasEncodedIdentifier(pathname: string, prefix: string): boolean {
  if (!pathname.startsWith(prefix)) return false;
  const segment = pathname.slice(prefix.length);
  if (!segment || segment.includes("/")) return false;
  try {
    return decodeURIComponent(segment).length > 0;
  } catch {
    return false;
  }
}
