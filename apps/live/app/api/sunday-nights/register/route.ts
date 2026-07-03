import { NextResponse } from "next/server";

import { registerCollectorPass } from "@/lib/sunday-nights/pass-registrations";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    passNumber?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
  };

  try {
    const entry = await registerCollectorPass({
      passNumber: payload.passNumber ?? "",
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      email: payload.email,
    });
    return NextResponse.json({ ok: true, registration: entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    const status = message.includes("required")
      ? 400
      : message.includes("already registered")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
