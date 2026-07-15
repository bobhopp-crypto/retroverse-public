import assert from "node:assert/strict";
import test from "node:test";

import { resolvePassScan } from "./scan-handler";

const credentials = ["RVSN000100", "RVSN000001", "RVSN500"];

for (const credential of credentials) {
  test(`resolvePassScan preserves valid pass serial ${credential}`, async () => {
    let received = "";
    const result = await resolvePassScan(credential, async (value) => {
      received = value;
      return null;
    });
    assert.equal(received, credential);
    assert.equal(result.type, "ok");
    if (result.type === "ok") assert.equal(result.scan.pass.serial, credential);
  });
}

test("resolvePassScan normalizes case to the canonical uppercase serial", async () => {
  let received = "";
  const result = await resolvePassScan("rvsn000100", async (value) => {
    received = value;
    return null;
  });
  assert.equal(received, "RVSN000100");
  assert.equal(result.type, "ok");
});

test("resolvePassScan decodes URL encoding and trims only surrounding whitespace", async () => {
  let received = "";
  const result = await resolvePassScan("%20RVSN000100%20", async (value) => {
    received = value;
    return null;
  });
  assert.equal(received, "RVSN000100");
  assert.equal(result.type, "ok");
});

test("empty and malformed encoded credentials return 400", async () => {
  const scan = async () => {
    assert.fail("database should not be called");
    return null;
  };
  for (const encoded of ["%20%20", "%E0%A4%A"]) {
    const result = await resolvePassScan(encoded, scan);
    assert.equal(result.type, "error");
    if (result.type === "error") assert.equal(result.status, 400);
  }
});

test("well-formed but unrecognized-format credentials return a clean error, never hit the database", async () => {
  const scan = async () => {
    assert.fail("database should not be called");
    return null;
  };
  const bad = ["EVENT-2026-0001", "notapass", "RVSN12", "RVSN123456789", "12345"];
  for (const credential of bad) {
    const result = await resolvePassScan(encodeURIComponent(credential), scan);
    assert.equal(result.type, "error");
    if (result.type === "error") {
      assert.equal(result.status, 404, `expected 404 for ${credential}`);
      assert.doesNotMatch(result.message, /internal|error:|at\s+\w+\s*\(/i);
    }
  }
});

test("database failure returns 503", async () => {
  const result = await resolvePassScan("RVSN500", async () => {
    throw new Error("database unavailable: internal host");
  });
  assert.equal(result.type, "error");
  if (result.type === "error") {
    assert.equal(result.status, 503);
    assert.doesNotMatch(result.message, /internal host/);
  }
});
