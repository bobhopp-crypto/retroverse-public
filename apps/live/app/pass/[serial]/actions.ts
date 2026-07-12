"use server";

import { registerPassById } from "@/lib/ops/event-studio/pass-studio/store";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

export type RegisterPassInput = {
  passId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  giveawayOptIn: boolean;
};

/** Public, unauthenticated — guests register from the QR on their printed pass. */
export async function registerPass(input: RegisterPassInput): Promise<GeneratedPass> {
  const firstName = input.firstName.trim();
  if (!firstName) throw new Error("First name is required.");

  const updated = await registerPassById(input.passId, {
    firstName,
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    notes: input.notes.trim(),
    giveawayOptIn: input.giveawayOptIn,
    registeredAt: new Date().toISOString(),
  });

  if (!updated) throw new Error("Pass not found.");
  return updated;
}
