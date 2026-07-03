import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { collectorPassRegistrationsToCsv } from "./csv";
import type { CollectorPassRegistration } from "./types";

export type { CollectorPassRegistration } from "./types";

type CollectorPassRegistrationRow = {
  id: number | string;
  pass_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  created_at: Date | string;
};

const TABLE = "collector_pass_registrations";

function mapRow(row: CollectorPassRegistrationRow): CollectorPassRegistration {
  return {
    id: Number(row.id),
    passNumber: row.pass_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

function searchFilter(
  search: string,
  paramIndex: number,
): { sql: string; param?: string } {
  const q = search.trim();
  if (!q) {
    return { sql: "" };
  }
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return {
    sql: `
      AND (
        pass_number ILIKE $${paramIndex} ESCAPE '\\'
        OR first_name ILIKE $${paramIndex} ESCAPE '\\'
        OR last_name ILIKE $${paramIndex} ESCAPE '\\'
        OR COALESCE(email, '') ILIKE $${paramIndex} ESCAPE '\\'
      )
    `,
    param: pattern,
  };
}

function registrationError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes(TABLE)) {
    throw new Error(
      "Pass registration table missing — run docs/migrations/collector-pass-registrations.sql on production Postgres",
    );
  }
  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    throw new Error("Pass number already registered.");
  }
  throw err instanceof Error ? err : new Error(msg);
}

export async function registerCollectorPass(input: {
  passNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}): Promise<CollectorPassRegistration> {
  const passNumber = input.passNumber.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email?.trim() || null;

  if (!passNumber || !firstName || !lastName) {
    throw new Error("Pass number, first name, and last name are required.");
  }

  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error(ping.error ?? "Database offline — registration unavailable");
  }

  try {
    const rows = await inspectQuery<CollectorPassRegistrationRow>(
      `
      INSERT INTO ${TABLE}
        (pass_number, first_name, last_name, email)
      VALUES ($1, $2, $3, $4)
      RETURNING id, pass_number, first_name, last_name, email, created_at
      `,
      [passNumber, firstName, lastName, email],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("Registration failed");
    }
    return mapRow(row);
  } catch (err) {
    registrationError(err);
  }
}

export async function listCollectorPassRegistrations(input?: {
  search?: string;
  limit?: number;
}): Promise<CollectorPassRegistration[]> {
  const limit = Math.min(Math.max(input?.limit ?? 500, 1), 2000);
  const filter = searchFilter(input?.search ?? "", 2);
  const params = filter.param ? [limit, filter.param] : [limit];

  const rows = await inspectQuery<CollectorPassRegistrationRow>(
    `
    SELECT id, pass_number, first_name, last_name, email, created_at
    FROM ${TABLE}
    WHERE true
    ${filter.sql}
    ORDER BY created_at DESC
    LIMIT $1
    `,
    params,
  );

  return rows.map(mapRow);
}

export async function countCollectorPassRegistrations(search?: string): Promise<number> {
  const filter = searchFilter(search ?? "", 1);
  const rows = await inspectQuery<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM ${TABLE}
    WHERE true
    ${filter.sql}
    `,
    filter.param ? [filter.param] : undefined,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function exportCollectorPassRegistrationsCsv(
  search?: string,
): Promise<string> {
  const rows = await listCollectorPassRegistrations({ search, limit: 2000 });
  return collectorPassRegistrationsToCsv(rows);
}
