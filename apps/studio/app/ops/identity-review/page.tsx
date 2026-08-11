import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdentityReviewConsole } from "./IdentityReviewConsole";
import { loadIdentityReviewQueue } from "@/lib/ops/identity-review-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import "./identity-review.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Identity Review — Retroverse Ops", robots: { index: false, follow: false } };

export default async function IdentityReviewPage() {
  if (!isOpsEnabled()) notFound();
  return <IdentityReviewConsole initialQueue={await loadIdentityReviewQueue()} />;
}
