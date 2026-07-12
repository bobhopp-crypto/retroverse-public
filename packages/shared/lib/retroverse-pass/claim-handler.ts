import { NextResponse } from "next/server";

import { claimPass, PassRegistrationInputError } from "./store";
import { parsePassCredential } from "./types";

type Claim = typeof claimPass;

export async function handlePassClaim(req: Request, claim: Claim = claimPass) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    serial?: string;
    firstName?: string;
    email?: string;
    phone?: string | null;
  };
  const credential = parsePassCredential(payload.serial);
  if (!credential) {
    return NextResponse.json({ error: "Invalid pass credential." }, { status: 400 });
  }

  try {
    const result = await claim({
      serial: credential,
      firstName: payload.firstName ?? "",
      email: payload.email ?? "",
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
