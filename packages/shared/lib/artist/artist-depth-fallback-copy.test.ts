import assert from "node:assert/strict";
import test from "node:test";

import { artistDepthFallbackBody } from "./artist-depth-fallback-copy";

test("fallback copy mentions a song only when the visit has one", () => {
  assert.equal(
    artistDepthFallbackBody("Madonna", "/retroverse-2/song/RVTR528167"),
    "Madonna is on this song, and the canonical artist page is not linked yet.",
  );
  assert.equal(
    artistDepthFallbackBody("Madonna", null),
    "The canonical artist page for Madonna is not linked yet.",
  );
  assert.equal(
    artistDepthFallbackBody("Madonna"),
    "The canonical artist page for Madonna is not linked yet.",
  );
  assert.equal(
    artistDepthFallbackBody("  ", ""),
    "The canonical artist page for This artist is not linked yet.",
  );
});
