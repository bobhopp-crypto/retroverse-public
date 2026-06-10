/**
 * Phase 11 — Front approval / back generation verification.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/creative-lab/phase11-verify.ts
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
process.env.RETROVERSE_OPS = process.env.RETROVERSE_OPS ?? "1";

import { creativeLabProjectDir } from "../../lib/ops/creative-lab/paths";
import {
  createProject,
  generateBackConceptsForProject,
  generatePassConceptsForProject,
  lockFrontAsset,
  setSelectedConcept,
} from "../../lib/ops/creative-lab/projects";
import { renderPassBackPrompt } from "../../lib/ops/creative-lab/pass-back-prompt";

type PngInfo = { width: number; height: number; bytes: number };

function pngDimensions(buffer: Buffer): PngInfo | null {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), bytes: buffer.length };
}

async function main() {
  const reportLines: string[] = [];
  const log = (line: string) => {
    console.log(line);
    reportLines.push(line);
  };

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY required for Phase 11 verification");
  }

  log("# Phase 11 — Front Approval / Back Generation\n");
  log(`Run: ${new Date().toISOString()}\n`);

  const project = await createProject({
    name: "Phase 11 Verify",
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1967, 1978, 1992],
    theme: "Where the years keep playing.",
    artifactType: "vip-pass",
  });
  log(`- Created project: \`${project.id}\``);

  log("\n## 1. Generate front concepts");
  let updated = await generatePassConceptsForProject(project.id, "music-television-credential");
  if (!updated) throw new Error("front_generation_failed");
  const frontPrompts = updated.generatedPrompts.filter((p) => (p.passSide ?? "front") !== "back");
  log(`- Front prompts: ${frontPrompts.length}`);
  if (frontPrompts.length < 4) throw new Error(`Expected 4 fronts, got ${frontPrompts.length}`);

  const winner = frontPrompts[0];
  updated = (await setSelectedConcept(project.id, winner.id)) ?? updated;
  log(`- Selected front: Concept ${winner.variationKey} (\`${winner.assetId}\`)`);

  log("\n## 2. Lock front");
  updated = (await lockFrontAsset(project.id)) ?? updated;
  if (!updated.frontLocked || !updated.lockedFrontAssetId) {
    throw new Error("front_lock_failed");
  }
  log(`- Front locked: \`${updated.lockedFrontAssetId}\``);

  log("\n## 3. Back prompt coverage");
  const sampleBackPrompt = renderPassBackPrompt({
    worldId: "music-television-credential",
    event: updated.event,
    venue: updated.venue,
    date: updated.date,
    featuredYears: updated.featuredYears,
    theme: updated.theme,
    conceptKey: "A",
    frontConceptSummary: winner.conceptSummary,
    frontCompositionLabel: "MTV Broadcast Credential",
  });
  const requiredPhrases = [
    "REVERSE SIDE",
    "Retroverse.live",
    "QR code",
    "PHYSICAL NUMBERING PANEL",
    "palette",
  ];
  for (const phrase of requiredPhrases) {
    if (!sampleBackPrompt.includes(phrase) && !sampleBackPrompt.toLowerCase().includes(phrase.toLowerCase())) {
      throw new Error(`Back prompt missing: ${phrase}`);
    }
  }
  log("- Back prompt includes event metadata, QR placeholder, stamp panel, palette lock");

  log("\n## 4. Generate 4 matching backs (OpenAI — ~2–4 min)");
  updated = (await generateBackConceptsForProject(project.id)) ?? updated;
  const backPrompts = updated.generatedPrompts.filter(
    (p) => p.passSide === "back" && p.variationSetId === updated.backVariationSetId,
  );
  log(`- Back prompts: ${backPrompts.length}`);
  if (backPrompts.length !== 4) throw new Error(`Expected 4 backs, got ${backPrompts.length}`);

  const folderId = updated.folderSlug || updated.id;
  const root = creativeLabProjectDir(folderId);
  const frontPath = join(root, updated.assets.find((a) => a.id === updated.lockedFrontAssetId)?.filePath ?? "");
  const frontBuf = readFileSync(frontPath);
  const frontInfo = pngDimensions(frontBuf);
  log(`- Locked front PNG: ${frontInfo?.width}×${frontInfo?.height}, ${frontInfo?.bytes} bytes`);

  log("\n## 5. Visual consistency checks");
  let pass = true;
  for (const bp of backPrompts) {
    if (bp.parentFrontAssetId !== updated.lockedFrontAssetId) {
      pass = false;
      log(`- FAIL back ${bp.variationKey}: parentFrontAssetId mismatch`);
    }
    const asset = updated.assets.find((a) => a.id === bp.assetId);
    if (!asset?.filePath?.endsWith(".png")) {
      pass = false;
      log(`- FAIL back ${bp.variationKey}: missing PNG`);
      continue;
    }
    const buf = readFileSync(join(root, asset.filePath));
    const info = pngDimensions(buf);
    if (!info || info.width !== frontInfo?.width || info.height !== frontInfo?.height) {
      pass = false;
      log(`- FAIL back ${bp.variationKey}: dimension mismatch ${info?.width}×${info?.height}`);
    } else {
      log(`- PASS back ${bp.variationKey}: ${info.width}×${info.height}, parent linked, on disk`);
    }
  }

  if (!pass) throw new Error("visual_consistency_failed");

  log("\n## Result: PASS");
  log(`Project folder: \`${root}\``);

  const reportPath = "reports/creative-lab/phase11-front-back-verification.md";
  mkdirSync("reports/creative-lab", { recursive: true });
  writeFileSync(reportPath, `${reportLines.join("\n")}\n`, "utf8");
  console.log(`\nReport: ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
