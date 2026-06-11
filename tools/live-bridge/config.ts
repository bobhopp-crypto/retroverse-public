export type LiveBridgeConfig = {
  vdjPort: string;
  vdjBearer: string;
  apiUrl: string;
  apiSecret: string;
  pollMs: number;
  stablePolls: number;
  deckCount: number;
  dataRoot: string;
};

export function loadConfig(): LiveBridgeConfig {
  return {
    vdjPort: process.env.VDJ_NETWORK_PORT?.trim() || "80",
    vdjBearer: process.env.VDJ_NETWORK_BEARER?.trim() || "",
    apiUrl:
      process.env.LIVE_NOW_PLAYING_URL?.trim() ||
      process.env.LIVE_API_URL?.trim() ||
      "http://127.0.0.1:3000/api/sunday-nights/bridge",
    apiSecret: process.env.LIVE_NOW_PLAYING_SECRET?.trim() || "",
    pollMs: Number(process.env.LIVE_BRIDGE_POLL_MS ?? "2000") || 2000,
    stablePolls: Number(process.env.LIVE_BRIDGE_STABLE_POLLS ?? "3") || 3,
    deckCount: Number(process.env.LIVE_BRIDGE_DECK_COUNT ?? "2") || 2,
    dataRoot:
      process.env.RETROVERSE_DATA_ROOT?.trim() ||
      `${process.cwd()}/../RETROVERSE_DATA`,
  };
}
