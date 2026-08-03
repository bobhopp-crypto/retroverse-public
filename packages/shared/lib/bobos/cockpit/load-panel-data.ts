import "server-only";

import { getLiveControlStatus } from "@/lib/live-control/engine";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import { productionModuleStatusLabel } from "@/lib/ops/event-studio/producer/module-status";
import { getActiveProducerPlan, loadProducerState } from "@/lib/ops/event-studio/producer/producer-state";
import { loadIntegrityDashboard } from "@/lib/ops/integrity/load-integrity-dashboard";
import { searchPassManagement } from "@/lib/retroverse-pass/pass-management";
import { loadSundayEventMode } from "@/lib/sunday-nights/event-mode";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export type CockpitPublicHomepageData = {
  statusLabel: string;
  eventTitle: string | null;
  eventActive: boolean;
  homepageMode: string | null;
};

export type CockpitPassClaimsEntry = {
  serial: string;
  name: string;
  registeredAt: string;
};

/** Claim inventory snapshot for the Pass Management cockpit faceplate. */
export type CockpitPassClaimsData = {
  totalPasses: number;
  registeredCount: number;
  recent: CockpitPassClaimsEntry[];
  testPassHref: string | null;
};

export type CockpitGiveawayData = {
  prizeTitle: string | null;
  status: string | null;
  entryCount: number;
  winnerName: string | null;
  hasDraw: boolean;
};

export type CockpitLiveDisplayData = {
  nowShowing: string;
  modeLabel: string;
  eventModeOn: boolean;
  channelRunning: boolean;
  liveSource: string | null;
  publicDisplayHref: string;
};

export type CockpitCatalogIntegrityData = {
  totalOpenIssues: number;
  duplicateArtists: number;
  duplicateAlbums: number;
  duplicateTracks: number;
  aliasConflicts: number;
  missingCovers: number;
  status: "Healthy" | "Attention" | "Critical";
};

/**
 * Functional health for RV01-02 Runtime.
 * HEALTHY only when destination responds, HTML looks like Runtime, and status API works.
 */
export type CockpitRuntimeHealthLevel =
  | "healthy"
  | "process-online"
  | "app-degraded"
  | "route-broken"
  | "offline";

export type CockpitRuntimeHealthData = {
  level: CockpitRuntimeHealthLevel;
  label: string;
  destination: string;
  httpStatus: number | null;
  statusApiOk: boolean;
  responseMs: number | null;
};

export type CockpitSongRequestsHealthData = {
  available: boolean;
  label: "Available" | "Unavailable";
};

export type CockpitPanelData = {
  publicHomepage: CockpitPublicHomepageData;
  passClaims: CockpitPassClaimsData;
  giveaway: CockpitGiveawayData;
  liveDisplay: CockpitLiveDisplayData;
  catalogIntegrity: CockpitCatalogIntegrityData;
  runtime: CockpitRuntimeHealthData;
  songRequests: CockpitSongRequestsHealthData;
};

const EMPTY_PUBLIC_HOMEPAGE: CockpitPublicHomepageData = {
  statusLabel: "Homepage data not loaded",
  eventTitle: null,
  eventActive: false,
  homepageMode: null,
};

const EMPTY_PASS_CLAIMS: CockpitPassClaimsData = {
  totalPasses: 0,
  registeredCount: 0,
  recent: [],
  testPassHref: null,
};

const EMPTY_GIVEAWAY: CockpitGiveawayData = {
  prizeTitle: null,
  status: null,
  entryCount: 0,
  winnerName: null,
  hasDraw: false,
};

const EMPTY_LIVE_DISPLAY: CockpitLiveDisplayData = {
  nowShowing: "Display status unavailable",
  modeLabel: "—",
  eventModeOn: false,
  channelRunning: false,
  liveSource: null,
  publicDisplayHref: "/sunday-nights",
};

const EMPTY_CATALOG_INTEGRITY: CockpitCatalogIntegrityData = {
  totalOpenIssues: 0,
  duplicateArtists: 0,
  duplicateAlbums: 0,
  duplicateTracks: 0,
  aliasConflicts: 0,
  missingCovers: 0,
  status: "Healthy",
};

export const RUNTIME_DESTINATION = "/bobos/runtime";

const EMPTY_RUNTIME_HEALTH: CockpitRuntimeHealthData = {
  level: "offline",
  label: "OFFLINE",
  destination: RUNTIME_DESTINATION,
  httpStatus: null,
  statusApiOk: false,
  responseMs: null,
};

const EMPTY_SONG_REQUESTS_HEALTH: CockpitSongRequestsHealthData = {
  available: false,
  label: "Unavailable",
};

const LIVE_MODE_LABELS: Record<string, string> = {
  vdj: "VirtualDJ",
  demo: "Demo",
  playlist: "Playlist",
};

const LIVE_SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  bridge: "Bridge",
  channel: "Auto",
};

async function loadPublicHomepageData(): Promise<CockpitPublicHomepageData> {
  try {
    const [config, producerState, activePlan] = await Promise.all([
      loadEventControlConfig().catch(() => null),
      loadProducerState().catch(() => null),
      getActiveProducerPlan().catch(() => null),
    ]);

    const eventTitle =
      config?.event.title.trim() ||
      activePlan?.parsedPlan?.eventTitle.trim() ||
      null;
    const eventActive = config?.event.active === true;
    const homepageMode = config?.homepage.mode ?? null;
    const moduleStatus = producerState?.moduleStatuses.homepage;
    const statusLabel = eventActive
      ? "Event active on public homepage"
      : moduleStatus
        ? productionModuleStatusLabel(moduleStatus)
        : homepageMode
          ? `${homepageMode} mode`
          : eventTitle
            ? "Configured — not published"
            : "No homepage config yet";

    return {
      statusLabel,
      eventTitle,
      eventActive,
      homepageMode,
    };
  } catch {
    return EMPTY_PUBLIC_HOMEPAGE;
  }
}

async function loadPassClaimsData(): Promise<CockpitPassClaimsData> {
  try {
    const { passes, summary } = await searchPassManagement();
    const claimed = passes.filter((pass) => pass.claimed);
    const recent = claimed
      .slice()
      .sort((a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""))
      .slice(0, 3)
      .map((pass) => ({
        serial: pass.serial,
        name: `${pass.firstName ?? ""} ${pass.lastName ?? ""}`.trim() || "Guest",
        registeredAt: pass.claimedAt ?? "",
      }));

    const testPass =
      passes.find((pass) => !pass.claimed) ?? passes.find((pass) => pass.claimed) ?? null;

    return {
      totalPasses: summary.totalPasses,
      registeredCount: summary.claimed,
      recent,
      testPassHref: testPass ? `/pass/${encodeURIComponent(testPass.serial)}` : null,
    };
  } catch {
    return EMPTY_PASS_CLAIMS;
  }
}

async function loadGiveawayData(): Promise<CockpitGiveawayData> {
  try {
    const snapshot = await loadGiveawayStudio();
    const active = snapshot.activeGiveaway;
    const winner = snapshot.currentWinner;

    return {
      prizeTitle: active?.prize.title.trim() || null,
      status: active?.status ?? null,
      entryCount: snapshot.entryCount,
      winnerName: winner
        ? `${winner.firstName} ${winner.lastName}`.trim() || winner.email || null
        : null,
      hasDraw: Boolean(snapshot.currentDraw),
    };
  } catch {
    return EMPTY_GIVEAWAY;
  }
}

async function loadLiveDisplayData(): Promise<CockpitLiveDisplayData> {
  try {
    const [state, eventMode, liveStatus] = await Promise.all([
      loadSundayNightsState(),
      loadSundayEventMode(),
      getLiveControlStatus(),
    ]);
    const current = await buildSundayNightsCurrentPayload(state);

    const artist = liveStatus.currentArtist ?? current.live?.artist ?? null;
    const title = liveStatus.currentTitle ?? current.live?.title ?? null;
    const nowShowing =
      artist && title
        ? `${artist} — ${title}`
        : eventMode.enabled
          ? "Sunday Nights — awaiting track"
          : "Homepage / Sunday Nights standby";

    const controlMode = liveStatus.control.mode;
    const liveSource = current.live?.source ?? null;
    const sourceLabel = liveSource ? (LIVE_SOURCE_LABELS[liveSource] ?? liveSource) : null;
    const modeLabel = liveStatus.control.running
      ? `Auto · ${LIVE_MODE_LABELS[controlMode] ?? controlMode}`
      : sourceLabel
        ? `${sourceLabel} · ${LIVE_MODE_LABELS[controlMode] ?? controlMode}`
        : LIVE_MODE_LABELS[controlMode] ?? controlMode;

    const publicDisplayHref =
      current.destination.href ??
      (eventMode.enabled ? "/sunday-nights" : "/");

    return {
      nowShowing,
      modeLabel,
      eventModeOn: eventMode.enabled,
      channelRunning: liveStatus.control.running,
      liveSource,
      publicDisplayHref,
    };
  } catch {
    return EMPTY_LIVE_DISPLAY;
  }
}

async function loadCatalogIntegrityData(): Promise<CockpitCatalogIntegrityData> {
  try {
    const dashboard = await loadIntegrityDashboard();
    if (!dashboard.ok) return EMPTY_CATALOG_INTEGRITY;
    const byId = new Map(dashboard.cards.map((card) => [card.id, card.count]));
    return {
      totalOpenIssues: dashboard.totalOpenIssues,
      duplicateArtists: byId.get("duplicate-artists") ?? 0,
      duplicateAlbums: byId.get("duplicate-albums") ?? 0,
      duplicateTracks: byId.get("duplicate-tracks") ?? 0,
      aliasConflicts: byId.get("alias-conflicts") ?? 0,
      missingCovers: byId.get("missing-covers") ?? 0,
      status: dashboard.cockpitStatus,
    };
  } catch {
    return EMPTY_CATALOG_INTEGRITY;
  }
}

function studioListenPort(): number {
  const raw = process.env.PORT?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 3000;
}

/** Probe the Runtime user destination + its status dependency (not panel registration). */
async function loadRuntimeAppHealth(): Promise<CockpitRuntimeHealthData> {
  const destination = RUNTIME_DESTINATION;
  let statusApiOk = false;
  try {
    const { getRetroverseRuntimeStatus } = await import("@/lib/bobos/runtime/dev-control");
    await getRetroverseRuntimeStatus();
    statusApiOk = true;
  } catch {
    statusApiOk = false;
  }

  const url = `http://127.0.0.1:${studioListenPort()}${destination}`;
  try {
    const started = Date.now();
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "text/html" },
    });
    const responseMs = Date.now() - started;

    if (res.status === 404 || res.status >= 500 || (res.status >= 300 && res.status < 400)) {
      return {
        level: "route-broken",
        label: "ROUTE BROKEN",
        destination,
        httpStatus: res.status,
        statusApiOk,
        responseMs,
      };
    }

    const html = await res.text();
    const looksLikeRuntime =
      /Runtime\s*[—-]\s*BobOS|Retroverse Runtime|\/bobos\/runtime\//i.test(html);
    const hasAppError = /Application error:\s*a client/i.test(html);

    if (hasAppError || !looksLikeRuntime) {
      return {
        level: "app-degraded",
        label: "APP DEGRADED",
        destination,
        httpStatus: res.status,
        statusApiOk,
        responseMs,
      };
    }

    // Reject HTML that references Next chunks the Studio process cannot serve
    // (stale shell / wrong-app HTML — root of originalFactory.call false greens).
    const assetPaths = [
      ...html.matchAll(/\/_next\/(?:static|development)\/[^"'\\\s)]+/g),
    ]
      .map((m) => m[0].replace(/\\u0026/g, "&").split("?")[0])
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .slice(0, 8);
    const origin = `http://127.0.0.1:${studioListenPort()}`;
    for (const assetPath of assetPaths) {
      try {
        const assetRes = await fetch(`${origin}${assetPath}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3_000),
        });
        if (assetRes.status === 404 || assetRes.status >= 500) {
          return {
            level: "app-degraded",
            label: "APP DEGRADED",
            destination,
            httpStatus: res.status,
            statusApiOk,
            responseMs,
          };
        }
      } catch {
        return {
          level: "app-degraded",
          label: "APP DEGRADED",
          destination,
          httpStatus: res.status,
          statusApiOk,
          responseMs,
        };
      }
    }

    if (!statusApiOk) {
      return {
        level: "app-degraded",
        label: "APP DEGRADED",
        destination,
        httpStatus: res.status,
        statusApiOk,
        responseMs,
      };
    }

    return {
      level: "healthy",
      label: "Healthy",
      destination,
      httpStatus: res.status,
      statusApiOk,
      responseMs,
    };
  } catch {
    if (statusApiOk) {
      return {
        level: "process-online",
        label: "PROCESS ONLINE",
        destination,
        httpStatus: null,
        statusApiOk,
        responseMs: null,
      };
    }
    return { ...EMPTY_RUNTIME_HEALTH, statusApiOk };
  }
}

export async function loadCockpitPanelData(): Promise<CockpitPanelData> {
  const [publicHomepage, passClaims, giveaway, liveDisplay, catalogIntegrity, runtime] =
    await Promise.all([
      loadPublicHomepageData(),
      loadPassClaimsData(),
      loadGiveawayData(),
      loadLiveDisplayData(),
      loadCatalogIntegrityData(),
      loadRuntimeAppHealth(),
    ]);
  const songRequests = runtime.httpStatus !== null
    ? { available: true, label: "Available" as const }
    : EMPTY_SONG_REQUESTS_HEALTH;

  return {
    publicHomepage,
    passClaims,
    giveaway,
    liveDisplay,
    catalogIntegrity,
    runtime,
    songRequests,
  };
}
