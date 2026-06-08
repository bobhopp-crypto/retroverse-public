/**
 * Retroverse Tags canonical store — RVTR is source of truth, VDJ is import-only.
 * Run: npx tsx tools/year-review/test-retroverse-tags-canonical.ts
 */
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { resolveRetroverseTags } from "../../lib/ops/retroverse-tags/resolve";
import {
  loadRetroverseTagsStore,
  normalizeRvtr,
  saveRetroverseTagsForRvtr,
  tagsForRvtr,
} from "../../lib/ops/retroverse-tags/store";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(normalizeRvtr("rvtr123456") === "RVTR123456", "normalize RVTR");
assert(normalizeRvtr("bad") === null, "reject bad RVTR");

const resolvedCanonical = resolveRetroverseTags({
  canonicalTags: ["Motown"],
  legacyReviewTags: ["DeepCut"],
  vdjUser2Raw: "#Soul",
});
assert(resolvedCanonical.source === "canonical", "RVTR store wins");
assert(resolvedCanonical.tags.join(",") === "Motown", "canonical tags returned");

const resolvedImport = resolveRetroverseTags({
  canonicalTags: [],
  legacyReviewTags: [],
  vdjUser2Raw: "#Soul Motown",
});
assert(resolvedImport.source === "vdj_import", "VDJ is import hint");
assert(resolvedImport.pendingCanonicalSave === true, "VDJ import pending canonical save");

const resolvedLegacy = resolveRetroverseTags({
  canonicalTags: [],
  legacyReviewTags: ["DeepCut"],
  vdjUser2Raw: "#Soul",
});
assert(resolvedLegacy.source === "legacy_review", "legacy review fallback");

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "rv-rvtr-tags-"));
  const prev = process.env.RETROVERSE_DATA_ROOT;
  process.env.RETROVERSE_DATA_ROOT = dir;

  try {
    await mkdir(join(dir, "ops"), { recursive: true });
    const rvtr = "RVTR336241";

    await saveRetroverseTagsForRvtr(rvtr, ["Motown", "Soul"]);
    const store = await loadRetroverseTagsStore();
    assert(tagsForRvtr(store, rvtr).length === 2, "tags on RVTR");

    const disk = JSON.parse(
      await readFile(join(dir, "ops", "retroverse-tags-by-rvtr.json"), "utf8"),
    ) as { tracks: Record<string, { tags: string[] }> };
    assert(disk.tracks[rvtr]?.tags?.includes("Motown"), "tags on disk by RVTR");

    console.log("Retroverse Tags canonical store: all checks passed");
  } finally {
    process.env.RETROVERSE_DATA_ROOT = prev;
    await rm(dir, { recursive: true, force: true });
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
