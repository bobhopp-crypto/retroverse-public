/**
 * Full image pipeline trace — no UI changes.
 * Usage: npx tsx tools/creative-lab/trace-image-pipeline.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
loadEnvFile(".env");

import { generateOpenAIArtwork } from "../../lib/ops/creative-lab/artwork/openai-provider";
import { resolveArtworkProvider, isArtworkProviderConfigured } from "../../lib/ops/creative-lab/artwork/provider-config";
import { creativeLabProjectGeneratedDir } from "../../lib/ops/creative-lab/paths";
import { renderPassConceptPrompt } from "../../lib/ops/creative-lab/pass-concept-prompt";
import {
  createProject,
  generatePassConceptsForProject,
  loadProject,
} from "../../lib/ops/creative-lab/projects";
import { retroverseDataRoot } from "../../lib/retroverse-data-root";

type Step = { step: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };

const steps: Step[] = [];

function record(step: string, status: "PASS" | "FAIL" | "SKIP", detail: string) {
  steps.push({ step, status, detail });
  console.log(`[${status}] ${step}: ${detail}`);
}

async function main() {
  console.log("=== Creative Lab Image Pipeline Trace ===\n");

  const provider = resolveArtworkProvider();
  record(
    "1. Provider config",
    isArtworkProviderConfigured(provider) ? "PASS" : "FAIL",
    `provider=${provider} OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? "set" : "MISSING"}`,
  );

  const prompt = renderPassConceptPrompt({
    worldId: "psychedelic-festival",
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1971, 1982, 2000],
    conceptKey: "A",
  });

  record("2. Prompt builder", prompt.includes("Illustrate a finished") ? "PASS" : "FAIL", `${prompt.length} chars`);

  if (!isArtworkProviderConfigured(provider)) {
    record("3. OpenAI call", "SKIP", "No API key — cannot test");
    printSummary();
    process.exit(1);
  }

  try {
    const t0 = Date.now();
    const result = await generateOpenAIArtwork(
      {
        prompt,
        artifactTypeId: "vip-pass",
        event: "Sunday Nights",
        venue: "The Main Pub",
        date: "June 14, 2026",
        featuredYears: [1971, 1982, 2000],
        module: "pass-lab",
        artDirectionTitle: "Psychedelic Festival",
      },
      { count: 1, quality: "medium", size: "1024x1536" },
    );
    const ms = Date.now() - t0;
    const img = result.images[0];
    record(
      "3. OpenAI response",
      img?.buffer?.length ? "PASS" : "FAIL",
      `images=${result.images.length} bytes=${img?.buffer?.length ?? 0} ms=${ms}`,
    );
  } catch (e) {
    record("3. OpenAI response", "FAIL", e instanceof Error ? e.message : String(e));
    printSummary();
    process.exit(1);
  }

  const project = await createProject({
    name: "Trace Test VIP Pass",
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1971, 1982, 2000],
    artifactType: "vip-pass",
  });
  record("4. Project create", project.id ? "PASS" : "FAIL", `id=${project.id} folder=${project.folderSlug}`);

  const genDir = creativeLabProjectGeneratedDir(project.folderSlug || project.id);
  record("5. Generated dir", existsSync(genDir) ? "PASS" : "FAIL", genDir);

  try {
    const t0 = Date.now();
    const updated = await generatePassConceptsForProject(project.id, "psychedelic-festival");
    const ms = Date.now() - t0;
    if (!updated) {
      record("6. generatePassConcepts", "FAIL", "returned null");
    } else {
      const pngAssets = updated.assets.filter((a) => a.filePath?.endsWith(".png"));
      const linked = updated.generatedPrompts.filter((p) => p.assetId).length;
      record(
        "6. generatePassConcepts",
        pngAssets.length >= 4 ? "PASS" : "FAIL",
        `prompts=${updated.generatedPrompts.length} pngAssets=${pngAssets.length} linked=${linked} ms=${ms}`,
      );

      for (const a of pngAssets.slice(0, 4)) {
        const abs = join(genDir, `${a.id}.png`);
        const exists = existsSync(abs);
        record(
          `7. PNG write [${a.concept}]`,
          exists ? "PASS" : "FAIL",
          `${abs} (${exists ? readFileSync(abs).length : 0} bytes) filePath=${a.filePath}`,
        );
      }

      const reloaded = await loadProject(project.id);
      const first = reloaded?.generatedPrompts[0];
      record(
        "8. Asset registration",
        first?.assetId && reloaded?.assets.some((a) => a.id === first.assetId) ? "PASS" : "FAIL",
        `prompt.assetId=${first?.assetId ?? "none"}`,
      );

      const slug = updated.folderSlug || updated.id;
      const assetId = pngAssets[0]?.id;
      if (assetId) {
        const url = `http://localhost:3001/api/ops/creative-lab/projects/${encodeURIComponent(slug)}/assets/${encodeURIComponent(assetId)}`;
        record("9. Browser URL", "PASS", url);
        try {
          const res = await fetch(url, { headers: { cookie: "retroverse_ops_gate=ok" } });
          const ct = res.headers.get("content-type") ?? "";
          record(
            "10. HTTP asset fetch",
            res.ok && ct.includes("image/png") ? "PASS" : "FAIL",
            `status=${res.status} content-type=${ct} body=${res.ok ? (await res.arrayBuffer()).byteLength : await res.text()}`,
          );
        } catch (e) {
          record("10. HTTP asset fetch", "FAIL", e instanceof Error ? e.message : String(e));
        }
      }
    }
  } catch (e) {
    record("6. generatePassConcepts", "FAIL", e instanceof Error ? e.message : String(e));
  }

  console.log("\n--- Existing projects PNG inventory ---");
  const projectsRoot = join(retroverseDataRoot(), "creative_lab", "projects");
  if (existsSync(projectsRoot)) {
    for (const folder of readdirSync(projectsRoot)) {
      const g = join(projectsRoot, folder, "generated");
      if (!existsSync(g)) continue;
      const pngs = readdirSync(g).filter((f) => f.endsWith(".png"));
      const placeholders = readdirSync(g).filter((f) => f.includes("placeholder"));
      if (pngs.length || placeholders.length) {
        console.log(`  ${folder}: ${pngs.length} png, ${placeholders.length} placeholder`);
      }
    }
  }

  printSummary();
  if (steps.some((s) => s.status === "FAIL")) process.exit(1);
}

function printSummary() {
  console.log("\n=== Pipeline Trace Summary ===");
  for (const s of steps) console.log(`${s.status.padEnd(4)} ${s.step} — ${s.detail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
