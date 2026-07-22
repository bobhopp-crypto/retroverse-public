import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CredentialsApp } from "@/app/credentials/CredentialsApp";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const metadata: Metadata = {
  title: "Credentials — BobOS",
  description: "AI Credential Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function BobosCredentialsPage() {
  if (!shouldAllowOpsRoutes()) notFound();
  return <CredentialsApp />;
}
