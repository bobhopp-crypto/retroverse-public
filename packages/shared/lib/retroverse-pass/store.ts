import { inspectQuery } from "@/lib/inspect/pg";

import type {
  PassActivityEventType,
  PassScanResult,
  NormalizedPassSerial,
  RetroversePass,
  RetroverseVisitor,
} from "./types";
import { normalizePassSerial, PassSerialAmbiguityError } from "./types";

const PASSES = "retroverse_passes";
const VISITORS = "retroverse_visitors";
const ACTIVITY = "retroverse_pass_activity";

type PassRow = {
  serial: string;
  claimed: boolean;
  visitor_id: number | string | null;
  claimed_at: Date | string | null;
};

type VisitorRow = {
  id: number | string;
  first_name: string;
  email: string;
  phone: string | null;
  created_at: Date | string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPass(row: PassRow): RetroversePass {
  return {
    serial: row.serial,
    claimed: row.claimed,
    visitorId: row.visitor_id == null ? null : Number(row.visitor_id),
    claimedAt: row.claimed_at == null ? null : iso(row.claimed_at),
  };
}

function mapVisitor(row: VisitorRow): RetroverseVisitor {
  return {
    id: Number(row.id),
    firstName: row.first_name,
    email: row.email,
    phone: row.phone,
    createdAt: iso(row.created_at),
  };
}

async function resultForPassRow(row: PassRow): Promise<PassScanResult> {
  const pass = mapPass(row);
  if (!pass.claimed || pass.visitorId == null) return { state: "unclaimed", pass };

  const visitorRows = await inspectQuery<VisitorRow>(
    `SELECT id, first_name, email, phone, created_at FROM ${VISITORS} WHERE id = $1`,
    [pass.visitorId],
  );
  const visitorRow = visitorRows[0];
  if (!visitorRow) {
    return { state: "unclaimed", pass: { ...pass, claimed: false, visitorId: null } };
  }
  return { state: "claimed", pass, visitor: mapVisitor(visitorRow) };
}

function missingTableError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("retroverse_pass") || msg.includes("retroverse_visitors")) {
    throw new Error(
      "Pass tables missing — run docs/migrations/retroverse-pass-experience.sql on Postgres",
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

/** Look up an existing canonical pass without provisioning or mutating data. */
export async function scanPass(normalized: NormalizedPassSerial): Promise<PassScanResult | null> {
  try {
    const rows = await inspectQuery<PassRow>(
      `
      SELECT serial, claimed, visitor_id, claimed_at
      FROM ${PASSES}
      WHERE upper(serial) = ANY($1::text[])
      `,
      [normalized.candidates],
    );
    if (rows.length === 0) return null;
    if (rows.length > 1) throw new PassSerialAmbiguityError();
    return await resultForPassRow(rows[0]);
  } catch (err) {
    missingTableError(err);
  }
}

/**
 * Claim an unclaimed pass: create the visitor, mark the pass claimed,
 * and log PASS_CLAIMED. If the pass is already claimed, return the
 * existing association (double-submit / re-scan is not an error).
 */
export async function claimPass(input: {
  serial: string;
  firstName: string;
  email: string;
  phone?: string | null;
}): Promise<PassScanResult & { state: "claimed" }> {
  const firstName = input.firstName.trim();
  const email = input.email.trim();
  const phone = input.phone?.trim() || null;

  if (!firstName) throw new Error("First name is required.");
  if (!email) throw new Error("Email is required.");

  try {
    const normalized = normalizePassSerial(input.serial);
    if (!normalized) throw new Error("Invalid pass serial.");
    const existing = await scanPass(normalized);
    if (!existing) throw new Error("Pass not found.");
    if (existing.state === "claimed") return existing;
    const canonicalSerial = existing.pass.serial;

    const visitorRows = await inspectQuery<VisitorRow>(
      `
      INSERT INTO ${VISITORS} (first_name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING id, first_name, email, phone, created_at
      `,
      [firstName, email, phone],
    );
    const visitor = mapVisitor(visitorRows[0]);

    const passRows = await inspectQuery<PassRow>(
      `
      UPDATE ${PASSES}
      SET claimed = true, visitor_id = $2, claimed_at = now()
      WHERE serial = $1 AND claimed = false
      RETURNING serial, claimed, visitor_id, claimed_at
      `,
      [canonicalSerial, visitor.id],
    );

    const passRow = passRows[0];
    if (!passRow) {
      // Lost a race — someone else claimed between scan and update.
      const after = await scanPass(normalized);
      if (after?.state === "claimed") return after;
      throw new Error("Pass could not be claimed.");
    }

    await recordPassActivity({
      visitorId: visitor.id,
      passSerial: canonicalSerial,
      eventType: "PASS_CLAIMED",
    });

    return { state: "claimed", pass: mapPass(passRow), visitor };
  } catch (err) {
    missingTableError(err);
  }
}

/** Append one actual action to the activity log. Never infer behavior. */
export async function recordPassActivity(input: {
  visitorId?: number | null;
  passSerial?: string | null;
  eventType: PassActivityEventType;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await inspectQuery(
      `
      INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
      VALUES ($1, $2, $3, $4)
      `,
      [
        input.visitorId ?? null,
        input.passSerial ?? null,
        input.eventType,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
  } catch (err) {
    missingTableError(err);
  }
}
