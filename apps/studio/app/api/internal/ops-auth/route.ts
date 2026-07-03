import { NextResponse } from "next/server";

import { expectedOpsPin, OPS_GATE_COOKIE, isOpsEnabled } from "@/lib/ops/ops-gate";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const pin =
    typeof body === "object" && body && "pin" in body
      ? String((body as { pin: unknown }).pin).trim()
      : "";

  if (pin !== expectedOpsPin()) {
    return NextResponse.json({ ok: false, error: "bad_pin" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OPS_GATE_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
