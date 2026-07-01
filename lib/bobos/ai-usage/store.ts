import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { retroverseDataRoot } from "@/lib/events/event-data-root";

import type { AiUsageEntry, AiUsageFile } from "./types";

function aiUsageDir(): string {
  return join(retroverseDataRoot(), "bobos", "ai-usage");
}

function entriesPath(): string {
  return join(aiUsageDir(), "entries.json");
}

async function readFile_(): Promise<AiUsageFile> {
  try {
    const raw = await readFile(entriesPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AiUsageFile>;
    if (!Array.isArray(parsed.entries)) return { version: 1, entries: [] };
    return { version: 1, entries: parsed.entries };
  } catch {
    return { version: 1, entries: [] };
  }
}

async function writeFile_(file: AiUsageFile): Promise<void> {
  await mkdir(aiUsageDir(), { recursive: true });
  await writeFile(entriesPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function loadAiUsageEntries(): Promise<AiUsageEntry[]> {
  const file = await readFile_();
  return [...file.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function appendAiUsageEntries(entries: AiUsageEntry[]): Promise<AiUsageEntry[]> {
  const file = await readFile_();
  const next = [...file.entries, ...entries];
  await writeFile_({ version: 1, entries: next });
  return loadAiUsageEntries();
}
