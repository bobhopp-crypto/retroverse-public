/**
 * Site mode verification — run with: npx tsx tools/verify-site-mode.ts
 */
import assert from "node:assert/strict";

import {
  isLocalStudio,
  isProductionPublic,
  isPublicApiPath,
  isLocalOnlyPath,
  normalizeHost,
  resolveSiteMode,
  shouldAllowOpsRoutes,
} from "../lib/runtime/site-mode";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`fail ${name}`);
    throw error;
  }
}

const originalEnv = { ...process.env };

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  process.env = { ...originalEnv, ...overrides };
  try {
    fn();
  } finally {
    process.env = { ...originalEnv };
  }
}

test("normalizeHost strips port and www", () => {
  assert.equal(normalizeHost("localhost:3000"), "localhost");
  assert.equal(normalizeHost("www.retroverse.live"), "retroverse.live");
});

withEnv({ RETROVERSE_SITE_MODE: undefined, NODE_ENV: "development" }, () => {
  test("localhost is studio mode", () => {
    assert.equal(resolveSiteMode({ host: "localhost:3000" }), "studio");
    assert.equal(shouldAllowOpsRoutes("localhost:3000"), true);
    assert.equal(isLocalStudio("localhost:3000"), true);
    assert.equal(isProductionPublic("localhost:3000"), false);
  });
});

withEnv({ RETROVERSE_SITE_MODE: undefined, NODE_ENV: "production" }, () => {
  test("retroverse.live is public mode", () => {
    assert.equal(resolveSiteMode({ host: "retroverse.live" }), "public");
    assert.equal(shouldAllowOpsRoutes("retroverse.live"), false);
    assert.equal(isProductionPublic("retroverse.live"), true);
    assert.equal(isLocalStudio("retroverse.live"), false);
  });
});

withEnv({ RETROVERSE_SITE_MODE: "studio", NODE_ENV: "production" }, () => {
  test("explicit studio override on production host", () => {
    assert.equal(resolveSiteMode({ host: "retroverse.live" }), "studio");
    assert.equal(shouldAllowOpsRoutes("retroverse.live"), true);
  });
});

withEnv({ RETROVERSE_SITE_MODE: "public", NODE_ENV: "development" }, () => {
  test("explicit public override on localhost", () => {
    assert.equal(resolveSiteMode({ host: "localhost:3000" }), "public");
    assert.equal(shouldAllowOpsRoutes("localhost:3000"), false);
  });
});

test("local-only path classifier", () => {
  assert.equal(isLocalOnlyPath("/local"), true);
  assert.equal(isLocalOnlyPath("/bobos"), true);
  assert.equal(isLocalOnlyPath("/ops/studio"), true);
  assert.equal(isLocalOnlyPath("/ops/atlas/scripts"), true);
  assert.equal(isLocalOnlyPath("/api/ops/atlas/scripts/run"), true);
  assert.equal(isLocalOnlyPath("/experience/RVTR000001"), false);
});

test("public API classifier", () => {
  assert.equal(isPublicApiPath("/api/search"), true);
  assert.equal(isPublicApiPath("/api/live-now-playing"), true);
  assert.equal(isPublicApiPath("/api/ops/studio/status"), false);
});

console.log("\nAll site-mode checks passed.");
