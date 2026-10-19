import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { artistCreditLookupNames } from "./credit-name";

test("featured credits keep the full line and the primary artist", () => {
  assert.deepEqual(artistCreditLookupNames("Tina Turner"), ["Tina Turner"]);
  assert.deepEqual(artistCreditLookupNames("Daryl Hall & John Oates"), ["Daryl Hall & John Oates"]);
  assert.deepEqual(artistCreditLookupNames("Classics IV Featuring Dennis Yost"), [
    "Classics IV Featuring Dennis Yost",
    "Classics IV",
  ]);
  assert.deepEqual(artistCreditLookupNames("Soul II Soul feat. Caron Wheeler"), [
    "Soul II Soul feat. Caron Wheeler",
    "Soul II Soul",
  ]);
  assert.deepEqual(artistCreditLookupNames("Seals & Crofts (Featuring Carolyn Willis)"), [
    "Seals & Crofts (Featuring Carolyn Willis)",
    "Seals & Crofts",
  ]);
  assert.deepEqual(artistCreditLookupNames("   "), []);
});

test("artist identity index has no undefined keys", () => {
  const raw = gunzipSync(readFileSync(join(process.cwd(), "data/static-graph/artist-identities.json.gz")));
  const rows = JSON.parse(raw.toString("utf8")) as { canonical_name: string }[];
  const broken = rows.filter((row) => row.canonical_name.toLowerCase().includes("undefined"));
  assert.deepEqual(broken, []);
});
