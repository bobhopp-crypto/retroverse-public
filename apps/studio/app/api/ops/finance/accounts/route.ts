import { NextResponse } from "next/server";

import {
  createFinanceAccount,
  listFinanceAccounts,
} from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();
  const accounts = await listFinanceAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const body = (await request.json()) as { name?: string; active?: boolean };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  try {
    const account = await createFinanceAccount({ name, active: body.active });
    return NextResponse.json({ account });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
