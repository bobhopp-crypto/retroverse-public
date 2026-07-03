import type { GiveawayDrawRecord, GiveawayEntry, GiveawayStudioSnapshot } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  snapshot: GiveawayStudioSnapshot;
};

function findEntry(entries: GiveawayEntry[], entryId: string): GiveawayEntry | undefined {
  return entries.find((entry) => entry.id === entryId);
}

export function GiveawayHistoryBoard({ snapshot }: Props) {
  const draws = [...snapshot.state.draws].sort((a, b) => b.drawnAt.localeCompare(a.drawnAt));

  return (
    <section className="ops-event-studio__panel" aria-label="Giveaway history">
      <h2 className="ops-event-studio__panel-title">History</h2>
      <p className="ops-event-studio__hint">Every draw for this event is stored automatically.</p>
      <div className="es-giveaway-history">
        {draws.length === 0 ? (
          <p className="es-giveaway-empty">No drawings yet.</p>
        ) : (
          draws.map((draw) => (
            <HistoryRow key={draw.id} draw={draw} entries={snapshot.entries} giveawayTitle={snapshot.activeGiveaway?.title ?? "Giveaway"} />
          ))
        )}
      </div>
    </section>
  );
}

function HistoryRow({
  draw,
  entries,
  giveawayTitle,
}: {
  draw: GiveawayDrawRecord;
  entries: GiveawayEntry[];
  giveawayTitle: string;
}) {
  const winner = findEntry(entries, draw.entryId);
  return (
    <article className="es-giveaway-history-row">
      <div>
        <strong>{giveawayTitle}</strong>
        <p>
          {winner ? `${winner.firstName} ${winner.lastName}` : draw.entryId} · {draw.status}
        </p>
      </div>
      <time dateTime={draw.drawnAt}>{new Date(draw.drawnAt).toLocaleString()}</time>
    </article>
  );
}
