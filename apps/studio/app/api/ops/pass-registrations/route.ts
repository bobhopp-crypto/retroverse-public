import { NextResponse } from "next/server";

import {
  countCollectorPassRegistrations,
  exportCollectorPassRegistrationsCsv,
  listCollectorPassRegistrations,
} from "@/lib/collector-pass/registrations";
import { inspectPing } from "@/lib/inspect/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const format = url.searchParams.get("format")?.trim().toLowerCase();

  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { pgOk: false, pgError: ping.error ?? "Postgres offline", registrations: [], count: 0 },
      { status: 503 },
    );
  }

  try {
    if (format === "csv") {
      const csv = await exportCollectorPassRegistrationsCsv(search);
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="collector-pass-registrations-${stamp}.csv"`,
        },
      });
    }

    const [registrations, count] = await Promise.all([
      listCollectorPassRegistrations({ search }),
      countCollectorPassRegistrations(search),
    ]);

    return NextResponse.json({
      pgOk: true,
      count,
      registrations,
      search,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message, pgOk: false }, { status: 500 });
  }
}
