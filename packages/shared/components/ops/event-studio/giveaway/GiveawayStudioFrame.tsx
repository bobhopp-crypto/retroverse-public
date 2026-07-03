import type { ReactNode } from "react";

import { EventStudioShell } from "@/components/ops/event-studio/EventStudioShell";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import type { GiveawayStudioSection } from "@/lib/ops/event-studio/giveaway/types";

import { GiveawayStudioNav } from "./GiveawayStudioNav";

type Props = {
  active: GiveawayStudioSection;
  title: string;
  lead: string;
  workspace?: boolean;
  children: ReactNode;
};

export async function GiveawayStudioFrame({ active, title, lead, workspace = false, children }: Props) {
  const [binder, snapshot] = await Promise.all([loadProductionBinder(), loadGiveawayStudio()]);
  const giveaway = snapshot.activeGiveaway;

  return (
    <EventStudioShell
      active="giveaway"
      snapshot={binder.snapshot}
      title={title}
      lead={lead}
      workspace={workspace}
    >
      <GiveawayStudioNav
        active={active}
        prizeTitle={giveaway?.prize.title ?? "Giveaway"}
        status={giveaway?.status ?? "draft"}
      />
      {children}
    </EventStudioShell>
  );
}
