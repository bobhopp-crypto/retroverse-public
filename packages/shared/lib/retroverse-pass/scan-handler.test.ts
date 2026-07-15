import assert from "node:assert/strict";
import test from "node:test";

import { handlePassScan } from "./scan-handler";

const credentials = ["RVSN000100", "RVSN000001", "RVSN500"];

for (const credential of credentials) {
  test(`scan preserves valid pass serial ${credential}`, async () => {
    let received = "";
    const response = await handlePassScan(
      new Request(`https://retroverse.live/pass/${encodeURIComponent(credential)}`),
      encodeURIComponent(credential),
      async (value) => { received = value; return null; },
    );
    assert.equal(received, credential);
    assert.equal(response.status, 200);
  });
}

test("scan normalizes case to the canonical uppercase serial", async () => {
  let received = "";
  const response = await handlePassScan(
    new Request("https://retroverse.live/pass/rvsn000100"),
    "rvsn000100",
    async (value) => { received = value; return null; },
  );
  assert.equal(received, "RVSN000100");
  assert.equal(response.status, 200);
});

test("scan decodes URL encoding and trims only surrounding whitespace", async () => {
  let received = "";
  const response = await handlePassScan(
    new Request("https://retroverse.live/pass/%20RVSN000100%20"),
    "%20RVSN000100%20",
    async (value) => { received = value; return null; },
  );
  assert.equal(received, "RVSN000100");
  assert.equal(response.status, 200);
});

test("empty and malformed encoded credentials return 400", async () => {
  const scan = async () => { assert.fail("database should not be called"); return null; };
  assert.equal((await handlePassScan(new Request("https://retroverse.live/pass/x"), "%20%20", scan)).status, 400);
  assert.equal((await handlePassScan(new Request("https://retroverse.live/pass/x"), "%E0%A4%A", scan)).status, 400);
});

test("well-formed but unrecognized-format credentials return a clean error, never hit the database", async () => {
  const scan = async () => { assert.fail("database should not be called"); return null; };
  const bad = ["EVENT-2026-0001", "notapass", "RVSN12", "RVSN123456789", "12345"];
  for (const credential of bad) {
    const response = await handlePassScan(
      new Request(`https://retroverse.live/pass/${encodeURIComponent(credential)}`),
      encodeURIComponent(credential),
      scan,
    );
    assert.equal(response.status, 404, `expected 404 for ${credential}`);
    assert.doesNotMatch(await response.text(), /internal|error:|at\s+\w+\s*\(/i);
  }
});

test("database failure returns 503", async () => {
  const response = await handlePassScan(
    new Request("https://retroverse.live/pass/RVSN500"),
    "RVSN500",
    async () => { throw new Error("database unavailable: internal host"); },
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /internal host/);
});
