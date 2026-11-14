import {
  decodeFirstPathSegmentAfterPrefix,
  decodeSinglePathSegmentAfterPrefix,
} from "@ankhorage/utility/url";

/*** Define portable `/ankh` routes owned by the reusable authoring core. */
export type AnkhRouteId =
  | "screens"
  | "screen-detail"
  | "media"
  | "theme"
  | "theme-colors"
  | "theme-typography"
  | "theme-spacing"
  | "theme-radii"
  | "theme-shadows"
  | "theme-component"
  | "theme-pattern"
  | "properties"
  | "bindings";

/***
 * Record the `/ankh` routes whose portable manifest, selection, or theme-authoring policy belongs
 * here. Studio overview, APIs, modules, authentication, secrets, and deployment remain with their
 * respective product, host, or service owners.
 */
export const AUTHORING_ANKH_ROUTE_IDS: readonly AnkhRouteId[] = [
  "screens",
  "screen-detail",
  "media",
  "theme",
  "theme-colors",
  "theme-typography",
  "theme-spacing",
  "theme-radii",
  "theme-shadows",
  "theme-component",
  "theme-pattern",
  "bindings",
  "properties",
];

const SCREEN_ROUTE_PREFIX = "/ankh/screens/";
const THEME_COMPONENT_ROUTE_PREFIX = "/ankh/theme/components/";
const THEME_PATTERN_ROUTE_PREFIX = "/ankh/theme/patterns/";
const BINDINGS_ROUTE_PREFIX = "/ankh/bindings/";
const PROPERTIES_ROUTE_PREFIX = "/ankh/properties/";

const STATIC_AUTHORING_ROUTES = {
  "/ankh/screens": "screens",
  "/ankh/media": "media",
  "/ankh/theme": "theme",
  "/ankh/theme/colors": "theme-colors",
  "/ankh/theme/typography": "theme-typography",
  "/ankh/theme/spacing": "theme-spacing",
  "/ankh/theme/radii": "theme-radii",
  "/ankh/theme/shadows": "theme-shadows",
} as const satisfies Record<string, AnkhRouteId>;

/*** Resolve the reusable authoring route identity while rejecting malformed paths. */
export function resolveAnkhRouteId(pathname: string): AnkhRouteId | null {
  if (pathname.startsWith(SCREEN_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, SCREEN_ROUTE_PREFIX)
      ? "screen-detail"
      : null;
  }
  if (pathname.startsWith(THEME_COMPONENT_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(
      pathname,
      THEME_COMPONENT_ROUTE_PREFIX,
    )
      ? "theme-component"
      : null;
  }
  if (pathname.startsWith(THEME_PATTERN_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(
      pathname,
      THEME_PATTERN_ROUTE_PREFIX,
    )
      ? "theme-pattern"
      : null;
  }
  if (pathname.startsWith(BINDINGS_ROUTE_PREFIX)) {
    return decodeFirstPathSegmentAfterPrefix(pathname, BINDINGS_ROUTE_PREFIX)
      ? "bindings"
      : null;
  }
  if (pathname.startsWith(PROPERTIES_ROUTE_PREFIX)) {
    return decodeFirstPathSegmentAfterPrefix(pathname, PROPERTIES_ROUTE_PREFIX)
      ? "properties"
      : null;
  }
  return (
    STATIC_AUTHORING_ROUTES[pathname as keyof typeof STATIC_AUTHORING_ROUTES] ??
    null
  );
}
