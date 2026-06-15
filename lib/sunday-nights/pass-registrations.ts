import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import type { PassRegistration } from "./types";

type PassRegistrationRow = {
  pass_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  created_at: Date | string;
};

function mapRow(row: PassRegistrationRow): PassRegistration {
  return {
    passNumber: row.pass_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    registeredAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export async function registerCollectorPass(input: {
  passNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}): Promise<PassRegistration> {
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
    const rows = await inspectQuery<PassRegistrationRow>(
      `
      INSERT INTO sunday_nights_pass_registrations
        (pass_number, first_name, last_name, email)
      VALUES ($1, $2, $3, $4)
      RETURNING pass_number, first_name, last_name, email, created_at
      `,
      [passNumber, firstName, lastName, email],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("Registration failed");
    }
    return mapRow(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("sunday_nights_pass_registrations")) {
      throw new Error(
        "Pass registration table missing — run docs/migrations/sunday-nights-pass-registrations.sql on production Postgres",
      );
    }
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      throw new Error("Pass number already registered.");
    }
    throw err;
  }
}
