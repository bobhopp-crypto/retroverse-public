import type { IsoTimestamp, StudioLogEntry } from "./types";

export function formatProcessLogLine(message: string, at: Date = new Date()): string {
  return `${at.toISOString()} · ${message}`;
}

export function appendLogEntry(entries: StudioLogEntry[], message: string, at?: Date): StudioLogEntry[] {
  const timestamp = (at ?? new Date()).toISOString() as IsoTimestamp;
  return [{ at: timestamp, message }, ...entries];
}

export function appendProcessLogLine(lines: string[], message: string, at: Date = new Date()): string[] {
  return [formatProcessLogLine(message, at), ...lines];
}
