/**
 * Booth ← VirtualDJ Source observation (Sprint 4).
 * Read-only. Never mutates Booth Store / ownership / publishing.
 */

export type BoothVdjPadAvailability = "unavailable" | "connected" | "idle" | "playing";

export type BoothVdjAssetView = {
  source: "VirtualDJ";
  artist: string;
  title: string;
  album: string | null;
  rvtr: string | null;
  coverUrl: string | null;
  packageStatus: string | null;
  destinationKind: string | null;
  bridgeTimestamp: string | null;
};

export type BoothVdjSourceView = {
  pad: BoothVdjPadAvailability;
  /** True only while VirtualDJ is playing a fresh, identifiable Source. */
  playing: boolean;
  connected: boolean;
  /** Null when idle / unavailable — never keep a stale track. */
  asset: BoothVdjAssetView | null;
  /** Operator-facing status line. */
  status: string;
};

export type BoothVdjSourceInput = {
  bridgeConnected: boolean | null;
  playing: boolean | null;
  live: {
    artist: string | null;
    title: string | null;
    rvtr: string | null;
    coverUrl: string | null;
    bridgeTimestamp: string | null;
    source: string | null;
  } | null;
  album: string | null;
  packageStatus: string | null;
  destinationKind: string | null;
};

export function emptyBoothVdjSourceView(): BoothVdjSourceView {
  return {
    pad: "unavailable",
    playing: false,
    connected: false,
    asset: null,
    status: "No VirtualDJ Source",
  };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Map Runtime / Bridge observation → Booth VirtualDJ Source view.
 *
 * Playing requires a fresh identifiable live track. Sticky bridgePlaying
 * without a fresh live selection must not invent a song card.
 */
export function mapBoothVdjSource(input: BoothVdjSourceInput): BoothVdjSourceView {
  const connected = input.bridgeConnected === true;

  if (input.bridgeConnected == null && input.playing == null) {
    return emptyBoothVdjSourceView();
  }

  if (!connected) {
    return {
      pad: "unavailable",
      playing: false,
      connected: false,
      asset: null,
      status: "No VirtualDJ Source",
    };
  }

  const artist = clean(input.live?.artist);
  const title = clean(input.live?.title);
  const hasIdentity = Boolean(artist && title);
  const reportedPlaying = input.playing === true;

  if (reportedPlaying && hasIdentity && artist && title) {
    const asset: BoothVdjAssetView = {
      source: "VirtualDJ",
      artist,
      title,
      album: clean(input.album),
      rvtr: clean(input.live?.rvtr),
      coverUrl: clean(input.live?.coverUrl),
      packageStatus: clean(input.packageStatus),
      destinationKind: clean(input.destinationKind),
      bridgeTimestamp: clean(input.live?.bridgeTimestamp),
    };

    return {
      pad: "playing",
      playing: true,
      connected: true,
      asset,
      status: `${artist} — ${title}`,
    };
  }

  if (reportedPlaying && !hasIdentity) {
    // Bridge flag may be sticky; freshness cleared the track — never show stale.
    return {
      pad: "connected",
      playing: false,
      connected: true,
      asset: null,
      status: "No VirtualDJ Source",
    };
  }

  if (input.playing == null) {
    return {
      pad: "connected",
      playing: false,
      connected: true,
      asset: null,
      status: "No VirtualDJ Source",
    };
  }

  return {
    pad: "idle",
    playing: false,
    connected: true,
    asset: null,
    status: "No VirtualDJ Source",
  };
}

export function boothVdjPadLabel(pad: BoothVdjPadAvailability): string {
  switch (pad) {
    case "unavailable":
      return "UNAVAILABLE";
    case "connected":
      return "CONNECTED";
    case "idle":
      return "IDLE";
    case "playing":
      return "PLAYING";
    default:
      return "UNAVAILABLE";
  }
}
