import { getInspectPool, inspectQuery } from "@/lib/inspect/pg";

import type {
  PassActivityEventType,
  PassScanResult,
  RetroversePass,
  RetroverseVisitor,
} from "./types";
import { parsePassCredential } from "./types";

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

function missingTableError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("retroverse_pass") || msg.includes("retroverse_visitors")) {
    throw new Error(
      "Pass tables missing — run docs/migrations/retroverse-pass-experience.sql on Postgres",
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

type QueryRows = <T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

/** Look up one exact opaque credential without provisioning or mutating data. */
export async function scanPass(
  credential: string,
  query: QueryRows = inspectQuery,
): Promise<PassScanResult | null> {
  try {
    const rows = await query<PassRow>(
      `
      SELECT serial, claimed, visitor_id, claimed_at
      FROM ${PASSES}
      WHERE serial = $1
      `,
      [credential],
    );
    if (rows.length === 0) return null;
    const pass = mapPass(rows[0]!);
    if (!pass.claimed || pass.visitorId == null) return { state: "unclaimed", pass };
    const visitors = await query<VisitorRow>(
      `SELECT id, first_name, email, phone, created_at FROM ${VISITORS} WHERE id = $1`,
      [pass.visitorId],
    );
    const visitor = visitors[0];
    return visitor
      ? { state: "claimed", pass, visitor: mapVisitor(visitor) }
      : { state: "unclaimed", pass: { ...pass, claimed: false, visitorId: null } };
  } catch (err) {
    missingTableError(err);
  }
}

export class PassRegistrationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PassRegistrationInputError";
  }
}

type TransactionClient = {
  query<T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
};

/** Provision and claim one exact credential while holding its Postgres row lock. */
export async function claimPassWithClient(
  client: TransactionClient,
  input: { credential: string; firstName: string; email: string; phone: string | null },
): Promise<PassScanResult & { state: "claimed" }> {
  await client.query(
    `INSERT INTO ${PASSES} (serial) VALUES ($1) ON CONFLICT (serial) DO NOTHING`,
    [input.credential],
  );
  const passRows = await client.query<PassRow>(
    `SELECT serial, claimed, visitor_id, claimed_at FROM ${PASSES} WHERE serial = $1 FOR UPDATE`,
    [input.credential],
  );
  const existingRow = passRows.rows[0];
  if (!existingRow) throw new Error("Credential provisioning failed.");
  const existing = mapPass(existingRow);

  if (existing.claimed && existing.visitorId != null) {
    const visitorRows = await client.query<VisitorRow>(
      `SELECT id, first_name, email, phone, created_at FROM ${VISITORS} WHERE id = $1`,
      [existing.visitorId],
    );
    const visitor = visitorRows.rows[0];
    if (!visitor) throw new Error("Registered visitor is unavailable.");
    return { state: "claimed", pass: existing, visitor: mapVisitor(visitor) };
  }

  const visitorRows = await client.query<VisitorRow>(
    `INSERT INTO ${VISITORS} (first_name, email, phone) VALUES ($1, $2, $3)
     RETURNING id, first_name, email, phone, created_at`,
    [input.firstName, input.email, input.phone],
  );
  const visitor = mapVisitor(visitorRows.rows[0]!);
  const claimedRows = await client.query<PassRow>(
    `UPDATE ${PASSES} SET claimed = true, visitor_id = $2, claimed_at = now()
     WHERE serial = $1
     RETURNING serial, claimed, visitor_id, claimed_at`,
    [input.credential, visitor.id],
  );
  const claimed = claimedRows.rows[0];
  if (!claimed) throw new Error("Credential claim failed.");
  await client.query(
    `INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
     VALUES ($1, $2, 'PASS_CLAIMED', NULL)`,
    [visitor.id, input.credential],
  );
  return { state: "claimed", pass: mapPass(claimed), visitor };
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
  const credential = parsePassCredential(input.serial);
  const firstName = input.firstName.trim();
  const email = input.email.trim();
  const phone = input.phone?.trim() || null;

  if (!credential) throw new PassRegistrationInputError("Invalid pass credential.");
  if (!firstName) throw new PassRegistrationInputError("First name is required.");
  if (!email) throw new PassRegistrationInputError("Email is required.");

  const client = await getInspectPool().connect();
  try {
    await client.query("BEGIN");
    const result = await claimPassWithClient(client, {
      credential,
      firstName,
      email,
      phone,
    });
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    missingTableError(err);
  } finally {
    client.release();
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
