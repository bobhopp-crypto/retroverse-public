import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { generateArtwork, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import type { ArtworkPromptContext } from "@/lib/ops/creative-lab/artwork/types";
import { creativeLabRvbrValidationRunDir } from "@/lib/ops/creative-lab/paths";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import {
  artDirectorPromptText,
  renderArtDirectorFrontPrompt,
} from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import {
  RVBR_VALIDATION_ERAS,
  rvbrEraVisualDnaForProfile,
} from "@/lib/ops/content-creator/rvbr-era-visual-dna";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type RvbrValidationResult = {
  runId: string;
  runDir: string;
  provider: string;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  eras: Array<{
    slug: string;
    name: string;
    years: string;
    accent: string | null;
    visualWorldId: string;
    filename: string;
    mandateSummary: string;
  }>;
  startedAt: string;
  completedAt: string;
};

function fields() {
  return {
    event: CONTENT_CREATOR_DEFAULTS.event,
    venue: CONTENT_CREATOR_DEFAULTS.venue,
    date: CONTENT_CREATOR_DEFAULTS.date,
    featuredYears: [...CONTENT_CREATOR_DEFAULTS.featuredYears],
    passTypeLabel: CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

function artworkContext(prompt: string, profile: RvbrProfile): ArtworkPromptContext {
  return {
    prompt,
    artifactTypeId: "vip-pass",
    event: CONTENT_CREATOR_DEFAULTS.event,
    venue: CONTENT_CREATOR_DEFAULTS.venue,
    date: CONTENT_CREATOR_DEFAULTS.date,
    featuredYears: CONTENT_CREATOR_DEFAULTS.featuredYears,
    module: "pass-lab",
    artDirectionTitle: profile.name,
    treatmentLabel: "rvbr-validation",
  };
}

export async function runRvbrValidation(
  profiles: RvbrProfile[],
): Promise<RvbrValidationResult> {
  const runId = `validate-${Date.now().toString(36)}`;
  const runDir = creativeLabRvbrValidationRunDir(runId);
  await mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const f = fields();
  const eras: RvbrValidationResult["eras"] = [];

  for (let i = 0; i < RVBR_VALIDATION_ERAS.length; i++) {
    const slug = RVBR_VALIDATION_ERAS[i]!;
    const profile = profiles.find((p) => p.slug === slug);
    if (!profile) continue;

    const compositionSeed = Date.now() + i * 7919;
    const composed = renderArtDirectorFrontPrompt(
      profile,
      f,
      compositionSeed,
      DEFAULT_CREATIVE_DIRECTION_SETTINGS,
    );
    const result = await generateArtwork(artworkContext(artDirectorPromptText(composed), profile), {
      count: 1,
      quality: "medium",
      size: "1024x1536",
    });
    const image = result.images[0];
    if (!image) throw new Error(`Generation failed for era ${slug}`);

    const filename = `front-${slug}.png`;
    await writeFile(join(runDir, filename), image.buffer);

    const dna = rvbrEraVisualDnaForProfile(profile);
    eras.push({
      slug,
      name: profile.name,
      years: `${profile.eraStartYear}–${profile.eraEndYear}`,
      accent: profile.visualIdentity.accent ?? null,
      visualWorldId: resolveVisualWorldFromRvbr(profile),
      filename,
      mandateSummary: dna.mandate[0] ?? profile.name,
    });
  }

  const completedAt = new Date().toISOString();
  const report = {
    runId,
    runDir,
    provider: resolveArtworkProvider(),
    ...f,
    eras,
    startedAt,
    completedAt,
  };

  await writeFile(join(runDir, "validation-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    runId,
    runDir,
    provider: resolveArtworkProvider(),
    event: f.event,
    venue: f.venue,
    date: f.date,
    featuredYears: f.featuredYears,
    eras,
    startedAt,
    completedAt,
  };
}

export function rvbrValidationFileUrl(runId: string, filename: string): string {
  return `/api/ops/content-creator/rvbr-validation/files/${encodeURIComponent(runId)}/${encodeURIComponent(filename)}`;
}
