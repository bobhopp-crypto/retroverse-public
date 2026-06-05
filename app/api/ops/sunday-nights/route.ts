import { NextResponse } from "next/server";

import { loadSundayEventSongs } from "@/lib/sunday-nights/load-playlist";
import { saveRvtrAlias } from "@/lib/sunday-nights/rvtr-aliases";
import { loadSundayNightsState, setCurrentTrackId } from "@/lib/sunday-nights/state";
import { loadTrackPage } from "@/lib/track/load-track-page";
import type { SundayYearFilter } from "@/lib/sunday-nights/playlist-types";
import { SUNDAY_EVENT_YEARS } from "@/lib/sunday-nights/playlist-types";
import { addWorkingListEntry } from "@/lib/sunday-nights/working-list";

export const dynamic = "force-dynamic";

function parseYearFilter(raw: unknown): SundayYearFilter {
  if (raw === "all") return "all";
  const y = Number(raw);
  if (SUNDAY_EVENT_YEARS.includes(y as (typeof SUNDAY_EVENT_YEARS)[number])) {
    return y as (typeof SUNDAY_EVENT_YEARS)[number];
  }
  return 1967;
}

export async function GET(req: Request) {
  try {
    const year = new URL(req.url).searchParams.get("year");
    const playlist = new URL(req.url).searchParams.get("playlist");
    const yearParam = year ?? (playlist && /^\d{4}$/.test(playlist) ? playlist : null);
    const state = await loadSundayNightsState();
    const [track, event] = await Promise.all([
      state.currentTrackId ? loadTrackPage(state.currentTrackId) : Promise.resolve(null),
      loadSundayEventSongs(yearParam),
    ]);

    return NextResponse.json({ state, track, ...event });
  } catch (err) {
    console.error("[ops/sunday-nights GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    op?: string;
    currentTrackId?: string | null;
    artist?: string;
    title?: string;
    rvtr?: string;
    path?: string | null;
    remember?: boolean;
    bankYear?: SundayYearFilter;
    year?: number;
  };

  if (payload.op === "setTrack") {
    try {
      const state = await setCurrentTrackId(payload.currentTrackId ?? null);
      const track = state.currentTrackId
        ? await loadTrackPage(state.currentTrackId)
        : null;
      return NextResponse.json({ state, track });
    } catch (err) {
      console.error("[ops/sunday-nights PATCH setTrack]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Update failed" },
        { status: 500 },
      );
    }
  }

  if (payload.op === "saveAlias") {
    const artist = payload.artist?.trim() ?? "";
    const title = payload.title?.trim() ?? "";
    const rvtr = payload.rvtr?.trim() ?? "";
    if (!artist || !title || !rvtr) {
      return NextResponse.json({ error: "artist, title, and rvtr required" }, { status: 400 });
    }

    try {
      const alias =
        payload.remember === false
          ? null
          : await saveRvtrAlias({
              artist,
              title,
              rvtr,
              path: payload.path ?? null,
            });

      const yearParam =
        payload.bankYear != null ? String(parseYearFilter(payload.bankYear)) : "1967";
      const [state, track, event] = await Promise.all([
        loadSundayNightsState(),
        loadSundayNightsState().then((s) =>
          s.currentTrackId ? loadTrackPage(s.currentTrackId) : Promise.resolve(null),
        ),
        loadSundayEventSongs(yearParam),
      ]);

      return NextResponse.json({
        alias,
        state,
        track,
        ...event,
      });
    } catch (err) {
      console.error("[ops/sunday-nights PATCH saveAlias]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Alias save failed" },
        { status: 500 },
      );
    }
  }

  if (payload.op === "addToWorkingList") {
    const artist = payload.artist?.trim() ?? "";
    const title = payload.title?.trim() ?? "";
    const path = payload.path?.trim() ?? "";
    const bankYear = parseYearFilter(payload.bankYear ?? 1967);
    const year = typeof payload.year === "number" ? payload.year : new Date().getFullYear();

    if (!artist || !title) {
      return NextResponse.json({ error: "artist and title required" }, { status: 400 });
    }

    try {
      const addition = await addWorkingListEntry({
        bankYear,
        year,
        artist,
        title,
        rvtr: payload.rvtr?.trim().toUpperCase() ?? null,
        path: path || `search://${artist}/${title}`,
      });

      const event = await loadSundayEventSongs(String(bankYear));
      return NextResponse.json({ addition, ...event });
    } catch (err) {
      console.error("[ops/sunday-nights PATCH addToWorkingList]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Add failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
