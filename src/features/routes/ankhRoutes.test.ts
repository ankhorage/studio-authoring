import { expect, test } from "bun:test";

import { resolveAnkhRouteId } from "./ankhRoutes.js";

test("authoring route model accepts exactly the reusable /ankh surface", () => {
  expect(resolveAnkhRouteId("/ankh")).toBe("overview");
  expect(resolveAnkhRouteId("/ankh/screens")).toBe("screens");
  expect(resolveAnkhRouteId("/ankh/screens/screen%20one")).toBe(
    "screen-detail",
  );
  expect(resolveAnkhRouteId("/ankh/properties/node-1")).toBe("properties");
  expect(resolveAnkhRouteId("/ankh/bindings/node-1")).toBe("bindings");
  expect(resolveAnkhRouteId("/ankh/screens/")).toBeNull();
  expect(resolveAnkhRouteId("/ankh/screens/one/extra")).toBeNull();
  expect(resolveAnkhRouteId("/ankh/screens/%E0%A4%A")).toBeNull();
});
