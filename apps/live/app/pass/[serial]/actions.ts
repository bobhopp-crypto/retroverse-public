"use server";

import { registerResolvedPass, type RegistrationBoundaryResult } from "@/lib/ops/event-studio/pass-studio/registration";
import { findPassBySerial, registerPassByResolvedId } from "@/lib/ops/event-studio/pass-studio/store";

export type RegisterPassInput = {
  serial: string;
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
export async function registerPass(input: RegisterPassInput): Promise<RegistrationBoundaryResult> {
  const firstName = input.firstName.trim();
  if (!firstName) throw new Error("First name is required.");

  return registerResolvedPass(input.serial, input.passId, {
    firstName,
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    notes: input.notes.trim(),
    giveawayOptIn: input.giveawayOptIn,
    registeredAt: new Date().toISOString(),
  }, { resolveSerial: findPassBySerial, registerById: registerPassByResolvedId });
}
