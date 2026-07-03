import { NextResponse } from "next/server";

import { addPublicGiveawayEntry } from "@/lib/ops/event-studio/giveaway/entries";
import { getActiveGiveaway, loadGiveawayStudioState } from "@/lib/ops/event-studio/giveaway/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      eventKey?: string;
      giveawayId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      birthday?: string;
      favoriteDecade?: string;
      favoriteArtist?: string;
      favoriteGenre?: string;
      newsletterOptIn?: boolean;
    };

    const eventKey = body.eventKey?.trim();
    const giveawayId = body.giveawayId?.trim();
    if (!eventKey || !giveawayId) {
      return NextResponse.json({ error: "Missing eventKey or giveawayId" }, { status: 400 });
    }

    const state = await loadGiveawayStudioState(eventKey);
    const giveaway = state.giveaways.find((entry) => entry.id === giveawayId) ?? getActiveGiveaway(state);
    if (!giveaway || giveaway.eventKey !== eventKey) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 });
    }

    const entry = await addPublicGiveawayEntry(
      eventKey,
      {
        giveawayId,
        firstName: body.firstName ?? "",
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        birthday: body.birthday,
        favoriteDecade: body.favoriteDecade,
        favoriteArtist: body.favoriteArtist,
        favoriteGenre: body.favoriteGenre,
        newsletterOptIn: body.newsletterOptIn,
      },
      giveaway.registration.fields,
    );

    return NextResponse.json({
      ok: true,
      confirmationMessage: giveaway.registration.confirmationMessage,
      entry,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
