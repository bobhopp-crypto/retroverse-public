/**
 * RV12 single-album pilot helper (RVAL823723).
 * Usage:
 *   npx tsx tools/run-rv12-pilot.ts status
 *   npx tsx tools/run-rv12-pilot.ts create --url "https://…"
 *   RETROVERSE_COVER_APPLY=1 npx tsx tools/run-rv12-pilot.ts promote --rv12 RV12000001
 */
import { readFile } from "node:fs/promises";

import { createRv12Asset } from "../lib/rv12/create-asset";
import { coverApplyEnabled } from "../lib/rv12/guardrails";
import { hashBuffer } from "../lib/rv12/image-meta";
import { listPromotionAudit, listRv12Assets } from "../lib/rv12/ledger";
import { loadAlbumByRval } from "../lib/rv12/load-album";
import { promoteRvalCover } from "../lib/rv12/promote-rval";
import { rollbackRvalCover } from "../lib/rv12/rollback-rval";
import { defaultCoverFsRoot, resolveCoverFilePath } from "../lib/cover-integrity/score";

const PILOT = "RVAL823723";

async function currentHash(): Promise<string | null> {
  const album = await loadAlbumByRval(PILOT);
  if (!album?.canonicalCoverPath) return null;
  const abs = resolveCoverFilePath(defaultCoverFsRoot(), album.canonicalCoverPath);
  if (!abs) return null;
  return hashBuffer(await readFile(abs));
}

async function main() {
  const cmd = process.argv[2] ?? "status";
  console.log(`RV12 pilot ${PILOT} · APPLY=${coverApplyEnabled() ? "1" : "0"}\n`);

  if (cmd === "status") {
    const h = await currentHash();
    const assets = await listRv12Assets();
    const audit = await listPromotionAudit(PILOT);
    console.log("Current hash:", h);
    console.log("RV12 assets:", assets.length);
    console.log("Audit rows:", audit.length);
    return;
  }

  if (cmd === "create") {
    const url = process.argv.find((a, i) => process.argv[i - 1] === "--url") ?? "";
    if (!url) {
      console.error("Need --url <image-or-discogs-url>");
      process.exit(1);
    }
    const asset = await createRv12Asset({
      sourceType: /discogs\.com/i.test(url) ? "discogs" : "url",
      sourceUrl: url,
      actor: "tools/run-rv12-pilot",
    });
    console.log("Created", asset.rv12Id, asset.contentHash);
    return;
  }

  if (cmd === "promote") {
    const rv12Id = process.argv.find((a, i) => process.argv[i - 1] === "--rv12") ?? "";
    if (!rv12Id) {
      console.error("Need --rv12 RV12######");
      process.exit(1);
    }
    const before = await currentHash();
    const result = await promoteRvalCover({
      rval: PILOT,
      rv12Id,
      actor: "tools/run-rv12-pilot",
      auditReason: "pilot cli",
    });
    console.log(JSON.stringify(result, null, 2));
    const after = await currentHash();
    console.log("Hash before:", before);
    console.log("Hash after:", after);
    return;
  }

  if (cmd === "rollback") {
    const result = await rollbackRvalCover(PILOT, "tools/run-rv12-pilot");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error("Commands: status | create --url | promote --rv12 | rollback");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
