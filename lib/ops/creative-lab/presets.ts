import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";

import { creativeLabStylePresetPath, creativeLabStylesDir } from "./paths";
import { normalizeStyleSelection } from "./style-catalog";
import type { CreativeLabPresetFile, StyleSelection } from "./types";

const DEFAULT_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  styleSelection: StyleSelection;
}> = [
  {
    id: "retroverse-classic",
    name: "Retroverse Classic",
    description: "Cream vintage credentials with mid-century illustration and medium density.",
    styleSelection: {
      credential: [
        { id: "festival-pass", weight: 50 },
        { id: "concert-credential", weight: 30 },
        { id: "tv-studio-credential", weight: 20 },
      ],
      illustration: [
        { id: "mid-century", weight: 60 },
        { id: "saturday-morning-cartoon", weight: 25 },
        { id: "rock-poster", weight: 15 },
      ],
      color: [
        { id: "cream-vintage", weight: 70 },
        { id: "muted-retro", weight: 30 },
      ],
      density: [{ id: "medium", weight: 100 }],
    },
  },
  {
    id: "live-aid",
    name: "Live Aid",
    description: "Bold concert credentials with photographic heroes and bright pop color.",
    styleSelection: {
      credential: [
        { id: "concert-credential", weight: 50 },
        { id: "backstage-laminate", weight: 30 },
        { id: "press-pass", weight: 20 },
      ],
      illustration: [
        { id: "photographic", weight: 55 },
        { id: "rock-poster", weight: 30 },
        { id: "pop-art", weight: 15 },
      ],
      color: [
        { id: "bright-pop", weight: 60 },
        { id: "monochrome", weight: 40 },
      ],
      density: [
        { id: "medium", weight: 60 },
        { id: "detailed", weight: 40 },
      ],
    },
  },
  {
    id: "woodstock",
    name: "Woodstock",
    description: "Festival pass with psychedelic illustration and earth-tone palette.",
    styleSelection: {
      credential: [
        { id: "festival-pass", weight: 70 },
        { id: "ticket-stub", weight: 30 },
      ],
      illustration: [
        { id: "psychedelic", weight: 50 },
        { id: "rock-poster", weight: 35 },
        { id: "saturday-morning-cartoon", weight: 15 },
      ],
      color: [
        { id: "earth-tone", weight: 55 },
        { id: "muted-retro", weight: 45 },
      ],
      density: [
        { id: "detailed", weight: 55 },
        { id: "medium", weight: 45 },
      ],
    },
  },
  {
    id: "sunday-nights",
    name: "Sunday Nights",
    description: "TV studio credential with Saturday-morning illustration for pub nights.",
    styleSelection: {
      credential: [
        { id: "tv-studio-credential", weight: 45 },
        { id: "concert-credential", weight: 35 },
        { id: "trading-card", weight: 20 },
      ],
      illustration: [
        { id: "saturday-morning-cartoon", weight: 80 },
        { id: "mid-century", weight: 20 },
      ],
      color: [
        { id: "cream-vintage", weight: 50 },
        { id: "bright-pop", weight: 30 },
        { id: "neon", weight: 20 },
      ],
      density: [
        { id: "simple", weight: 40 },
        { id: "medium", weight: 60 },
      ],
    },
  },
];

function normalizePreset(raw: unknown, fallbackId: string): CreativeLabPresetFile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<CreativeLabPresetFile>;
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : fallbackId;
  const now = new Date().toISOString();
  return {
    version: 1,
    id,
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : id,
    description: typeof obj.description === "string" ? obj.description : "",
    styleSelection: normalizeStyleSelection(obj.styleSelection),
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : now,
  };
}

export async function ensureDefaultPresets(): Promise<void> {
  await mkdir(creativeLabStylesDir(), { recursive: true });
  const now = new Date().toISOString();
  for (const preset of DEFAULT_PRESETS) {
    const path = creativeLabStylePresetPath(preset.id);
    if (existsSync(path)) continue;
    const file: CreativeLabPresetFile = {
      version: 1,
      id: preset.id,
      name: preset.name,
      description: preset.description,
      styleSelection: preset.styleSelection,
      createdAt: now,
      updatedAt: now,
    };
    await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  }
}

export async function listPresets(): Promise<CreativeLabPresetFile[]> {
  await ensureDefaultPresets();
  const dir = creativeLabStylesDir();
  const names = await readdir(dir);
  const presets: CreativeLabPresetFile[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const id = name.replace(/\.json$/, "");
    const preset = await loadPreset(id);
    if (preset) presets.push(preset);
  }
  return presets.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPreset(presetId: string): Promise<CreativeLabPresetFile | null> {
  try {
    const raw = JSON.parse(await readFile(creativeLabStylePresetPath(presetId), "utf8")) as unknown;
    return normalizePreset(raw, presetId);
  } catch {
    return null;
  }
}

export async function savePreset(input: {
  id: string;
  name: string;
  description?: string;
  styleSelection: StyleSelection;
}): Promise<CreativeLabPresetFile> {
  await mkdir(creativeLabStylesDir(), { recursive: true });
  const existing = await loadPreset(input.id);
  const now = new Date().toISOString();
  const file: CreativeLabPresetFile = {
    version: 1,
    id: input.id.trim(),
    name: input.name.trim() || input.id.trim(),
    description: input.description?.trim() ?? "",
    styleSelection: normalizeStyleSelection(input.styleSelection),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await writeFile(creativeLabStylePresetPath(file.id), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}
