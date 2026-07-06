import {
  isLiveAidDocumentaryActive,
  LIVE_AID_DOCUMENTARY,
} from "@/lib/live-experience/live-aid-documentary";

import "./explore-live-aid-callout.css";

export function ExploreLiveAidCallout() {
  if (!isLiveAidDocumentaryActive()) return null;

  return (
    <section className="live-aid-doc" aria-labelledby="live-aid-doc-title">
      <p className="live-aid-doc__eyebrow">{LIVE_AID_DOCUMENTARY.externalLabel}</p>
      <h2 id="live-aid-doc-title" className="live-aid-doc__title">
        {LIVE_AID_DOCUMENTARY.title}
      </h2>
      <p className="live-aid-doc__subtitle">{LIVE_AID_DOCUMENTARY.subtitle}</p>
      <a
        href={LIVE_AID_DOCUMENTARY.url}
        target="_blank"
        rel="noopener noreferrer"
        className="live-aid-doc__btn"
      >
        {LIVE_AID_DOCUMENTARY.buttonLabel}
      </a>
      <p className="live-aid-doc__hint">{LIVE_AID_DOCUMENTARY.newTabHint}</p>
    </section>
  );
}
