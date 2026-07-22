import assert from "node:assert/strict";
import test from "node:test";

import { BOOTH_ACTIVE_REJECTION, BoothAuthorityError } from "./booth-authority";

test("BoothAuthorityError carries stable code and message", () => {
  const err = new BoothAuthorityError();
  assert.equal(err.name, "BoothAuthorityError");
  assert.equal(err.code, "BOOTH_SESSION_ACTIVE");
  assert.equal(err.message, BOOTH_ACTIVE_REJECTION);
});
