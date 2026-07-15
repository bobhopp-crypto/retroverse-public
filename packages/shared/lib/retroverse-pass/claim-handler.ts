import { NextResponse } from "next/server";

import { claimPass, PassRegistrationInputError, updatePassVisitor } from "./store";
import { normalizePassSerial } from "./types";

type Claim = typeof claimPass;
type Update = typeof updatePassVisitor;

type ClaimPayload = {
  serial?: string;
  firstName?: string;
  email?: string;
  phone?: string | null;
};

export async function handlePassClaim(req: Request, claim: Claim = claimPass) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as ClaimPayload;
  const credential = normalizePassSerial(payload.serial);
  if (!credential) {
    return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  }

  try {
    const result = await claim({
      serial: credential,
      firstName: payload.firstName ?? "",
      email: payload.email,
      phone: payload.phone,
    });
    return NextResponse.json({ ok: true, pass: result.pass, visitor: result.visitor });
  } catch (err) {
    if (err instanceof PassRegistrationInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Pass registration is temporarily unavailable." },
      { status: 503 },
    );
  }
}

/** Edit path for a visitor who already registered this exact pass. */
export async function handlePassUpdate(req: Request, update: Update = updatePassVisitor) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as ClaimPayload;
  const credential = normalizePassSerial(payload.serial);
  if (!credential) {
    return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  }

  try {
    const result = await update({
      serial: credential,
      firstName: payload.firstName ?? "",
      email: payload.email,
      phone: payload.phone,
    });
    return NextResponse.json({ ok: true, pass: result.pass, visitor: result.visitor });
  } catch (err) {
    if (err instanceof PassRegistrationInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Pass update is temporarily unavailable." },
      { status: 503 },
    );
  }
}
