import "server-only";

import { getPassPool, passQuery } from "@/lib/retroverse-pass/pg";

export type ContactRow = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  timesSeen: number;
  firstSeen: string | null;
  lastSeen: string | null;
  notes: string | null;
};

type DbContact = {
  id: number | string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  times_seen: number;
  first_seen: Date | string | null;
  last_seen: Date | string | null;
  notes: string | null;
};

const iso = (value: Date | string | null) => (value == null ? null : new Date(value).toISOString());
const map = (row: DbContact): ContactRow => ({
  id: Number(row.id), firstName: row.first_name, lastName: row.last_name,
  email: row.email, phone: row.phone, timesSeen: Number(row.times_seen),
  firstSeen: iso(row.first_seen), lastSeen: iso(row.last_seen), notes: row.notes,
});

export async function searchContacts(search = ""): Promise<ContactRow[]> {
  const q = search.trim();
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await passQuery<DbContact>(
    `SELECT id, first_name, last_name, email, phone, times_seen, first_seen, last_seen, notes
     FROM retroverse_contacts
     WHERE $1 = '' OR first_name ILIKE $2 ESCAPE '\\' OR COALESCE(last_name,'') ILIKE $2 ESCAPE '\\'
       OR COALESCE(email,'') ILIKE $2 ESCAPE '\\' OR COALESCE(phone,'') ILIKE $2 ESCAPE '\\'
       OR COALESCE(notes,'') ILIKE $2 ESCAPE '\\'
     ORDER BY last_seen DESC NULLS LAST, id DESC LIMIT 2000`, [q, pattern]);
  return rows.map(map);
}

export type ContactInput = { firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; notes?: string | null };

export async function saveContact(id: number | null, input: ContactInput): Promise<ContactRow> {
  const pool = getPassPool();
  const values = [input.firstName.trim(), input.lastName?.trim() || null, input.email?.trim() || null, input.phone?.trim() || null, input.notes?.trim() || null];
  const result = id == null
    ? await pool.query<DbContact>(`INSERT INTO retroverse_contacts (first_name,last_name,email,phone,notes) VALUES ($1,$2,$3,$4,$5) RETURNING id,first_name,last_name,email,phone,times_seen,first_seen,last_seen,notes`, values)
    : await pool.query<DbContact>(`UPDATE retroverse_contacts SET first_name=$2,last_name=$3,email=$4,phone=$5,notes=$6,updated_at=now() WHERE id=$1 RETURNING id,first_name,last_name,email,phone,times_seen,first_seen,last_seen,notes`, [id, ...values]);
  if (!result.rows[0]) throw new Error("Contact not found.");
  return map(result.rows[0]);
}

export async function deleteContact(id: number): Promise<void> {
  await passQuery(`DELETE FROM retroverse_contacts WHERE id = $1`, [id]);
}
