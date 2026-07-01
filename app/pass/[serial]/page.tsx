import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PassRegistrationView } from "@/components/pass/PassRegistrationView";
import { findPassBySerial } from "@/lib/ops/event-studio/pass-studio/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ serial: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Pass ${decodeURIComponent(serial)} — Retroverse`,
    robots: { index: false, follow: false },
  };
}

export default async function PassRegistrationPage({ params }: Props) {
  const { serial: rawSerial } = await params;
  const serial = decodeURIComponent(rawSerial).trim();

  const pass = await findPassBySerial(serial);
  if (!pass) notFound();

  return <PassRegistrationView pass={pass} />;
}
