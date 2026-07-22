import assert from "node:assert/strict";
import test from "node:test";

import { resolvePassScan } from "./scan-handler";

const credentials = ["RVSN000100", "000163", "163", "MAINPUB-42", "VIP-A", "LIVEAID2026"];

for (const credential of credentials) {
  test(`resolvePassScan preserves opaque identifier ${credential}`, async () => {
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

test("resolvePassScan preserves case exactly (QR defines identity)", async () => {
  let received = "";
  const result = await resolvePassScan("rvsn000100", async (value) => {
    received = value;
    return null;
  });
  assert.equal(received, "rvsn000100");
  assert.equal(result.type, "ok");
});

test("resolvePassScan decodes URL encoding and trims only surrounding whitespace", async () => {
  let received = "";
  const result = await resolvePassScan("%20MAINPUB-42%20", async (value) => {
    received = value;
    return null;
  });
  assert.equal(received, "MAINPUB-42");
  assert.equal(result.type, "ok");
});

test("empty and malformed encoded credentials return 400", async () => {
  const scan = async () => {
    assert.fail("database should not be called");
    return null;
  };
  for (const encoded of ["%20%20", "%E0%A4%A", "foo%2Fbar"]) {
    const result = await resolvePassScan(encoded, scan);
    assert.equal(result.type, "error");
    if (result.type === "error") assert.equal(result.status, 400);
  }
});

test("unknown opaque identifiers are offered as unclaimed (no format 404)", async () => {
  const result = await resolvePassScan("EVENT-2026-0001", async () => null);
  assert.equal(result.type, "ok");
  if (result.type === "ok") {
    assert.equal(result.scan.state, "unclaimed");
    assert.equal(result.scan.pass.serial, "EVENT-2026-0001");
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
