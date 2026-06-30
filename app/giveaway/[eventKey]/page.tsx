import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GiveawayRegistrationPageClient } from "@/components/giveaway/GiveawayRegistrationPageClient";
import { loadGiveawayStudioByEventKey } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";

import "./giveaway-register.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventKey } = await params;
  return {
    title: `Giveaway — ${decodeURIComponent(eventKey)}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicGiveawayRegistrationPage({ params }: Props) {
  const { eventKey: rawKey } = await params;
  const eventKey = slugifyEventKey(decodeURIComponent(rawKey));
  const snapshot = await loadGiveawayStudioByEventKey(eventKey);
  const giveaway = snapshot.activeGiveaway;

  if (!giveaway) notFound();

  return (
    <Suspense fallback={<main className="gv-register"><p>Loading…</p></main>}>
      <GiveawayRegistrationPageClient
        eventKey={eventKey}
        giveawayId={giveaway.id}
        headline={giveaway.registration.headline}
        prizeTitle={giveaway.prize.title}
        prizeDescription={giveaway.prize.description}
        heroImageUrl={giveaway.prize.heroImageUrl}
        confirmationDefault={giveaway.registration.confirmationMessage}
        fields={giveaway.registration.fields}
      />
    </Suspense>
  );
}
