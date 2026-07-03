import { NextResponse } from "next/server";

import {
  getInstitutionAccountBySlug,
  updateInstitutionAccountSetup,
} from "@/lib/ops/finance/db/institution-accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isInstitutionAccountSlug } from "@/lib/ops/finance/institution-accounts-config";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const { slug } = await context.params;
  if (!isInstitutionAccountSlug(slug)) {
    return NextResponse.json({ error: "Unknown account" }, { status: 404 });
  }

  await ensureFinanceSchema();
  const existing = await getInstitutionAccountBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    manualBalance?: number | null;
    manualBalanceAsOf?: string | null;
    setupStatus?: string;
  };

  const updated = await updateInstitutionAccountSetup({
    slug,
    manualBalance: body.manualBalance,
    manualBalanceAsOf: body.manualBalanceAsOf,
    setupStatus: body.setupStatus,
  });

  return NextResponse.json({ account: updated });
}
