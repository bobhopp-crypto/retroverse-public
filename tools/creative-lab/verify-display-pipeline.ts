/**
 * Verify PNG write → asset registration → HTTP serve (no OpenAI).
 * Proves display chain works when PNG files exist.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { writeArtworkAssetFile } from "../../lib/ops/creative-lab/assets";
import { creativeLabProjectGeneratedDir } from "../../lib/ops/creative-lab/paths";
import { createProject, loadProject, saveProject } from "../../lib/ops/creative-lab/projects";

// 1x1 red PNG
const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  const project = await createProject({
    name: "Display Pipeline Test",
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 14, 2026",
    featuredYears: [1971, 1982, 2000],
    artifactType: "vip-pass",
  });

  const folderId = project.folderSlug || project.id;
  const assetId = `asset-display-test-${Date.now().toString(36)}`;
  const promptId = `prompt-display-test-${Date.now().toString(36)}`;
  const rel = await writeArtworkAssetFile(folderId, assetId, MINI_PNG);
  const abs = join(creativeLabProjectGeneratedDir(folderId), `${assetId}.png`);

  const now = new Date().toISOString();
  const updated = await saveProject({
    ...project,
    selectedArtDirectionId: "psychedelic-festival",
    generatedPrompts: [
      {
        id: promptId,
        module: "pass-lab",
        conceptSummary: "Display test",
        renderedPrompt: "test",
        variationKey: "A",
        variationSetId: `set-display-test`,
        assetId,
        structuredConcept: {
          event: project.event,
          venue: project.venue,
          date: project.date,
          featuredYears: project.featuredYears,
          theme: "",
          dominantStyles: { credential: [], illustration: [], color: [], density: [] },
          module: "pass-lab",
          variationKey: "A",
        },
        createdAt: now,
      },
    ],
    assets: [
      {
        id: assetId,
        projectId: project.id,
        type: "pass-front",
        concept: "A",
        status: "generated",
        createdAt: now,
        filePath: rel,
        promptId,
        module: "pass-lab",
      },
    ],
  });

  console.log("PROJECT_ID", updated.id);
  console.log("FOLDER", folderId);
  console.log("PNG_ABS", abs);
  console.log("PNG_EXISTS", existsSync(abs), "bytes", existsSync(abs) ? readFileSync(abs).length : 0);
  console.log("ASSET_URL", `/api/ops/creative-lab/projects/${folderId}/assets/${assetId}`);

  const reloaded = await loadProject(updated.id);
  const asset = reloaded?.assets.find((a) => a.id === assetId);
  console.log("RELOADED_FILEPATH", asset?.filePath);
  console.log("RELOADED_PROMPT_ASSETID", reloaded?.generatedPrompts[0]?.assetId);

  const base = process.env.CL_CAPTURE_BASE ?? "http://localhost:3002";
  const url = `${base}/api/ops/creative-lab/projects/${encodeURIComponent(folderId)}/assets/${encodeURIComponent(assetId)}`;
  const res = await fetch(url, { headers: { cookie: "retroverse_ops_gate=ok" } });
  console.log("HTTP_STATUS", res.status);
  console.log("HTTP_CONTENT_TYPE", res.headers.get("content-type"));
  console.log("HTTP_BYTES", res.ok ? (await res.arrayBuffer()).byteLength : await res.text());

  const genDir = creativeLabProjectGeneratedDir(folderId);
  console.log("GENERATED_DIR_LISTING", readdirSync(genDir).filter((f) => f.endsWith(".png")));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
