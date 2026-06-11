/**
 * Verify serial stamp zone prompt coverage + unobstructed stamp area in generated PNGs.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/creative-lab/verify-serial-stamp.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { creativeLabProjectDir } from "../../lib/ops/creative-lab/paths";
import {
  FULL_BLEED_FRONT_PROMPT,
  NO_GENERATED_NUMBERING_PROMPT,
  renderPassConceptPrompt,
} from "../../lib/ops/creative-lab/pass-concept-prompt";
import { integratedBackFunctionalZonesPrompt } from "../../lib/ops/creative-lab/pass-layout";
import { CONCEPT_KEYS } from "../../lib/ops/creative-lab/visual-worlds";
import type { VisualWorldId } from "../../lib/ops/creative-lab/visual-worlds";
import { VISUAL_WORLDS } from "../../lib/ops/creative-lab/visual-worlds";

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

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3000";

const FRONT_BLEED_PHRASES = [
  "100% ARTWORK",
  "NO RESERVED ZONES",
  "No stamp panel",
  "full bleed",
];

const BACK_ZONE_PHRASES = [
  "INTEGRATED SERIAL ZONE (BACK ONLY",
  "INTEGRATED QR ZONE (BACK ONLY",
];

const NO_NUMBER_PHRASES = [
  "NO GENERATED NUMBERS ANYWHERE",
  "fake ticket numbers",
  "limited-edition tallies",
];

const MUSIC_TV_PHRASES = [
  "SUNDAY NIGHTS DIRECTION",
  "Do NOT use cartoon characters",
  "Music culture, not cartoon culture",
];

const MUSIC_TV_CONCEPT_LABELS = [
  "MTV Broadcast Credential",
  "VIP All Access Laminate",
  "Concert Guest Pass",
  "Music Television Collector Pass",
];

type StampMetrics = {
  assetId: string;
  meanR: number;
  meanG: number;
  meanB: number;
  variance: number;
  aboveVariance: number;
  edgeScore: number;
  creamScore: boolean;
  calmerThanAbove: boolean;
  darkRatio: number;
  pass: boolean;
};

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: "retroverse_ops_gate=ok",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

function verifyPromptCoverage(): string[] {
  const findings: string[] = [];
  for (const world of VISUAL_WORLDS) {
    for (const key of CONCEPT_KEYS) {
      const prompt = renderPassConceptPrompt({
        worldId: world.id,
        event: "Sunday Nights",
        venue: "The Main Pub",
        date: "June 14, 2026",
        featuredYears: [1971, 1982, 2000],
        conceptKey: key,
      });
      const required = [...FRONT_BLEED_PHRASES, ...NO_NUMBER_PHRASES];
      if (world.id === "music-television-credential") {
        required.push(...MUSIC_TV_PHRASES, MUSIC_TV_CONCEPT_LABELS[["A", "B", "C", "D"].indexOf(key)]);
      }
      const missing = required.filter((p) => p && !prompt.includes(p));
      const backPrompt = integratedBackFunctionalZonesPrompt();
      const backOk = BACK_ZONE_PHRASES.every((p) => backPrompt.includes(p));
      const ok =
        missing.length === 0 &&
        prompt.includes(FULL_BLEED_FRONT_PROMPT.slice(0, 40)) &&
        prompt.includes(NO_GENERATED_NUMBERING_PROMPT.slice(0, 40)) &&
        backOk;
      findings.push(
        `prompt_${world.id}_${key}: ${ok ? "PASS" : "FAIL"}${missing.length ? ` missing=${missing.join("|")}` : ""}`,
      );
    }
  }
  return findings;
}

async function analyzeStampRegion(
  page: import("playwright").Page,
  imageUrl: string,
  assetId: string,
): Promise<StampMetrics> {
  return page.evaluate(
    async ({ url, id }) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image_load_failed"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no_canvas");

      ctx.drawImage(img, 0, 0);
      const w = canvas.width;
      const h = canvas.height;
      const boxW = Math.round(w * 0.264);
      const boxH = Math.round(h * 0.096);
      const x0 = Math.round((w - boxW) / 2);
      const y0 = h - boxH;
      const inset = Math.max(6, Math.round(Math.min(boxW, boxH) * 0.12));
      const coreInset = Math.max(10, Math.round(Math.min(boxW, boxH) * 0.28));
      const sx = x0 + inset;
      const sy = y0 + inset;
      const sw = boxW - inset * 2;
      const sh = boxH - inset * 2;
      const stampData = ctx.getImageData(sx, sy, sw, sh).data;
      const coreData = ctx.getImageData(
        x0 + coreInset,
        y0 + coreInset,
        boxW - coreInset * 2,
        boxH - coreInset * 2,
      ).data;
      const coreN = (boxW - coreInset * 2) * (boxH - coreInset * 2);
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumSq = 0;
      let edge = 0;
      const n = sw * sh;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 4;
          const r = stampData[i];
          const g = stampData[i + 1];
          const b = stampData[i + 2];
          const lum = (r + g + b) / 3;
          sumR += r;
          sumG += g;
          sumB += b;
          sumSq += lum * lum;
          if (x > 0 && y > 0) {
            const pi = ((y - 1) * sw + (x - 1)) * 4;
            edge +=
              Math.abs(r - stampData[pi]) +
              Math.abs(g - stampData[pi + 1]) +
              Math.abs(b - stampData[pi + 2]);
          }
        }
      }
      const meanR = sumR / n;
      const meanG = sumG / n;
      const meanB = sumB / n;
      const meanLum = (meanR + meanG + meanB) / 3;
      const variance = sumSq / n - meanLum * meanLum;
      const edgeScore = edge / n;

      const aboveY = Math.max(0, y0 - boxH);
      const ah = Math.min(boxH, y0 - aboveY);
      const aboveData = ctx.getImageData(x0, aboveY, boxW, ah).data;
      let aSum = 0;
      let aSumSq = 0;
      const an = boxW * ah;
      for (let y = 0; y < ah; y++) {
        for (let x = 0; x < boxW; x++) {
          const i = (y * boxW + x) * 4;
          const lum = (aboveData[i] + aboveData[i + 1] + aboveData[i + 2]) / 3;
          aSum += lum;
          aSumSq += lum * lum;
        }
      }
      const aMeanLum = aSum / an;
      const aboveVariance = aSumSq / an - aMeanLum * aMeanLum;
      let darkPixels = 0;
      const coreW = boxW - coreInset * 2;
      const coreH = boxH - coreInset * 2;
      for (let y = 0; y < coreH; y++) {
        for (let x = 0; x < coreW; x++) {
          const i = (y * coreW + x) * 4;
          const lum = (coreData[i] + coreData[i + 1] + coreData[i + 2]) / 3;
          if (lum < 72) darkPixels += 1;
        }
      }
      const darkRatio = darkPixels / coreN;
      const creamScore =
        meanR > 155 &&
        meanG > 125 &&
        meanB > 85 &&
        (meanR + meanG + meanB) / 3 > 140 &&
        Math.abs(meanR - meanG) < 55;
      const calmerThanAbove =
        aboveVariance > 50 ? variance <= aboveVariance * 0.95 : true;
      const pass = creamScore && variance < 7600 && edgeScore < 42 && darkRatio < 0.25;

      return {
        assetId: id,
        meanR: Math.round(meanR),
        meanG: Math.round(meanG),
        meanB: Math.round(meanB),
        variance: Math.round(variance),
        aboveVariance: Math.round(aboveVariance),
        edgeScore: Math.round(edgeScore * 10) / 10,
        creamScore,
        calmerThanAbove,
        darkRatio: Math.round(darkRatio * 1000) / 1000,
        pass,
      };
    },
    { url: imageUrl, id: assetId },
  );
}

async function analyzeProjectAssets(
  project: { folderSlug?: string; id?: string; assets: Array<{ id: string; filePath?: string; concept?: string }> },
  findings: string[],
) {
  const pngAssets = project.assets.filter((a) => a.filePath?.endsWith(".png")).slice(0, 4);
  const folder = project.folderSlug || project.id || "";
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();

  console.log("\n=== STAMP ZONE ANALYSIS (bottom-center 22%×8%) ===");
  for (const asset of pngAssets) {
    const abs = join(creativeLabProjectDir(folder), asset.filePath!);
    const exists = existsSync(abs);
    let metrics: StampMetrics | null = null;
    if (exists) {
      const dataUrl = `data:image/png;base64,${readFileSync(abs).toString("base64")}`;
      metrics = await analyzeStampRegion(page, dataUrl, asset.id);
      findings.push(
        `stamp_${asset.concept ?? asset.id}: ${metrics.pass ? "PASS" : "FAIL"} rgb=(${metrics.meanR},${metrics.meanG},${metrics.meanB}) var=${metrics.variance} above=${metrics.aboveVariance} edge=${metrics.edgeScore}`,
      );
    } else {
      findings.push(`stamp_${asset.id}: FAIL file_missing`);
    }
    console.log(asset.concept ?? asset.id, metrics ?? "MISSING");
  }

  await browser.close();
}

async function main() {
  const findings = verifyPromptCoverage();
  console.log("=== PROMPT COVERAGE ===");
  console.log(findings.join("\n"));

  const analyzeOnly = process.env.CL_ANALYZE_PROJECT?.trim();
  if (analyzeOnly) {
    const get = await req("GET", `/api/ops/creative-lab/projects/${analyzeOnly}`);
    if (get.status !== 200) {
      console.error("analyze project not found", analyzeOnly);
      process.exit(1);
    }
    const project = get.json.project as {
      folderSlug: string;
      assets: Array<{ id: string; filePath?: string; concept?: string }>;
    };
    await analyzeProjectAssets(project, findings);
    console.log("\n=== SUMMARY ===");
    console.log(findings.filter((f) => f.startsWith("stamp_")).join("\n"));
    process.exit(findings.some((f) => f.includes("FAIL")) ? 1 : 0);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("\nOPENAI_API_KEY required for image generation verification");
    process.exit(findings.some((f) => f.includes("FAIL")) ? 1 : 0);
  }

  const worldId = (process.env.CL_WORLD_ID ?? "music-television-credential") as VisualWorldId;
  const worldLabel =
    worldId === "music-television-credential"
      ? "Sunday Nights Music TV Credential"
      : "Serial Stamp Verification";

  const create = await req("POST", "/api/ops/creative-lab/projects", {
    name: worldLabel,
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1971, 1982, 2000],
    artifactType: "vip-pass",
  });
  if (create.status !== 200) {
    console.error("create failed", create.status, create.json);
    process.exit(1);
  }

  const projectId = (create.json.project as { id: string }).id;

  await req("PUT", `/api/ops/creative-lab/projects/${projectId}`, {
    selectedArtDirectionId: worldId,
    name: worldLabel,
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1971, 1982, 2000],
    artifactType: "vip-pass",
  });

  console.log(`\n=== GENERATE 4 CONCEPTS (${worldId}) ===`);
  const gen = await req("PUT", `/api/ops/creative-lab/projects/${projectId}`, {
    op: "generatePasses",
    visualWorldId: worldId,
  });
  if (gen.status !== 200) {
    console.error("generatePasses failed", gen.status, gen.json);
    process.exit(1);
  }

  const project = gen.json.project as {
    id: string;
    folderSlug: string;
    assets: Array<{ id: string; filePath?: string; concept?: string }>;
  };
  console.log(`project=${projectId} pngAssets=${project.assets.filter((a) => a.filePath?.endsWith(".png")).length}`);
  await analyzeProjectAssets(project, findings);

  console.log("\n=== SUMMARY ===");
  console.log(findings.filter((f) => f.startsWith("stamp_")).join("\n"));
  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
