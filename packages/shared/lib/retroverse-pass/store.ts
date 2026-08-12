import { getPassPool, passQuery } from "@/lib/retroverse-pass/pg";

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
  email: string | null;
  phone: string | null;
  last_name?: string | null;
  birthday?: Date | string | null;
  postal_code?: string | null;
  marketing_opt_in?: boolean;
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
    status: row.claimed ? "registered" : "never_registered",
  };
}

function mapVisitor(row: VisitorRow): RetroverseVisitor {
  return {
    id: Number(row.id),
    firstName: row.first_name,
    email: row.email,
    phone: row.phone,
    lastName: row.last_name ?? null,
    birthday: row.birthday == null ? null : String(row.birthday),
    postalCode: row.postal_code ?? null,
    marketingOptIn: row.marketing_opt_in ?? false,
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
  query: QueryRows = passQuery,
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

type VisitorInput = { firstName: string; lastName?: string | null; email: string | null; phone: string | null; birthday?: string | null; postalCode?: string | null; marketingOptIn?: boolean };

/** Create or claim one credential while holding its Postgres row lock. */
export async function claimPassWithClient(
  client: TransactionClient,
  input: { credential: string } & VisitorInput,
): Promise<PassScanResult & { state: "claimed" }> {
  await client.query(`INSERT INTO ${PASSES} (serial) VALUES ($1) ON CONFLICT (serial) DO NOTHING`, [input.credential]);
  const passRows = await client.query<PassRow>(
    `SELECT serial, claimed, visitor_id, claimed_at FROM ${PASSES} WHERE serial = $1 FOR UPDATE`,
    [input.credential],
  );
  const existingRow = passRows.rows[0];
  if (!existingRow) throw new Error("Credential provisioning failed.");
  const existing = mapPass(existingRow);

  if (existing.claimed && existing.visitorId != null) {
    const visitorRows = await client.query<VisitorRow>(
      `SELECT id, first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in, created_at FROM ${VISITORS} WHERE id = $1`,
      [existing.visitorId],
    );
    const visitor = visitorRows.rows[0];
    if (!visitor) throw new Error("Registered visitor is unavailable.");
    return { state: "claimed", pass: existing, visitor: mapVisitor(visitor) };
  }

  const matchedRows = await client.query<VisitorRow>(
    `SELECT id, first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in, created_at FROM ${VISITORS}
     WHERE ($1::text IS NOT NULL AND lower(email)=lower($1)) OR ($2::text IS NOT NULL AND phone=$2) ORDER BY created_at ASC LIMIT 1`,
    [input.email, input.phone],
  );
  const visitorRows = matchedRows.rows.length ? { rows: matchedRows.rows } : await client.query<VisitorRow>(
    `INSERT INTO ${VISITORS} (first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in, created_at`,
    [input.firstName, input.lastName ?? null, input.email, input.phone, input.birthday || null, input.postalCode ?? null, input.marketingOptIn ?? false],
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
  email?: string | null;
  phone?: string | null;
  lastName?: string | null; birthday?: string | null; postalCode?: string | null; marketingOptIn?: boolean;
}): Promise<PassScanResult & { state: "claimed" }> {
  const credential = parsePassCredential(input.serial);
  const firstName = input.firstName.trim();
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (!credential) throw new PassRegistrationInputError("Invalid pass credential.");
  if (!firstName) throw new PassRegistrationInputError("First name is required.");

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const result = await claimPassWithClient(client, {
      credential,
      firstName,
      lastName: input.lastName,
      email,
      phone,
      birthday: input.birthday,
      postalCode: input.postalCode,
      marketingOptIn: input.marketingOptIn,
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

/**
 * Edit the visitor already registered to a claimed pass, while holding its
 * Postgres row lock. The pass must already be claimed — this is not a
 * general visitor-update endpoint, only a correction path for the person
 * holding that exact pass. Logs PASS_EDITED.
 */
export async function updateVisitorWithClient(
  client: TransactionClient,
  input: { credential: string } & VisitorInput,
): Promise<PassScanResult & { state: "claimed" }> {
  const passRows = await client.query<PassRow>(
    `SELECT serial, claimed, visitor_id, claimed_at FROM ${PASSES} WHERE serial = $1 FOR UPDATE`,
    [input.credential],
  );
  const existingRow = passRows.rows[0];
  if (!existingRow) throw new PassRegistrationInputError("This pass is not registered yet.");
  const existing = mapPass(existingRow);
  if (!existing.claimed || existing.visitorId == null) {
    throw new PassRegistrationInputError("This pass is not registered yet.");
  }

  const visitorRows = await client.query<VisitorRow>(
    `UPDATE ${VISITORS} SET first_name = $2, last_name = $3, email = $4, phone = $5, birthday = $6, postal_code = $7, marketing_opt_in = $8 WHERE id = $1
     RETURNING id, first_name, last_name, email, phone, birthday, postal_code, marketing_opt_in, created_at`,
    [existing.visitorId, input.firstName, input.lastName ?? null, input.email, input.phone, input.birthday || null, input.postalCode ?? null, input.marketingOptIn ?? false],
  );
  const visitor = visitorRows.rows[0];
  if (!visitor) throw new Error("Registered visitor is unavailable.");

  await client.query(
    `INSERT INTO ${ACTIVITY} (visitor_id, pass_serial, event_type, metadata)
     VALUES ($1, $2, 'PASS_EDITED', NULL)`,
    [existing.visitorId, input.credential],
  );
  return { state: "claimed", pass: existing, visitor: mapVisitor(visitor) };
}

export async function updatePassVisitor(input: {
  serial: string;
  firstName: string;
  email?: string | null;
  phone?: string | null;
  lastName?: string | null; birthday?: string | null; postalCode?: string | null; marketingOptIn?: boolean;
}): Promise<PassScanResult & { state: "claimed" }> {
  const credential = parsePassCredential(input.serial);
  const firstName = input.firstName.trim();
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (!credential) throw new PassRegistrationInputError("Invalid pass credential.");
  if (!firstName) throw new PassRegistrationInputError("First name is required.");

  const client = await getPassPool().connect();
  try {
    await client.query("BEGIN");
    const result = await updateVisitorWithClient(client, { credential, firstName, lastName: input.lastName, email, phone, birthday: input.birthday, postalCode: input.postalCode, marketingOptIn: input.marketingOptIn });
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (err instanceof PassRegistrationInputError) throw err;
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
    await passQuery(
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
