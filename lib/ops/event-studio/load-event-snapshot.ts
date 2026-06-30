import { loadEventControlConfig } from "@/lib/ops/event-control/store";

import type { EventStudioSnapshot, EventStudioStatus } from "./types";

function resolveTheme(
  issueTheme: string | null,
  headline: string | null,
  eventTitle: string,
): string {
  if (issueTheme?.trim()) return issueTheme.trim();
  if (headline?.trim()) return headline.trim();
  return eventTitle;
}

function resolveStatus(active: boolean): EventStudioStatus {
  return active ? "Live" : "Planning";
}

export async function loadEventStudioSnapshot(): Promise<EventStudioSnapshot> {
  const config = await loadEventControlConfig();

  return {
    eventName: config.event.title,
    venue: config.event.venue || "Venue TBD",
    date: config.event.date || "Date TBD",
    theme: resolveTheme(config.rvbr.issueTheme, config.homepage.headline, config.event.title),
    featuredYears: config.featuredYears,
    status: resolveStatus(config.event.active),
    updatedAt: config.updatedAt,
  };
}
