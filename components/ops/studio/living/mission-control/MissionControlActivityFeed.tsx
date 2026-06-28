import type { LivingActivityEvent } from "@/lib/ops/studio/living/types";

type Props = {
  events?: LivingActivityEvent[] | null;
};

function eventTone(message: string, type?: string): "milestone" | "progress" | "default" {
  const lower = message.toLowerCase();
  if (
    lower.includes("published") ||
    lower.includes("publish") ||
    lower.includes("approved") ||
    lower.includes("complete")
  ) {
    return "milestone";
  }
  if (lower.includes("started") || lower.includes("queued") || lower.includes("research")) {
    return "progress";
  }
  return "default";
}

function departmentLabel(dept: LivingActivityEvent["department"]): string {
  if (dept === "system") return "Studio";
  return dept.charAt(0).toUpperCase() + dept.slice(1);
}

export function MissionControlActivityFeed({ events }: Props) {
  const sorted = [...(events ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section className="rs-mc-activity" aria-label="Studio activity">
      <h2 className="rs-mc-section-title">Studio Activity</h2>
      {sorted.length === 0 ? (
        <p className="rs-mc-activity__empty">
          Activity appears here as songs move through Collector, Editor, Director, and Publisher.
        </p>
      ) : (
        <ol className="rs-mc-activity__list">
          {sorted.slice(0, 12).map((event) => {
            const tone = eventTone(event.message);
            return (
              <li
                key={event.id}
                className={[
                  "rs-mc-activity__item",
                  tone === "milestone" ? "rs-mc-activity__item--milestone" : "",
                  tone === "progress" ? "rs-mc-activity__item--progress" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="rs-mc-activity__meta">
                  <time className="rs-mc-activity__time">{event.timeLabel}</time>
                  <span className="rs-mc-activity__dept">{departmentLabel(event.department)}</span>
                </div>
                <p className="rs-mc-activity__msg">{event.message}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
