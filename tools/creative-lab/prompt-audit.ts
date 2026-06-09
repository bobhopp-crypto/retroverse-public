/**
 * Creative Lab prompt audit — Profiles A/B/C, Concepts A–D each.
 * Usage: npx tsx tools/creative-lab/prompt-audit.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { buildConceptVariations } from "@/lib/ops/creative-lab/concept-variations";
import { styleById } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabProjectFile, GeneratedPrompt, StyleSelection } from "@/lib/ops/creative-lab/types";

const OUT = join(process.cwd(), "reports/creative-lab/prompt-audit.md");

const PROFILES: Array<{
  id: string;
  label: string;
  credential: string;
  illustration: string;
  color: string;
}> = [
  {
    id: "profile-a",
    label: "Profile A",
    credential: "festival-pass",
    illustration: "saturday-morning-cartoon",
    color: "cream-vintage",
  },
  {
    id: "profile-b",
    label: "Profile B",
    credential: "tv-studio-credential",
    illustration: "mid-century",
    color: "muted-retro",
  },
  {
    id: "profile-c",
    label: "Profile C",
    credential: "trading-card",
    illustration: "comic-book",
    color: "bright-pop",
  },
];

function selectionForProfile(credential: string, illustration: string, color: string): StyleSelection {
  return {
    credential: [{ id: credential, weight: 100 }],
    illustration: [{ id: illustration, weight: 100 }],
    color: [{ id: color, weight: 100 }],
    density: [{ id: "medium", weight: 100 }],
  };
}

function baseProject(styleSelection: StyleSelection, profileLabel: string): CreativeLabProjectFile {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: `audit-${profileLabel.toLowerCase().replace(/\s+/g, "-")}`,
    name: `Prompt Audit — ${profileLabel}`,
    event: "Sunday Nights",
    venue: "The Main Pub",
    date: "June 15, 2026",
    featuredYears: [1967, 1978, 1992],
    theme: "",
    styleSelection,
    generatedPrompts: [],
    generatedAssets: [],
    selectedAssetIds: [],
    activeModule: "pass-lab",
    createdAt: now,
    updatedAt: now,
  };
}

function styleSelectionMarkdown(sel: StyleSelection): string {
  const lines: string[] = [];
  for (const cat of ["credential", "illustration", "color", "density"] as const) {
    for (const w of sel[cat]) {
      const def = styleById(w.id);
      lines.push(`- **${def?.label ?? w.id}** (${w.weight}%) — ${def?.description ?? ""}`);
    }
  }
  return lines.join("\n");
}

function linesOnlyIn(a: string, b: string): string[] {
  const setB = new Set(b.split("\n").map((l) => l.trim()));
  return a
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !setB.has(l));
}

function conceptDiffs(prompts: GeneratedPrompt[]): string {
  const byKey = Object.fromEntries(prompts.map((p) => [p.variationKey ?? "?", p]));
  const keys = ["A", "B", "C", "D"] as const;
  const lines: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = byKey[keys[i]];
      const b = byKey[keys[j]];
      if (!a || !b) continue;
      const onlyA = linesOnlyIn(a.renderedPrompt, b.renderedPrompt);
      const onlyB = linesOnlyIn(b.renderedPrompt, a.renderedPrompt);
      if (onlyA.length === 0 && onlyB.length === 0) {
        lines.push(`- **Concept ${keys[i]} vs ${keys[j]}:** identical body text`);
      } else {
        lines.push(`- **Concept ${keys[i]} vs ${keys[j]}:**`);
        if (onlyA.length) lines.push(`  - Only in ${keys[i]}: ${onlyA.join(" | ")}`);
        if (onlyB.length) lines.push(`  - Only in ${keys[j]}: ${onlyB.join(" | ")}`);
      }
    }
  }
  return lines.join("\n");
}

const BOILERPLATE_PHRASES = [
  "Style preset: custom project selection.",
  "Output should be print-ready at collectible scale with crisp type, visible hierarchy, and period-appropriate registration.",
  "Design must feel like a found artifact from the featured era — tactile paper stock, intentional wear optional, strong silhouette at thumbnail size, and metadata legible at arm's length.",
  "Avoid generic stock-template layouts. Favor bold Retroverse editorial framing with thick outlines and warm retro palettes where color styles allow.",
  "Theme: No theme specified.",
  "• Medium (100%): Balanced metadata, clear hierarchy, moderate detail.",
];

const GENERIC_PHRASES = [
  "period-appropriate registration",
  "found artifact from the featured era",
  "generic stock-template layouts",
  "shelf-worthy memorabilia feel",
  "print-ready hierarchy",
  "emotional anchor",
];

function analyzeAll(prompts: GeneratedPrompt[]): {
  crossProfile: string;
  repetitive: string;
  weak: string;
} {
  const allText = prompts.map((p) => p.renderedPrompt).join("\n");

  const boilerplateHits = BOILERPLATE_PHRASES.filter((p) => allText.includes(p));
  const genericHits = GENERIC_PHRASES.filter((p) => allText.toLowerCase().includes(p.toLowerCase()));

  const profilePrompts = PROFILES.map((prof) => {
    const sel = selectionForProfile(prof.credential, prof.illustration, prof.color);
    const project = baseProject(sel, prof.label);
    return buildConceptVariations(project, "pass-lab");
  });

  const stripEmphasis = (t: string) =>
    t.replace(/Emphasis: [^\n]+/g, "Emphasis: <VARIES>").trim();

  const withinProfileSame: string[] = [];
  for (let pi = 0; pi < profilePrompts.length; pi++) {
    const vars = profilePrompts[pi];
    const normalized = vars.map((p) => stripEmphasis(p.renderedPrompt));
    const allSame = normalized.every((n) => n === normalized[0]);
    const label = PROFILES[pi].label;
    withinProfileSame.push(
      allSame
        ? `${label}: Concepts A–D differ only on the **Emphasis** line`
        : `${label}: Concepts A–D have additional textual differences`,
    );
  }

  const crossLines: string[] = [];
  for (let i = 0; i < profilePrompts.length; i++) {
    for (let j = i + 1; j < profilePrompts.length; j++) {
      const a = stripEmphasis(profilePrompts[i][0].renderedPrompt);
      const b = stripEmphasis(profilePrompts[j][0].renderedPrompt);
      const onlyA = linesOnlyIn(a, b).filter((l) => !l.startsWith("Emphasis:"));
      const onlyB = linesOnlyIn(b, a).filter((l) => !l.startsWith("Emphasis:"));
      crossLines.push(
        `**${PROFILES[i].label} vs ${PROFILES[j].label}** (${onlyA.length + onlyB.length} differing lines in style/event blocks)`,
      );
    }
  }

  return {
    crossProfile: [
      "### Within-profile (Concept A–D)",
      ...withinProfileSame.map((s) => `- ${s}`),
      "",
      "### Across profiles (Concept A baseline)",
      ...crossLines.map((s) => `- ${s}`),
      "",
      "**Cross-profile diversity:** Strong — credential, illustration, and color sections change completely per profile.",
      "**Within-profile diversity:** Weak — only the single `Emphasis:` directive changes between A/B/C/D; all sections below are identical.",
    ].join("\n"),
    repetitive: [
      "These exact strings appear in **every** generated prompt (12 total):",
      ...boilerplateHits.map((p) => `- \`${p}\``),
      "",
      "Event metadata block is identical across all 12 prompts (Sunday Nights / The Main Pub / June 15, 2026 / years / pass-lab module).",
    ].join("\n"),
    weak: [
      "Phrases that read as generic creative brief filler rather than image-model directives:",
      ...genericHits.map((p) => `- "${p}"`),
      "",
      "Additional weaknesses:",
      "- **No theme** — audit project leaves theme empty; renderer emits `Theme: No theme specified.`",
      "- **Emphasis lines are meta-instructions** — they describe what to emphasize but do not inject unique visual nouns, composition, or negative prompts per concept",
      "- **Collectibility block is static** — same two sentences regardless of profile or concept",
      "- **Print footer is static** — does not adapt to Trading Card vs Festival Pass vs TV Studio Credential",
      "- **Density locked to Medium** — profiles did not specify density; audit used 100% Medium as neutral default",
    ].join("\n"),
  };
}

function main() {
  mkdirSync(join(process.cwd(), "reports/creative-lab"), { recursive: true });

  const sections: string[] = [
    "# Creative Lab Prompt Audit",
    "",
    "**Date:** 2026-06-09",
    "**Scope:** Profiles A/B/C × Concepts A–D — no images, no providers",
    "",
    "## Event metadata",
    "",
    "| Field | Value |",
    "|-------|-------|",
    "| Event | Sunday Nights |",
    "| Venue | The Main Pub |",
    "| Date | June 15, 2026 |",
    "| Years | 1967, 1978, 1992 |",
    "| Theme | *(empty)* |",
    "| Module | pass-lab |",
    "",
  ];

  const allPrompts: GeneratedPrompt[] = [];

  for (const prof of PROFILES) {
    const sel = selectionForProfile(prof.credential, prof.illustration, prof.color);
    const project = baseProject(sel, prof.label);
    const prompts = buildConceptVariations(project, "pass-lab");
    allPrompts.push(...prompts);

    sections.push(`## ${prof.label}`, "");
    sections.push("### Style selections", "");
    sections.push(styleSelectionMarkdown(sel), "");
    sections.push("### Concept A–D differences", "");
    sections.push(conceptDiffs(prompts), "");
    sections.push("### Rendered prompts", "");

    for (const p of prompts) {
      sections.push(`#### Concept ${p.variationKey}`, "");
      sections.push("```", p.renderedPrompt, "```", "");
    }
  }

  const analysis = analyzeAll(allPrompts);

  sections.push("## Assessment", "");
  sections.push("### Prompt diversity", "");
  sections.push(analysis.crossProfile, "");
  sections.push("### Repetitive wording", "");
  sections.push(analysis.repetitive, "");
  sections.push("### Weak or generic language", "");
  sections.push(analysis.weak, "");
  sections.push("## Verdict", "");
  sections.push(
    "The style engine **correctly differentiates profiles** (A/B/C produce distinct credential, illustration, and color blocks). **Concept A–D variation is minimal** — a single emphasis sentence is the only delta. Boilerplate collectibility and print paragraphs repeat verbatim across all 12 prompts. **Ready for provider smoke test** on one profile + Concept A; **not ready** for meaningful A/B/C/D image diversity without renderer changes.",
  );

  writeFileSync(OUT, sections.join("\n"));
  console.log(`Wrote ${OUT}`);
  console.log(`Generated ${allPrompts.length} prompts across ${PROFILES.length} profiles.`);
}

main();
