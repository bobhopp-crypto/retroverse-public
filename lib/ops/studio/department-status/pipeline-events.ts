import "server-only";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";

import { ensureLivingActivityIds } from "@/lib/ops/studio/pipeline-event-id";
import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";
import { studioPipelineEventsPath } from "@/lib/studio/package";

import type { StudioDepartmentId, StudioPipelineEvent, StudioPipelineEventStore } from "./types";

const MAX_EVENTS = 200;

export function emptyPipelineEventStore(): StudioPipelineEventStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    events: [],
  };
}

export async function loadPipelineEvents(): Promise<StudioPipelineEvent[]> {
  const parsed = await readJsonFileSafe<StudioPipelineEventStore | null>(
    studioPipelineEventsPath(),
    null,
    2000,
  );
  if (!parsed?.events?.length) return [];
  return ensureLivingActivityIds(
    parsed.events.map((event) => ({
      ...event,
      department: event.department as StudioDepartmentId | "system",
    })),
  );
}

async function savePipelineEventStore(store: StudioPipelineEventStore): Promise<void> {
  const path = studioPipelineEventsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export async function appendPipelineEvent(
  input: Omit<StudioPipelineEvent, "id"> & { id?: string },
): Promise<StudioPipelineEvent> {
  const parsed = await readJsonFileSafe<StudioPipelineEventStore | null>(
    studioPipelineEventsPath(),
    null,
    2000,
  );
  const store = parsed ?? emptyPipelineEventStore();
  const event: StudioPipelineEvent = {
    id: input.id ?? randomUUID(),
    at: input.at,
    department: input.department,
    type: input.type,
    message: input.message,
    rvtr: input.rvtr,
  };
  store.events = [event, ...store.events].slice(0, MAX_EVENTS);
  await savePipelineEventStore(store);
  return event;
}

export async function appendPipelineEvents(
  inputs: Array<Omit<StudioPipelineEvent, "id"> & { id?: string }>,
): Promise<void> {
  if (inputs.length === 0) return;
  const parsed = await readJsonFileSafe<StudioPipelineEventStore | null>(
    studioPipelineEventsPath(),
    null,
    2000,
  );
  const store = parsed ?? emptyPipelineEventStore();
  const newEvents: StudioPipelineEvent[] = inputs.map((input) => ({
    id: input.id ?? randomUUID(),
    at: input.at,
    department: input.department,
    type: input.type,
    message: input.message,
    rvtr: input.rvtr,
  }));
  store.events = [...newEvents.reverse(), ...store.events].slice(0, MAX_EVENTS);
  await savePipelineEventStore(store);
}

export async function loadStudioActivityFeed(limit = 20): Promise<StudioPipelineEvent[]> {
  const events = await loadPipelineEvents();
  return events.slice(0, limit);
}
