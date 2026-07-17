import "server-only";

import { getLiveControlStatus } from "@/lib/live-control/engine";
import { loadPassLibrary } from "@/lib/ops/event-studio/pass-studio/store";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import { productionModuleStatusLabel } from "@/lib/ops/event-studio/producer/module-status";
import { getActiveProducerPlan, loadProducerState } from "@/lib/ops/event-studio/producer/producer-state";
import { loadIntegrityDashboard } from "@/lib/ops/integrity/load-integrity-dashboard";
import { loadSundayEventMode } from "@/lib/sunday-nights/event-mode";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

export type CockpitPublicHomepageData = {
  statusLabel: string;
  eventTitle: string | null;
  eventActive: boolean;
  homepageMode: string | null;
};

export type CockpitPassRegistrationEntry = {
  serial: string;
  name: string;
  registeredAt: string;
};

export type CockpitPassRegistrationData = {
  totalPasses: number;
  registeredCount: number;
  recent: CockpitPassRegistrationEntry[];
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

export type CockpitPanelData = {
  publicHomepage: CockpitPublicHomepageData;
  passRegistration: CockpitPassRegistrationData;
  giveaway: CockpitGiveawayData;
  liveDisplay: CockpitLiveDisplayData;
  catalogIntegrity: CockpitCatalogIntegrityData;
};

const EMPTY_PUBLIC_HOMEPAGE: CockpitPublicHomepageData = {
  statusLabel: "Homepage data not loaded",
  eventTitle: null,
  eventActive: false,
  homepageMode: null,
};

const EMPTY_PASS_REGISTRATION: CockpitPassRegistrationData = {
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

async function loadPassRegistrationData(): Promise<CockpitPassRegistrationData> {
  try {
    const library = await loadPassLibrary();
    const registered = library.filter((pass) => pass.status === "registered" && pass.registration);
    const recent = registered
      .slice()
      .sort((a, b) =>
        (b.registration?.registeredAt ?? "").localeCompare(a.registration?.registeredAt ?? ""),
      )
      .slice(0, 3)
      .map((pass) => ({
        serial: pass.serial,
        name: `${pass.registration!.firstName} ${pass.registration!.lastName}`.trim() || "Guest",
        registeredAt: pass.registration!.registeredAt,
      }));

    const testPass =
      library.find((pass) => pass.status === "available") ??
      library.find((pass) => pass.status === "registered") ??
      library[0] ??
      null;

    return {
      totalPasses: library.length,
      registeredCount: registered.length,
      recent,
      testPassHref: testPass ? `/pass/${encodeURIComponent(testPass.serial)}` : null,
    };
  } catch {
    return EMPTY_PASS_REGISTRATION;
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

export async function loadCockpitPanelData(): Promise<CockpitPanelData> {
  const [publicHomepage, passRegistration, giveaway, liveDisplay, catalogIntegrity] = await Promise.all([
    loadPublicHomepageData(),
    loadPassRegistrationData(),
    loadGiveawayData(),
    loadLiveDisplayData(),
    loadCatalogIntegrityData(),
  ]);

  return {
    publicHomepage,
    passRegistration,
    giveaway,
    liveDisplay,
    catalogIntegrity,
  };
}
