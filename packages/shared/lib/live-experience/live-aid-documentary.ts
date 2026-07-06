/** Temporary Live Aid documentary integration for tonight's event. */

// TODO(event-producer): Replace hardcoded Gamma URL with Event Producer published documentary link.

export const LIVE_AID_DOCUMENTARY = {
  title: "Explore Live Aid",
  subtitle:
    "60-slide interactive documentary covering the history, performances, backstage stories, and legacy of Live Aid.",
  buttonLabel: "Open Documentary",
  newTabHint: "Opens in a new tab.",
  externalLabel: "External documentary",
  url: "https://gamma.app/docs/LIVE-AID-90fajc7tdrsvnxp",
  eventKey: "live-aid",
} as const;

/** Hardcoded window for tonight's Live Aid event (July 5, 2026). */
export function isLiveAidDocumentaryActive(now: Date = new Date()): boolean {
  // TODO(event-producer): Drive visibility from Event Producer event scope instead of hardcoded dates.
  const start = Date.parse("2026-07-05T00:00:00-05:00");
  const end = Date.parse("2026-07-06T06:00:00-05:00");
  const t = now.getTime();
  return t >= start && t < end;
}
