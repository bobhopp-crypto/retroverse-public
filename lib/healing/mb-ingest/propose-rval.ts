import { inspectQuery } from "@/lib/inspect/pg";

const RVAL_RE = /^RVAL(\d{6})$/i;

function parseRvalNum(rval: string): number | null {
  const m = rval.trim().toUpperCase().match(RVAL_RE);
  return m ? Number(m[1]) : null;
}

export async function loadMaxProposedRvalNumber(): Promise<number> {
  const [canonical, staged] = await Promise.all([
    inspectQuery<{ n: number }>(
      `
      SELECT max(cast(substring(upper(trim(external_key)) from 5) as int)) AS n
      FROM album_external_keys
      WHERE external_key ~* '^RVAL[0-9]{6,}$'
      `,
    ),
    inspectQuery<{ n: number }>(
      `
      SELECT max(cast(substring(upper(trim(proposed_rval)) from 5) as int)) AS n
      FROM mb_album_ingest_proposals
      WHERE proposed_rval ~* '^RVAL[0-9]{6,}$'
      `,
    ).catch(() => [{ n: 0 }]),
  ]);

  return Math.max(canonical[0]?.n ?? 0, staged[0]?.n ?? 0);
}

export function formatProposedRval(n: number): string {
  return `RVAL${String(n).padStart(6, "0")}`;
}

export async function allocateProposedRvals(count: number): Promise<string[]> {
  let n = (await loadMaxProposedRvalNumber()) + 1;
  const out: string[] = [];
  while (out.length < count) {
    const candidate = formatProposedRval(n);
    if (!(await proposedRvalCollides(candidate))) out.push(candidate);
    n += 1;
  }
  return out;
}

export async function proposedRvalCollides(
  proposedRval: string,
  excludeProposalId?: number,
): Promise<boolean> {
  const rows = await inspectQuery<{ hit: number }>(
    `
    SELECT 1::int AS hit
    FROM album_external_keys
    WHERE upper(trim(external_key)) = upper(trim($1))
    UNION ALL
    SELECT 1::int AS hit
    FROM mb_album_ingest_proposals
    WHERE upper(trim(proposed_rval)) = upper(trim($1))
      AND status IN ('staged', 'approved', 'applied')
      AND ($2::int IS NULL OR proposal_id <> $2)
    LIMIT 1
    `,
    [proposedRval, excludeProposalId ?? null],
  ).catch(() => [] as { hit: number }[]);
  return rows.length > 0;
}
