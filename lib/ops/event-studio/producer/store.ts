import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { createEmptyParsedPlan } from "./defaults";
import { normalizeParsedPlan } from "./normalize";
import type { EventProducerDraft, EventProducerDraftsFile, EventProducerParsedPlan } from "./types";

function draftsPath(): string {
  return join(opsStateDir(), "event-studio", "producer", "drafts.json");
}

function normalizeDraft(raw: unknown): EventProducerDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<EventProducerDraft>;
  if (typeof obj.id !== "string" || typeof obj.createdAt !== "string") return null;
  if (typeof obj.sourceText !== "string") return null;
  return {
    id: obj.id,
    createdAt: obj.createdAt,
    sourceText: obj.sourceText,
    model: typeof obj.model === "string" ? obj.model : "",
    parsedPlan: normalizeParsedPlan(obj.parsedPlan),
    status: "draft",
  };
}

function normalizeFile(raw: unknown): EventProducerDraftsFile {
  if (!raw || typeof raw !== "object") {
    return { version: 1, drafts: [], updatedAt: new Date().toISOString() };
  }
  const obj = raw as Partial<EventProducerDraftsFile>;
  const drafts = (obj.drafts ?? [])
    .map(normalizeDraft)
    .filter((draft): draft is EventProducerDraft => draft != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    version: 1,
    drafts,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

async function loadFile(): Promise<EventProducerDraftsFile> {
  try {
    const raw = await readFile(draftsPath(), "utf8");
    return normalizeFile(JSON.parse(raw));
  } catch {
    return normalizeFile(null);
  }
}

async function saveFile(file: EventProducerDraftsFile): Promise<void> {
  const dir = join(opsStateDir(), "event-studio", "producer");
  await mkdir(dir, { recursive: true });
  const next: EventProducerDraftsFile = {
    ...file,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(draftsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export async function listEventProducerDrafts(): Promise<EventProducerDraft[]> {
  const file = await loadFile();
  return file.drafts;
}

export async function saveEventProducerDraft(input: {
  sourceText: string;
  model: string;
  parsedPlan: EventProducerParsedPlan;
}): Promise<EventProducerDraft> {
  const file = await loadFile();
  const draft: EventProducerDraft = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    sourceText: input.sourceText.trim(),
    model: input.model.trim() || "none",
    parsedPlan: normalizeParsedPlan(input.parsedPlan ?? createEmptyParsedPlan()),
    status: "draft",
  };
  file.drafts.unshift(draft);
  await saveFile(file);
  return draft;
}
