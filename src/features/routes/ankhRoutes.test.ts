import { expect, test } from 'bun:test';

import { AUTHORING_ANKH_ROUTE_IDS, resolveAnkhRouteId } from './ankhRoutes.js';

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
});
