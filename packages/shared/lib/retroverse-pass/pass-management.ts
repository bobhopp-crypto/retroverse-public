import "server-only";

import { getPassPool, passQuery } from "@/lib/retroverse-pass/pg";

import { parsePassCredential } from "./types";
import { updatePassVisitor } from "./store";

const PASSES = "retroverse_passes";
const VISITORS = "retroverse_visitors";
const ACTIVITY = "retroverse_pass_activity";

export type PassManagementRow = {
  serial: string;
  claimed: boolean;
  claimedAt: string | null;
  visitorId: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export type PassManagementSummary = {
  totalPasses: number;
  claimed: number;
  unclaimed: number;
  claimedToday: number;
};

export type PassActivityRow = {
  id: number;
  eventType: string;
  createdAt: string;
  visitorId: number | null;
};

type JoinRow = {
  serial: string;
  claimed: boolean;
  claimed_at: Date | string | null;
  visitor_id: number | string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: JoinRow): PassManagementRow {
  return {
    serial: row.serial,
    claimed: Boolean(row.claimed),
    claimedAt: iso(row.claimed_at),
    visitorId: row.visitor_id == null ? null : Number(row.visitor_id),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
  };
}

function isClaimedToday(isoDate: string | null, now = new Date()): boolean {
  if (!isoDate) return false;
  const when = new Date(isoDate);
  if (Number.isNaN(when.getTime())) return false;
  return (
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate()
  );
}

function missingTableError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("retroverse_pass") || msg.includes("retroverse_visitors")) {
    throw new Error(
      "Pass tables missing — run docs/migrations/retroverse-pass-experience.sql on Postgres",
    );
  }
  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    throw new Error("Pass serial already exists.");
  }
  throw err instanceof Error ? err : new Error(msg);
}

export function summarizePassManagement(rows: PassManagementRow[]): PassManagementSummary {
  let claimed = 0;
  let claimedToday = 0;
  for (const row of rows) {
    if (row.claimed) {
      claimed += 1;
      if (isClaimedToday(row.claimedAt)) claimedToday += 1;
    }
  }
  return {
    totalPasses: rows.length,
    claimed,
    unclaimed: Math.max(0, rows.length - claimed),
    claimedToday,
  };
}

/** List passes with optional visitor fields for RV02-05. */
export async function searchPassManagement(search = ""): Promise<{
  passes: PassManagementRow[];
  summary: PassManagementSummary;
}> {
  try {
    const q = search.trim();
    const pattern = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : "";
    const rows = await passQuery<JoinRow>(
      `
      SELECT
        p.serial,
        p.claimed,
        p.claimed_at,
        p.visitor_id,
        v.first_name,
        v.last_name,
        v.email,
        v.phone
      FROM ${PASSES} p
      LEFT JOIN ${VISITORS} v ON v.id = p.visitor_id
      WHERE (
        $1 = ''
        OR p.serial ILIKE $2 ESCAPE '\\'
        OR COALESCE(v.first_name, '') ILIKE $2 ESCAPE '\\'
        OR COALESCE(v.last_name, '') ILIKE $2 ESCAPE '\\'
        OR COALESCE(v.email, '') ILIKE $2 ESCAPE '\\'
      )
      ORDER BY
        p.claimed DESC,
        p.claimed_at DESC NULLS LAST,
        p.serial ASC
      LIMIT 2000
      `,
      [q, pattern || "%"],
    );

    const passes = rows.map(mapRow);
    // Summary always reflects the full inventory, not the filtered subset.
    const all = q
      ? (
          await passQuery<JoinRow>(
            `
            SELECT
              p.serial, p.claimed, p.claimed_at, p.visitor_id,
              v.first_name, v.last_name, v.email, v.phone
            FROM ${PASSES} p
            LEFT JOIN ${VISITORS} v ON v.id = p.visitor_id
            `,
          )
        ).map(mapRow)
      : passes;

    return { passes, summary: summarizePassManagement(all) };
  } catch (err) {
    missingTableError(err);
  }
}

export async function updatePassVisitorFields(
  serial: string,
  input: {
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  },
): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");

  await updatePassVisitor({
    serial: credential,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
  });

  const { passes } = await searchPassManagement(credential);
  const row = passes.find((p) => p.serial === credential);
  if (!row) throw new Error("Pass not found after update.");
  return row;
}

/** Rename a pass serial in place (preserves claim + visitor link). */
export async function updatePassSerial(
  currentSerial: string,
  nextSerialInput: string,
): Promise<PassManagementRow> {
  const current = parsePassCredential(currentSerial);
  const next = parsePassCredential(nextSerialInput);
  if (!current || !next) throw new Error("Invalid pass serial.");
  if (current === next) {
    const { passes } = await searchPassManagement(current);
    const row = passes.find((p) => p.serial === current);
    if (!row) throw new Error("Pass not found.");
    return row;
  }

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT serial FROM ${PASSES} WHERE serial = $1 FOR UPDATE`,
      [current],
    );
    if (!locked.rowCount) throw new Error("Pass not found.");

    const conflict = await client.query(`SELECT serial FROM ${PASSES} WHERE serial = $1`, [next]);
    if (conflict.rowCount) throw new Error("Pass serial already exists.");

    await client.query(`UPDATE ${PASSES} SET serial = $2 WHERE serial = $1`, [current, next]);
    await client.query(
      `UPDATE ${ACTIVITY} SET pass_serial = $2 WHERE pass_serial = $1`,
      [current, next],
    );
    await client.query(
      `INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
       VALUES (
         (SELECT visitor_id FROM ${PASSES} WHERE serial = $1),
         $1,
         'PASS_EDITED',
         $2::jsonb
       )`,
      [next, JSON.stringify({ action: "rename_serial", from: current, to: next })],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    missingTableError(err);
  } finally {
    client.release();
  }

  const { passes } = await searchPassManagement(next);
  const row = passes.find((p) => p.serial === next);
  if (!row) throw new Error("Pass not found after rename.");
  return row;
}

/** Clear claim — pass stays in inventory as unclaimed for /pass/[serial] re-registration. */
export async function resetPassClaim(serial: string): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{
      serial: string;
      claimed: boolean;
      visitor_id: number | string | null;
    }>(`SELECT serial, claimed, visitor_id FROM ${PASSES} WHERE serial = $1 FOR UPDATE`, [
      credential,
    ]);
    const row = locked.rows[0];
    if (!row) throw new Error("Pass not found.");

    await client.query(
      `UPDATE ${PASSES}
       SET claimed = false, visitor_id = NULL, claimed_at = NULL
       WHERE serial = $1`,
      [credential],
    );
    await client.query(
      `INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
       VALUES ($1, $2, 'PASS_EDITED', $3::jsonb)`,
      [
        row.visitor_id == null ? null : Number(row.visitor_id),
        credential,
        JSON.stringify({ action: "reset_claim" }),
      ],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    missingTableError(err);
  } finally {
    client.release();
  }

  const { passes } = await searchPassManagement(credential);
  const next = passes.find((p) => p.serial === credential);
  if (!next) throw new Error("Pass not found after reset.");
  return next;
}

/** Permanently delete a pass row. Activity history is retained. */
export async function deletePass(serial: string): Promise<PassManagementRow> {
  const credential = parsePassCredential(serial);
  if (!credential) throw new Error("Invalid pass serial.");

  try {
    const before = await passQuery<JoinRow>(
      `
      SELECT
        p.serial, p.claimed, p.claimed_at, p.visitor_id,
        v.first_name, v.last_name, v.email, v.phone
      FROM ${PASSES} p
      LEFT JOIN ${VISITORS} v ON v.id = p.visitor_id
      WHERE p.serial = $1
      `,
      [credential],
    );
    const existing = before[0];
    if (!existing) throw new Error("Pass not found.");

    await passQuery(`DELETE FROM ${PASSES} WHERE serial = $1`, [credential]);
    await passQuery(
      `INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
       VALUES ($1, $2, 'PASS_EDITED', $3::jsonb)`,
      [
        existing.visitor_id == null ? null : Number(existing.visitor_id),
        credential,
        JSON.stringify({ action: "delete_pass" }),
      ],
    );
    return mapRow(existing);
  } catch (err) {
    missingTableError(err);
  }
}

export async function listPassActivity(
  serial: string,
  limit = 20,
): Promise<PassActivityRow[]> {
  const credential = parsePassCredential(serial);
  if (!credential) return [];
  try {
    const rows = await passQuery<{
      id: number | string;
      event_type: string;
      created_at: Date | string;
      visitor_id: number | string | null;
    }>(
      `
      SELECT id, event_type, created_at, visitor_id
      FROM ${ACTIVITY}
      WHERE pass_serial = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [credential, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      eventType: row.event_type,
      createdAt: iso(row.created_at) ?? "",
      visitorId: row.visitor_id == null ? null : Number(row.visitor_id),
    }));
  } catch (err) {
    missingTableError(err);
  }
}
