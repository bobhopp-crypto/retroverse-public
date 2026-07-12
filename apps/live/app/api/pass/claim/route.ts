import { NextResponse } from "next/server";

import { claimPass } from "@/lib/retroverse-pass/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";

export const dynamic = "force-dynamic";

/** Public, unauthenticated — visitors claim the pass from the QR overlay. */
export async function POST(req: Request) {
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

  const serial = payload.serial ?? "";
  if (!normalizePassSerial(serial)) {
    return NextResponse.json({ error: "Invalid pass serial." }, { status: 400 });
  }

  try {
    const result = await claimPass({
      serial,
      firstName: payload.firstName ?? "",
      email: payload.email ?? "",
      phone: payload.phone,
    });
    return NextResponse.json({ ok: true, pass: result.pass, visitor: result.visitor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claim failed";
    const status = message.includes("required") || message.includes("Invalid")
      ? 400
      : message.includes("not found")
        ? 404
        : message.includes("Ambiguous")
          ? 409
          : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
