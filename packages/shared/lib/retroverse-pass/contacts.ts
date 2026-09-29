import "server-only";

import { redisCommand } from "@/lib/sunday-nights/redis-live-state";
import { PASS_KEYS, hashGet, hashSet, hashValues } from "./redis-data";

export type ContactRow = {
  id: number; firstName: string; lastName: string | null; email: string | null;
  phone: string | null; timesSeen: number; firstSeen: string | null;
  lastSeen: string | null; notes: string | null;
};
export type ContactInput = {
  firstName: string; lastName?: string | null; email?: string | null;
  phone?: string | null; notes?: string | null;
};

export async function searchContacts(search = ""): Promise<ContactRow[]> {
  const q = search.trim().toLowerCase();
  const contacts = await hashValues<ContactRow>(PASS_KEYS.contacts);
  return contacts.filter((contact) => !q ||
    [contact.firstName, contact.lastName, contact.email, contact.phone, contact.notes]
      .some((value) => value?.toLowerCase().includes(q)))
    .sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "") || b.id - a.id)
    .slice(0, 2000);
}

export async function saveContact(id: number | null, input: ContactInput): Promise<ContactRow> {
  const existing = id == null ? null : await hashGet<ContactRow>(PASS_KEYS.contacts, String(id));
  if (id != null && !existing) throw new Error("Contact not found.");
  const resolvedId = id ?? Number(await redisCommand(["INCR", PASS_KEYS.nextContactId]));
  const contact: ContactRow = {
    id: resolvedId, firstName: input.firstName.trim(), lastName: input.lastName?.trim() || null,
    email: input.email?.trim() || null, phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null, timesSeen: existing?.timesSeen ?? 0,
    firstSeen: existing?.firstSeen ?? null, lastSeen: existing?.lastSeen ?? null,
  };
  await hashSet(PASS_KEYS.contacts, String(resolvedId), contact);
  return contact;
}

export async function deleteContact(id: number): Promise<void> {
  await redisCommand(["HDEL", PASS_KEYS.contacts, String(id)]);
}
