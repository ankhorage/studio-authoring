import { expect, test } from 'bun:test';

import {
  AUTHORING_ANKH_ROUTE_DELIVERIES,
  AUTHORING_ANKH_ROUTE_IDS,
  getAuthoringRouteDelivery,
  resolveAnkhRouteId,
} from './ankhRoutes.js';

test('authoring route model covers the portable /ankh surface without host-owned routes', () => {
  expect(AUTHORING_ANKH_ROUTE_IDS).toEqual([
    'screens',
    'screen-detail',
    'media',
    'theme',
    'theme-colors',
    'theme-typography',
    'theme-spacing',
    'theme-radii',
    'theme-shadows',
    'theme-component',
    'theme-pattern',
    'bindings',
    'properties',
  ]);
  expect(resolveAnkhRouteId('/ankh/screens')).toBe('screens');
  expect(resolveAnkhRouteId('/ankh/screens/screen%20one')).toBe('screen-detail');
  expect(resolveAnkhRouteId('/ankh/properties/node-1')).toBe('properties');
  expect(resolveAnkhRouteId('/ankh/bindings/node-1')).toBe('bindings');
  expect(resolveAnkhRouteId('/ankh/media')).toBe('media');
  expect(resolveAnkhRouteId('/ankh/theme/colors')).toBe('theme-colors');
  expect(resolveAnkhRouteId('/ankh/theme/components/Button%20%2F%20primary')).toBe(
    'theme-component',
  );
  expect(resolveAnkhRouteId('/ankh/theme/patterns/Panel')).toBe('theme-pattern');
  expect(resolveAnkhRouteId('/ankh')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/apis')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/modules')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/auth')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/secrets')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/deploy')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/screens/')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/screens/one/extra')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/screens/%E0%A4%A')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/bindings/one/extra')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/bindings/%E0%A4%A')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/properties/one/extra')).toBeNull();
  expect(resolveAnkhRouteId('/ankh/properties/%E0%A4%A')).toBeNull();
});

test('authoring route delivery declarations preserve canonical patterns and fail closed on missing screens', () => {
  expect(AUTHORING_ANKH_ROUTE_DELIVERIES.map(({ id }) => id)).toEqual([
    ...AUTHORING_ANKH_ROUTE_IDS,
  ]);
  expect(AUTHORING_ANKH_ROUTE_DELIVERIES.map(({ pathPattern }) => pathPattern)).toEqual([
    '/ankh/screens',
    '/ankh/screens/:screenId',
    '/ankh/media',
    '/ankh/theme',
    '/ankh/theme/colors',
    '/ankh/theme/typography',
    '/ankh/theme/spacing',
    '/ankh/theme/radii',
    '/ankh/theme/shadows',
    '/ankh/theme/components/:recipeName',
    '/ankh/theme/patterns/:recipeName',
    '/ankh/bindings/:nodeId',
    '/ankh/properties/:nodeId',
  ]);
  expect(getAuthoringRouteDelivery('screen-detail').parameters).toEqual([
    { name: 'screenId', encoding: 'single-path-segment' },
  ]);
  expect(getAuthoringRouteDelivery('theme-component').parameters).toEqual([
    { name: 'recipeName', encoding: 'single-path-segment' },
  ]);
  expect(getAuthoringRouteDelivery('properties').parameters).toEqual([
    { name: 'nodeId', encoding: 'single-path-segment' },
  ]);
  expect(
    AUTHORING_ANKH_ROUTE_DELIVERIES.every(({ screen }) => screen.status === 'unresolved'),
  ).toBe(true);
  expect(() => getAuthoringRouteDelivery('unknown' as never)).toThrow(
    "Unknown Authoring route 'unknown'.",
  );
});
