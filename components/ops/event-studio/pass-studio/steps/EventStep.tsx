"use client";

type Props = {
  event: { eventName: string; venue: string; date: string };
  onContinue: () => void;
};

/** Step 1 — read-only Producer info. One question: "is this the right event?" */
export function EventStep({ event, onContinue }: Props) {
  return (
    <div className="ps-step ps-step--center">
      <p className="ps-step__eyebrow">Step 1 of 5</p>
      <h2 className="ps-step__title">Choose Event</h2>

      <div className="ps-event-card">
        <p className="ps-event-card__label">From Producer</p>
        <p className="ps-event-card__name">{event.eventName || "Untitled event"}</p>
        <p className="ps-event-card__meta">
          {event.venue || "No venue set"}
          {event.date ? ` · ${event.date}` : ""}
        </p>
      </div>

      <button type="button" className="ps-btn ps-btn--primary ps-btn--hero" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
