import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ merchantKey: string }>;
};

export default async function OpsFinanceMerchantDetailRedirectPage({ params }: Props) {
  const { merchantKey } = await params;
  redirect(`/ops/finance/reports/merchants/${encodeURIComponent(merchantKey)}`);
}
