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

export function loadConfig(): LiveBridgeConfig {
  const settings = readVdjOscSettings();

  return {
    oscHost: process.env.VDJ_OSC_HOST?.trim() || "127.0.0.1",
    oscPort: Number(process.env.VDJ_OSC_PORT ?? settings.oscPort) || settings.oscPort,
    oscPortBack:
      Number(process.env.VDJ_OSC_BACK_PORT ?? settings.oscPortBack) || settings.oscPortBack,
    apiUrl:
      process.env.LIVE_NOW_PLAYING_URL?.trim() ||
      process.env.LIVE_API_URL?.trim() ||
      "http://127.0.0.1:3000/api/sunday-nights/bridge",
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
