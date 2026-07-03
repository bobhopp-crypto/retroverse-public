import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import { DEFAULT_EVENT_CONTROL_CONFIG, DEFAULT_FEATURED_YEARS, DEFAULT_RVBR } from "./defaults";
import { normalizeIssueColor } from "./rvbr-palette";
import type {
  EventControlConfig,
  EventControlSavePayload,
  EventControlRvbr,
  HomepageMode,
} from "./types";

const PG_KEY = "eventControl";

function configPath(): string {
  return join(opsStateDir(), "event-control", "config.json");
}

function normalizeYear(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const year = Math.round(raw);
  if (year < 1950 || year > 2100) return null;
  return year;
}

function normalizeYears(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_FEATURED_YEARS];
  const years = raw
    .map(normalizeYear)
    .filter((y): y is number => y != null)
    .slice(0, 4);
  while (years.length < 3) {
    years.push(DEFAULT_FEATURED_YEARS[years.length] ?? DEFAULT_FEATURED_YEARS[0]!);
  }
  return years;
}

function normalizeOptionalString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMode(raw: unknown, eventActive: boolean): HomepageMode {
  if (raw === "YEARS" || raw === "EVENT" || raw === "COLLECTION" || raw === "CUSTOM") {
    return raw;
  }
  return eventActive ? "EVENT" : "YEARS";
}

function normalizeRvbr(rvbrRaw: Partial<EventControlRvbr>): EventControlRvbr {
  return {
    eyebrow: normalizeOptionalString(rvbrRaw.eyebrow),
    issueTheme: normalizeOptionalString(rvbrRaw.issueTheme),
    issueNumber: normalizeOptionalString(rvbrRaw.issueNumber),
    issueColor: normalizeIssueColor(rvbrRaw.issueColor),
    tagline: normalizeOptionalString(rvbrRaw.tagline),
  };
}

function normalizeHomepage(
  homepageRaw: Partial<EventControlConfig["homepage"]>,
  eventActive: boolean,
): EventControlConfig["homepage"] {
  return {
    headline: normalizeOptionalString(homepageRaw.headline),
    subheadline: normalizeOptionalString(homepageRaw.subheadline),
    mode: normalizeMode(homepageRaw.mode, eventActive),
    ctaLabel: normalizeOptionalString(homepageRaw.ctaLabel),
    ctaLink: normalizeOptionalString(homepageRaw.ctaLink),
    featureImageUrl: normalizeOptionalString(homepageRaw.featureImageUrl),
    featureDescription: normalizeOptionalString(homepageRaw.featureDescription),
    heroYear: normalizeYear(homepageRaw.heroYear),
    featuredArtist: normalizeOptionalString(homepageRaw.featuredArtist),
    featuredArtistSlug: normalizeOptionalString(homepageRaw.featuredArtistSlug),
  };
}

function normalizeConfig(raw: unknown): EventControlConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_EVENT_CONTROL_CONFIG };
  const obj = raw as Partial<EventControlConfig>;
  const eventRaw = (obj.event && typeof obj.event === "object" ? obj.event : {}) as Partial<
    EventControlConfig["event"]
  >;
  const homepageRaw = (obj.homepage && typeof obj.homepage === "object" ? obj.homepage : {}) as Partial<
    EventControlConfig["homepage"]
  >;
  const rvbrRaw = (obj.rvbr && typeof obj.rvbr === "object" ? obj.rvbr : {}) as Partial<
    EventControlConfig["rvbr"]
  >;
  const eventActive = eventRaw.active === true;

  return {
    version: 3,
    event: {
      title:
        typeof eventRaw.title === "string" && eventRaw.title.trim()
          ? eventRaw.title.trim()
          : DEFAULT_EVENT_CONTROL_CONFIG.event.title,
      venue: typeof eventRaw.venue === "string" ? eventRaw.venue.trim() : "",
      date: typeof eventRaw.date === "string" ? eventRaw.date.trim() : "",
      active: eventActive,
    },
    featuredYears: normalizeYears(obj.featuredYears),
    homepage: normalizeHomepage(homepageRaw, eventActive),
    rvbr: normalizeRvbr(rvbrRaw),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : DEFAULT_EVENT_CONTROL_CONFIG.updatedAt,
  };
}

async function loadFromJson(): Promise<EventControlConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EVENT_CONTROL_CONFIG };
  }
}

async function saveToJson(config: EventControlConfig): Promise<void> {
  const dir = join(opsStateDir(), "event-control");
  await mkdir(dir, { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function persist(config: EventControlConfig): Promise<EventControlConfig> {
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(PG_KEY, config as unknown as Record<string, unknown>);
    return config;
  }
  await saveToJson(config);
  return config;
}

export async function loadEventControlConfig(): Promise<EventControlConfig> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(PG_KEY);
    return raw ? normalizeConfig(raw) : { ...DEFAULT_EVENT_CONTROL_CONFIG };
  }
  return loadFromJson();
}

export async function saveEventControlConfig(
  payload: EventControlSavePayload,
): Promise<EventControlConfig> {
  const eventActive = payload.event.active === true;
  const next: EventControlConfig = {
    version: 3,
    event: {
      title: payload.event.title.trim() || DEFAULT_EVENT_CONTROL_CONFIG.event.title,
      venue: payload.event.venue.trim(),
      date: payload.event.date.trim(),
      active: eventActive,
    },
    featuredYears: normalizeYears(payload.featuredYears),
    homepage: normalizeHomepage(payload.homepage, eventActive),
    rvbr: normalizeRvbr(payload.rvbr ?? {}),
    updatedAt: new Date().toISOString(),
  };
  return persist(next);
}
