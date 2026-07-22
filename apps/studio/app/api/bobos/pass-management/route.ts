import { NextResponse } from "next/server";

import {
  deletePass,
  listPassActivity,
  resetPassClaim,
  searchPassManagement,
  updatePassSerial,
  updatePassVisitorFields,
} from "@/lib/retroverse-pass/pass-management";
import { PassRegistrationInputError } from "@/lib/retroverse-pass/store";
import { passPing } from "@/lib/retroverse-pass/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const serial = url.searchParams.get("serial")?.trim() ?? "";
  const activity = url.searchParams.get("activity") === "1";

  const ping = await passPing();
  if (!ping.ok) {
    return NextResponse.json(
      {
        ok: false,
        pgOk: false,
        pgError:
          ping.error ??
          "Pass database offline. Configure RETROVERSE_PASS_PG_* (Neon production).",
        passes: [],
        summary: { totalPasses: 0, claimed: 0, unclaimed: 0, claimedToday: 0 },
      },
      { status: 503 },
    );
  }

  try {
    if (activity && serial) {
      const events = await listPassActivity(serial);
      return NextResponse.json({
        ok: true,
        pgOk: true,
        identity: ping.identity,
        serial,
        events,
      });
    }

    const { passes, summary } = await searchPassManagement(search);
    return NextResponse.json({
      ok: true,
      pgOk: true,
      identity: ping.identity,
      search,
      summary,
      passes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message, pgOk: false }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      action?: "member" | "serial" | "reset";
      serial?: string;
      nextSerial?: string;
      firstName?: string;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    };

    const serial = body.serial?.trim() ?? "";
    if (!serial) {
      return NextResponse.json({ error: "Pass serial is required." }, { status: 400 });
    }

    if (body.action === "reset") {
      const pass = await resetPassClaim(serial);
      return NextResponse.json({ ok: true, pass });
    }

    if (body.action === "serial") {
      const pass = await updatePassSerial(serial, body.nextSerial ?? "");
      return NextResponse.json({ ok: true, pass });
    }

    if (body.action === "member") {
      const pass = await updatePassVisitorFields(serial, {
        firstName: body.firstName ?? "",
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
      });
      return NextResponse.json({ ok: true, pass });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status =
      err instanceof PassRegistrationInputError || message.includes("not found")
        ? message.includes("not found") || message.includes("not registered")
          ? 404
          : 400
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { serial?: string; confirm?: string };
    const serial = body.serial?.trim() ?? "";
    if (!serial) {
      return NextResponse.json({ error: "Pass serial is required." }, { status: 400 });
    }
    if (body.confirm !== serial) {
      return NextResponse.json(
        { error: "Confirmation serial must match the pass serial exactly." },
        { status: 400 },
      );
    }
    const pass = await deletePass(serial);
    return NextResponse.json({ ok: true, pass });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
