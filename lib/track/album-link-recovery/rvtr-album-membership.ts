import { inspectQuery } from "@/lib/inspect/pg";
import { titlesLikelyMatch } from "@/lib/track/album-link-recovery/normalize-title";
import type { AlbumLinkWriteProposal } from "@/lib/track/album-link-recovery/types";

export type AlbumSlotRow = {
  rvtr: string;
  title: string;
  position: number;
  cat_row_id: number;
};

export type AlbumRelationshipMode = "tracklist_slot" | "co_album_membership";

let schemaReady: boolean | null = null;

export async function ensureRvtrAlbumMembershipsTable(): Promise<boolean> {
  if (schemaReady === true) return true;
  try {
    await inspectQuery(`
      CREATE TABLE IF NOT EXISTS rvtr_album_memberships (
        id bigserial PRIMARY KEY,
        rvtr text NOT NULL,
        album_id bigint NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
        sequence_position integer,
        sequence_title text NOT NULL,
        anchor_cat_row_id bigint REFERENCES canonical_album_tracks(id) ON DELETE SET NULL,
        confidence_score numeric(5, 3) NOT NULL DEFAULT 0,
        source_kind text NOT NULL,
        canonical_source text NOT NULL DEFAULT 'healing_co_album',
        review_flag text NOT NULL DEFAULT 'curated',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (rvtr, album_id)
      )
    `);
    await inspectQuery(`
      CREATE INDEX IF NOT EXISTS rvtr_album_memberships_album_idx
        ON rvtr_album_memberships (album_id)
    `);
    await inspectQuery(`
      CREATE INDEX IF NOT EXISTS rvtr_album_memberships_rvtr_idx
        ON rvtr_album_memberships (upper(trim(rvtr)))
    `);
    schemaReady = true;
    return true;
  } catch {
    schemaReady = false;
    return false;
  }
}

export async function countRvtrAlbumMemberships(rvtr: string): Promise<number> {
  const ok = await ensureRvtrAlbumMembershipsTable();
  if (!ok) return 0;
  const rows = await inspectQuery<{ c: number }>(
    `
    SELECT count(*)::int AS c
    FROM rvtr_album_memberships
    WHERE upper(trim(rvtr)) = upper(trim($1))
    `,
    [rvtr],
  );
  return rows[0]?.c ?? 0;
}

export async function rvtrLinkedAlbumIds(rvtr: string): Promise<number[]> {
  const ids = new Set<number>();
  const catRows = await inspectQuery<{ album_id: number }>(
    `
    SELECT DISTINCT album_id
    FROM canonical_album_tracks
    WHERE upper(trim(canonical_track_key)) = upper(trim($1))
    `,
    [rvtr],
  );
  for (const row of catRows) ids.add(Number(row.album_id));

  const ok = await ensureRvtrAlbumMembershipsTable();
  if (ok) {
    const memRows = await inspectQuery<{ album_id: number }>(
      `
      SELECT DISTINCT album_id
      FROM rvtr_album_memberships
      WHERE upper(trim(rvtr)) = upper(trim($1))
      `,
      [rvtr],
    );
    for (const row of memRows) ids.add(Number(row.album_id));
  }

  return [...ids];
}

export async function loadAlbumSlotRvtrs(albumId: number): Promise<AlbumSlotRow[]> {
  const rows = await inspectQuery<{
    rvtr: string;
    title: string;
    position: number;
    cat_row_id: number;
  }>(
    `
    SELECT
      upper(trim(cat.canonical_track_key)) AS rvtr,
      cat.title,
      cat.position,
      cat.id AS cat_row_id
    FROM canonical_album_tracks cat
    WHERE cat.album_id = $1
      AND coalesce(trim(cat.canonical_track_key), '') <> ''
    ORDER BY cat.position ASC NULLS LAST, cat.title
    `,
    [albumId],
  );
  const out = rows.map((r) => ({
    rvtr: r.rvtr,
    title: r.title,
    position: Number(r.position),
    cat_row_id: Number(r.cat_row_id),
  }));

  const ready = await ensureRvtrAlbumMembershipsTable();
  if (ready) {
    const mem = await inspectQuery<{
      rvtr: string;
      title: string;
      position: number | null;
    }>(
      `
      SELECT upper(trim(rvtr)) AS rvtr, sequence_title AS title, sequence_position AS position
      FROM rvtr_album_memberships
      WHERE album_id = $1
      `,
      [albumId],
    );
    const seen = new Set(out.map((r) => r.rvtr));
    for (const row of mem) {
      if (seen.has(row.rvtr)) continue;
      seen.add(row.rvtr);
      out.push({
        rvtr: row.rvtr,
        title: row.title,
        position: Number(row.position ?? 0),
        cat_row_id: 0,
      });
    }
    out.sort((a, b) => a.position - b.position || a.rvtr.localeCompare(b.rvtr));
  }

  return out;
}

export async function loadAlbumSlotAtPosition(
  albumId: number,
  position: number | null,
): Promise<(AlbumSlotRow & { sequence_title: string }) | null> {
  if (position == null) return null;
  const rows = await inspectQuery<{
    rvtr: string | null;
    title: string;
    position: number;
    cat_row_id: number;
  }>(
    `
    SELECT
      upper(trim(cat.canonical_track_key)) AS rvtr,
      cat.title,
      cat.position,
      cat.id AS cat_row_id
    FROM canonical_album_tracks cat
    WHERE cat.album_id = $1 AND cat.position = $2
    LIMIT 1
    `,
    [albumId, position],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    rvtr: row.rvtr ?? "",
    title: row.title,
    position: Number(row.position),
    cat_row_id: Number(row.cat_row_id),
    sequence_title: row.title,
  };
}

export function resolveAlbumRelationshipMode(input: {
  proposal: AlbumLinkWriteProposal;
  existingLinkCount: number;
  existingMembershipCount: number;
  slotRvtr: string | null;
  slotTitle: string | null;
  trackTitle: string;
}): { mode: AlbumRelationshipMode; ok: true } | { mode: null; ok: false; code: string; message: string } {
  const rvtr = input.proposal.rvtr.trim().toUpperCase();
  const totalLinks = input.existingLinkCount + input.existingMembershipCount;

  if (totalLinks > 0 && input.existingLinkCount > 0) {
    return {
      mode: null,
      ok: false,
      code: "already_linked",
      message: "Track already has canonical_album_tracks — no replace.",
    };
  }

  const slotTaken =
    input.slotRvtr &&
    input.slotRvtr.toUpperCase() !== rvtr;

  if (!slotTaken) {
    return { mode: "tracklist_slot", ok: true };
  }

  const slotTitle = input.slotTitle ?? input.proposal.sequenceTitle;
  const titleAligned =
    titlesLikelyMatch(input.trackTitle, slotTitle) ||
    titlesLikelyMatch(input.proposal.sequenceTitle, slotTitle);

  if (!titleAligned) {
    return {
      mode: null,
      ok: false,
      code: "slot_occupied",
      message: `Tracklist slot already keyed to ${input.slotRvtr}.`,
    };
  }

  return { mode: "co_album_membership", ok: true };
}

export type CoAlbumApplyResult =
  | { ok: true; membershipId: number; proposalId: number }
  | { ok: false; code: string; message: string };

export async function applyCoAlbumMembership(
  proposal: AlbumLinkWriteProposal,
  approvedBy: string,
  anchorCatRowId: number | null,
): Promise<CoAlbumApplyResult> {
  const ready = await ensureRvtrAlbumMembershipsTable();
  if (!ready) {
    return {
      ok: false,
      code: "schema_unavailable",
      message: "rvtr_album_memberships table could not be created.",
    };
  }

  const rvtr = proposal.rvtr.trim().toUpperCase();

  let proposalId = 0;
  try {
    const logRows = await inspectQuery<{ id: number }>(
      `
      INSERT INTO track_album_link_proposals (
        rvtr, album_id, position, sequence_title, confidence, reasons, source_kind,
        status, proposed_by, reviewed_by, reviewed_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'applied', $8, $8, now())
      RETURNING id
      `,
      [
        rvtr,
        proposal.albumId,
        proposal.position,
        proposal.sequenceTitle,
        proposal.confidence,
        JSON.stringify([...proposal.reasons, "co_album_membership"]),
        proposal.sourceKind,
        approvedBy,
      ],
    );
    proposalId = logRows[0]?.id ?? 0;
  } catch {
    proposalId = 0;
  }

  const memRows = await inspectQuery<{ id: number }>(
    `
    INSERT INTO rvtr_album_memberships (
      rvtr, album_id, sequence_position, sequence_title,
      anchor_cat_row_id, confidence_score, source_kind
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (rvtr, album_id) DO NOTHING
    RETURNING id
    `,
    [
      rvtr,
      proposal.albumId,
      proposal.position,
      proposal.sequenceTitle,
      anchorCatRowId,
      proposal.confidence,
      proposal.sourceKind,
    ],
  );

  const membershipId = memRows[0]?.id;
  if (!membershipId) {
    return {
      ok: false,
      code: "duplicate_relationship",
      message: "This RVTR is already a member of that album.",
    };
  }

  return { ok: true, membershipId, proposalId };
}
