/** Stable unique ids for pipeline / activity events — assigned at model load time only. */

export function pipelineEventId(input: {
  rvtr?: string | null;
  stage: string;
  sequence: number;
  at?: string;
}): string {
  const rvtr = input.rvtr?.trim().toUpperCase();
  if (rvtr) return `${rvtr}-${input.stage}-${input.sequence}`;
  const atToken = input.at?.replace(/\D/g, "").slice(0, 17) ?? "na";
  return `evt-${input.stage}-${input.sequence}-${atToken}`;
}

export type WithPipelineEventId = { id: string };

export function ensureCollectorActivityIds<T extends { id?: string; at: string; message: string }>(
  entries: T[],
): Array<T & { id: string }> {
  return entries.map((entry, sequence) => ({
    ...entry,
    id:
      entry.id ??
      pipelineEventId({
        stage: "collector",
        sequence,
        at: entry.at,
      }),
  }));
}

export function ensureLivingActivityIds<
  T extends { id?: string; at: string; message: string; department: string; rvtr?: string },
>(events: T[]): Array<T & { id: string }> {
  return events.map((event, sequence) => ({
    ...event,
    id:
      event.id ??
      pipelineEventId({
        rvtr: event.rvtr,
        stage: event.department,
        sequence,
        at: event.at,
      }),
  }));
}

export function publisherDecisionId(rvtr: string, sequence: number, decidedAt: string): string {
  return pipelineEventId({
    rvtr,
    stage: "publisher-decision",
    sequence,
    at: decidedAt,
  });
}

/** Backfill publisher decisions missing ids when loading store records. */
export function ensurePublisherDecisionIds<T extends { id?: string; decidedAt: string }>(
  rvtr: string,
  decisions: T[],
): Array<T & { id: string }> {
  return decisions.map((decision, sequence) => ({
    ...decision,
    id: decision.id ?? publisherDecisionId(rvtr, sequence, decision.decidedAt),
  }));
}
