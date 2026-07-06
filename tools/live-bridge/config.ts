import { readVdjOscSettings } from "./osc-settings";

export type LiveBridgeConfig = {
  oscHost: string;
  oscPort: number;
  oscPortBack: number;
  apiUrl: string;
  apiSecret: string;
  pollMs: number;
  stablePolls: number;
  deckCount: number;
  crossfaderLow: number;
  crossfaderHigh: number;
  dataRoot: string;
};

function resolveBridgeApiUrl(): string {
  const explicit = process.env.LIVE_BRIDGE_API_URL?.trim();
  if (explicit) return explicit;

  const livePort = process.env.LIVE_PORT?.trim();
  const liveOrigin = process.env.RETROVERSE_LIVE_ORIGIN?.trim();
  if (livePort === "3100" || liveOrigin?.includes(":3100")) {
    return "http://127.0.0.1:3100/api/sunday-nights/bridge";
  }

  const fromEnv = process.env.LIVE_NOW_PLAYING_URL?.trim() || process.env.LIVE_API_URL?.trim();

  // .env often points at production for public push; local bridge must hit local Live (3100).
  if (fromEnv?.includes("retroverse.live")) {
    return "http://127.0.0.1:3100/api/sunday-nights/bridge";
  }

  if (fromEnv) return fromEnv;

  // BobOS split default: Studio 3000, Live 3100.
  return "http://127.0.0.1:3100/api/sunday-nights/bridge";
}

export function loadConfig(): LiveBridgeConfig {
  const settings = readVdjOscSettings();

  return {
    oscHost: process.env.VDJ_OSC_HOST?.trim() || "127.0.0.1",
    oscPort: Number(process.env.VDJ_OSC_PORT ?? settings.oscPort) || settings.oscPort,
    oscPortBack:
      Number(process.env.VDJ_OSC_BACK_PORT ?? settings.oscPortBack) || settings.oscPortBack,
    apiUrl: resolveBridgeApiUrl(),
    apiSecret: process.env.LIVE_NOW_PLAYING_SECRET?.trim() || "",
    pollMs: Number(process.env.LIVE_BRIDGE_POLL_MS ?? "2000") || 2000,
    stablePolls: Number(process.env.LIVE_BRIDGE_STABLE_POLLS ?? "3") || 3,
    deckCount: Number(process.env.LIVE_BRIDGE_DECK_COUNT ?? "2") || 2,
    crossfaderLow: Number(process.env.LIVE_BRIDGE_CF_LOW ?? "45") || 45,
    crossfaderHigh: Number(process.env.LIVE_BRIDGE_CF_HIGH ?? "55") || 55,
    dataRoot:
      process.env.RETROVERSE_DATA_ROOT?.trim() ||
      `${process.cwd()}/../RETROVERSE_DATA`,
  };
}
