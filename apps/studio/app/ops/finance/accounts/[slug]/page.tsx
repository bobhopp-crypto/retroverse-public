import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FinanceAppleCardAccount } from "@/components/ops/finance/FinanceAppleCardAccount";
import { FinanceAccountDetail } from "@/components/ops/finance/FinanceAccountDetail";
import { FinanceShell } from "@/components/ops/finance/FinanceShell";
import { countImportsNeedingAttention } from "@/lib/ops/finance/db/import-attention";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import {
  isInstitutionAccountSlug,
  type InstitutionAccountSlug,
} from "@/lib/ops/finance/institution-accounts-config";
import { loadAppleCardAccount } from "@/lib/ops/finance/load-apple-card-account";
import { loadFinanceAccountDetail } from "@/lib/ops/finance/load-finance-account-detail";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { inspectPing } from "@/lib/inspect/pg";

import "../../../ops.css";
import "../../finance-ops.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isInstitutionAccountSlug(slug)) {
    return { title: "Account — Finance" };
  }
  if (slug === "apple-card") {
    const data = await loadAppleCardAccount();
    return { title: data ? `${data.name} — Finance` : "Account — Finance" };
  }
  const data = await loadFinanceAccountDetail(slug);
  return {
    title: data ? `${data.name} — Finance` : "Account — Finance",
    robots: { index: false, follow: false },
  };
}

export default async function OpsFinanceAccountDetailPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { slug } = await params;
  if (!isInstitutionAccountSlug(slug)) notFound();

  let importAttentionCount = 0;
  const ping = await inspectPing();
  if (ping.ok) {
    await ensureFinanceSchema();
    importAttentionCount = await countImportsNeedingAttention();
  }

  if (slug === "apple-card") {
    const appleData = await loadAppleCardAccount();
    if (!appleData) notFound();
    return (
      <FinanceShell
        title={appleData.name}
        subtitle="Statement-first account"
        importAttentionCount={importAttentionCount}
        active="account"
        accountSlug="apple-card"
      >
        <FinanceAppleCardAccount data={appleData} />
      </FinanceShell>
    );
  }

  const data = await loadFinanceAccountDetail(slug as InstitutionAccountSlug);
  if (!data) notFound();

  return (
    <FinanceShell
      title={data.name}
      subtitle="Account overview"
      importAttentionCount={importAttentionCount}
      active="account"
      accountSlug={slug as InstitutionAccountSlug}
    >
      <FinanceAccountDetail data={data} />
    </FinanceShell>
  );
}
