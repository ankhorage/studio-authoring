import { decodeSinglePathSegmentAfterPrefix } from '@ankhorage/utility/url';

/*** Define portable `/ankh` routes owned by the reusable authoring core. */
export type AnkhRouteId =
  | 'screens'
  | 'screen-detail'
  | 'media'
  | 'theme'
  | 'theme-colors'
  | 'theme-typography'
  | 'theme-spacing'
  | 'theme-radii'
  | 'theme-shadows'
  | 'theme-component'
  | 'theme-pattern'
  | 'properties'
  | 'bindings';

/*** Identify the canonical portable pathname template for an Authoring route. */
export type AnkhRoutePathPattern =
  | '/ankh/screens'
  | '/ankh/screens/:screenId'
  | '/ankh/media'
  | '/ankh/theme'
  | '/ankh/theme/colors'
  | '/ankh/theme/typography'
  | '/ankh/theme/spacing'
  | '/ankh/theme/radii'
  | '/ankh/theme/shadows'
  | '/ankh/theme/components/:recipeName'
  | '/ankh/theme/patterns/:recipeName'
  | '/ankh/bindings/:nodeId'
  | '/ankh/properties/:nodeId';

/*** Describe one encoded route parameter that a generated-app router must preserve. */
export interface AnkhRouteParameter {
  readonly name: 'screenId' | 'recipeName' | 'nodeId';
  readonly encoding: 'single-path-segment';
}

/*** Describe a published screen module that a platform router can load for a route. */
export interface AvailableAuthoringRouteScreen {
  readonly status: 'available';
  readonly moduleSpecifier: string;
  readonly exportName: string;
}

/*** Record the public screen module still required before a platform can deliver a route. */
export interface UnresolvedAuthoringRouteScreen {
  readonly status: 'unresolved';
  readonly requirement: 'public-portable-authoring-or-zora-screen-module';
}

/*** Declare the platform-neutral delivery inputs for one portable Authoring route. */
export interface AuthoringRouteDeliveryDefinition {
  readonly id: AnkhRouteId;
  readonly pathPattern: AnkhRoutePathPattern;
  readonly parameters: readonly AnkhRouteParameter[];
  readonly screen: AvailableAuthoringRouteScreen | UnresolvedAuthoringRouteScreen;
}

const UNRESOLVED_AUTHORING_SCREEN: UnresolvedAuthoringRouteScreen = {
  status: 'unresolved',
  requirement: 'public-portable-authoring-or-zora-screen-module',
};

const SCREENS_AUTHORING_SCREEN: AvailableAuthoringRouteScreen = {
  status: 'available',
  moduleSpecifier: '@ankhorage/studio-authoring/screens',
  exportName: 'ScreensAuthoringScreen',
};

/*** Record the remaining owner boundaries instead of treating Studio-private implementations as portable screens. */
export const UNRESOLVED_AUTHORING_SCREEN_OWNER_BOUNDARIES: Readonly<
  Partial<Record<AnkhRouteId, { readonly owner: string; readonly missingPublicApi: string }>>
> = {
  'screen-detail': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi:
      'A portable ScreenMetadataSpec editor and route-reference projection; Studio AuthoringEditor and navigation models are host-private.',
  },
  media: {
    owner: 'consumer host',
    missingPublicApi:
      'A portable media-library and device-import port; Studio media services own project storage and device permissions.',
  },
  theme: {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi:
      'A portable theme-document mutation policy; ZORA publishes generic controls but intentionally does not own consumer theme persistence.',
  },
  'theme-colors': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable color-token document and mutation policy.',
  },
  'theme-typography': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable typography-token document and mutation policy.',
  },
  'theme-spacing': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable spacing-token document and mutation policy.',
  },
  'theme-radii': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable radii-token document and mutation policy.',
  },
  'theme-shadows': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable shadow-token document and mutation policy.',
  },
  'theme-component': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable recipe-document projection and mutation policy.',
  },
  'theme-pattern': {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi: 'A portable recipe-document projection and mutation policy.',
  },
  bindings: {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi:
      'A portable node-binding document and mutation policy; ZORA publishes the generic binding control adapter only.',
  },
  properties: {
    owner: '@ankhorage/studio-authoring',
    missingPublicApi:
      'A portable node-property document and mutation policy; ZORA publishes the generic property inspector adapter only.',
  },
};

/***
 * Declare every portable `/ankh` route in one platform-neutral registry.
 *
 * Expo Runtime owns turning these declarations into Expo Router files. A route remains unresolved
 * until Authoring or ZORA publishes its concrete portable screen module; no Studio-private module
 * specifier is exposed as a substitute. The exported owner-boundary map makes every remaining
 * missing public API explicit for downstream planners.
 */
export const AUTHORING_ANKH_ROUTE_DELIVERIES: readonly AuthoringRouteDeliveryDefinition[] = [
  {
    id: 'screens',
    pathPattern: '/ankh/screens',
    parameters: [],
    screen: SCREENS_AUTHORING_SCREEN,
  },
  {
    id: 'screen-detail',
    pathPattern: '/ankh/screens/:screenId',
    parameters: [{ name: 'screenId', encoding: 'single-path-segment' }],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  { id: 'media', pathPattern: '/ankh/media', parameters: [], screen: UNRESOLVED_AUTHORING_SCREEN },
  { id: 'theme', pathPattern: '/ankh/theme', parameters: [], screen: UNRESOLVED_AUTHORING_SCREEN },
  {
    id: 'theme-colors',
    pathPattern: '/ankh/theme/colors',
    parameters: [],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-typography',
    pathPattern: '/ankh/theme/typography',
    parameters: [],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-spacing',
    pathPattern: '/ankh/theme/spacing',
    parameters: [],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-radii',
    pathPattern: '/ankh/theme/radii',
    parameters: [],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-shadows',
    pathPattern: '/ankh/theme/shadows',
    parameters: [],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-component',
    pathPattern: '/ankh/theme/components/:recipeName',
    parameters: [{ name: 'recipeName', encoding: 'single-path-segment' }],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'theme-pattern',
    pathPattern: '/ankh/theme/patterns/:recipeName',
    parameters: [{ name: 'recipeName', encoding: 'single-path-segment' }],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'bindings',
    pathPattern: '/ankh/bindings/:nodeId',
    parameters: [{ name: 'nodeId', encoding: 'single-path-segment' }],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
  {
    id: 'properties',
    pathPattern: '/ankh/properties/:nodeId',
    parameters: [{ name: 'nodeId', encoding: 'single-path-segment' }],
    screen: UNRESOLVED_AUTHORING_SCREEN,
  },
];

/***
 * Record the `/ankh` routes whose portable manifest, selection, or theme-authoring policy belongs
 * here. Studio overview, APIs, modules, authentication, secrets, and deployment remain with their
 * respective product, host, or service owners.
 */
export const AUTHORING_ANKH_ROUTE_IDS: readonly AnkhRouteId[] = AUTHORING_ANKH_ROUTE_DELIVERIES.map(
  ({ id }) => id,
);

const SCREEN_ROUTE_PREFIX = '/ankh/screens/';
const THEME_COMPONENT_ROUTE_PREFIX = '/ankh/theme/components/';
const THEME_PATTERN_ROUTE_PREFIX = '/ankh/theme/patterns/';
const BINDINGS_ROUTE_PREFIX = '/ankh/bindings/';
const PROPERTIES_ROUTE_PREFIX = '/ankh/properties/';

const STATIC_AUTHORING_ROUTES: Readonly<Record<string, AnkhRouteId | undefined>> =
  Object.fromEntries(
    AUTHORING_ANKH_ROUTE_DELIVERIES.filter(({ parameters }) => parameters.length === 0).map(
      ({ id, pathPattern }) => [pathPattern, id],
    ),
  );

/*** Find the canonical delivery declaration for a portable Authoring route. */
export function getAuthoringRouteDelivery(routeId: AnkhRouteId): AuthoringRouteDeliveryDefinition {
  const route = AUTHORING_ANKH_ROUTE_DELIVERIES.find(({ id }) => id === routeId);
  if (!route) throw new Error(`Unknown Authoring route '${routeId}'.`);
  return route;
}

/*** Resolve the reusable authoring route identity while rejecting malformed paths. */
export function resolveAnkhRouteId(pathname: string): AnkhRouteId | null {
  if (pathname.startsWith(SCREEN_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, SCREEN_ROUTE_PREFIX)
      ? 'screen-detail'
      : null;
  }
  if (pathname.startsWith(THEME_COMPONENT_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, THEME_COMPONENT_ROUTE_PREFIX)
      ? 'theme-component'
      : null;
  }
  if (pathname.startsWith(THEME_PATTERN_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, THEME_PATTERN_ROUTE_PREFIX)
      ? 'theme-pattern'
      : null;
  }
  if (pathname.startsWith(BINDINGS_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, BINDINGS_ROUTE_PREFIX) ? 'bindings' : null;
  }
  if (pathname.startsWith(PROPERTIES_ROUTE_PREFIX)) {
    return decodeSinglePathSegmentAfterPrefix(pathname, PROPERTIES_ROUTE_PREFIX)
      ? 'properties'
      : null;
  }
  return Object.entries(STATIC_AUTHORING_ROUTES).find(([route]) => route === pathname)?.[1] ?? null;
}
