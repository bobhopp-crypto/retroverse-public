import assert from "node:assert/strict";
import test from "node:test";

import { claimPass, PassRegistrationInputError, updatePassVisitor } from "./store";

test("claim validates the credential before opening the store", async () => {
  await assert.rejects(
    claimPass({ serial: "bad/path", firstName: "Pat" }),
    (error) => error instanceof PassRegistrationInputError && error.message === "Invalid pass credential.",
  );
});

test("edit requires the visitor's first name before opening the store", async () => {
  await assert.rejects(
    updatePassVisitor({ serial: "RVSN000001", firstName: "  " }),
    (error) => error instanceof PassRegistrationInputError && error.message === "First name is required.",
  );
});
