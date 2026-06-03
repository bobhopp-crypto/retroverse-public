import { NextResponse } from "next/server";

import {
  buildVdjPlaylistXml,
  sanitizeExportName,
  writeVdjPlaylistExport,
} from "@/lib/ops/show-builder/export-playlist";
import { loadShowBuilderProject } from "@/lib/ops/show-builder/load";
import {
  addFlowSet,
  addFlowTransition,
  assignShowSong,
  createShowSet,
  deleteShowSet,
  removeFlowSet,
  removeFlowTransition,
  renameShowSet,
  reorderShowFlow,
  setSelectedYears,
  toggleSetCollapsed,
  updateFlowTransition,
} from "@/lib/ops/show-builder/state";
import type { ShowBuilderProjectFile } from "@/lib/ops/show-builder/types";

export const dynamic = "force-dynamic";

function parseFlow(raw: unknown): ShowBuilderProjectFile["flow"] {
  if (!Array.isArray(raw)) return [];
  const out: ShowBuilderProjectFile["flow"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { type?: string; setId?: string; id?: string; note?: string };
    if (row.type === "set" && typeof row.setId === "string" && row.setId.trim()) {
      out.push({ type: "set", setId: row.setId.trim() });
    } else if (
      row.type === "transition" &&
      typeof row.id === "string" &&
      typeof row.note === "string"
    ) {
      out.push({ type: "transition", id: row.id, note: row.note });
    }
  }
  return out;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get("export") === "1") {
    try {
      const name = sanitizeExportName(url.searchParams.get("name") ?? "Show");
      const xml = await buildVdjPlaylistXml();
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.vdjplaylist"`,
        },
      });
    } catch (err) {
      console.error("[show-builder export]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Export failed" },
        { status: 500 },
      );
    }
  }

  try {
    return NextResponse.json(await loadShowBuilderProject());
  } catch (err) {
    console.error("[show-builder GET]", err);
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
    name?: string;
    setId?: string;
    songKey?: string;
    insertBefore?: string | null;
    collapsed?: boolean;
    selectedYears?: number[];
    flow?: unknown;
    transitionId?: string;
    note?: string;
    exportName?: string;
    saveToDisk?: boolean;
  };

  const op = payload.op?.trim();

  try {
    if (op === "setSelectedYears") {
      if (!Array.isArray(payload.selectedYears)) {
        return NextResponse.json({ error: "selectedYears required" }, { status: 400 });
      }
      await setSelectedYears(payload.selectedYears);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "createSet") {
      if (typeof payload.name !== "string") {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      await createShowSet(payload.name);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "deleteSet") {
      const setId = payload.setId?.trim();
      if (!setId) return NextResponse.json({ error: "setId required" }, { status: 400 });
      await deleteShowSet(setId);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "renameSet") {
      const setId = payload.setId?.trim();
      if (!setId || typeof payload.name !== "string") {
        return NextResponse.json({ error: "setId and name required" }, { status: 400 });
      }
      await renameShowSet(setId, payload.name);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "toggleCollapse") {
      const setId = payload.setId?.trim();
      if (!setId || typeof payload.collapsed !== "boolean") {
        return NextResponse.json({ error: "setId and collapsed required" }, { status: 400 });
      }
      await toggleSetCollapsed(setId, payload.collapsed);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "assign") {
      const songKey = payload.songKey?.trim();
      if (!songKey) {
        return NextResponse.json({ error: "songKey required" }, { status: 400 });
      }
      const setId =
        payload.setId === null || payload.setId === undefined
          ? null
          : payload.setId.trim() || null;
      const insertBefore =
        payload.insertBefore === null || payload.insertBefore === undefined
          ? null
          : payload.insertBefore.trim() || null;
      await assignShowSong(songKey, setId, insertBefore);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "reorderFlow") {
      await reorderShowFlow(parseFlow(payload.flow));
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "addFlowSet") {
      const setId = payload.setId?.trim();
      if (!setId) return NextResponse.json({ error: "setId required" }, { status: 400 });
      await addFlowSet(setId);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "removeFlowSet") {
      const setId = payload.setId?.trim();
      if (!setId) return NextResponse.json({ error: "setId required" }, { status: 400 });
      await removeFlowSet(setId);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "addTransition") {
      await addFlowTransition(typeof payload.note === "string" ? payload.note : "Transition");
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "updateTransition") {
      const id = payload.transitionId?.trim();
      if (!id || typeof payload.note !== "string") {
        return NextResponse.json({ error: "transitionId and note required" }, { status: 400 });
      }
      await updateFlowTransition(id, payload.note);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "removeTransition") {
      const id = payload.transitionId?.trim();
      if (!id) return NextResponse.json({ error: "transitionId required" }, { status: 400 });
      await removeFlowTransition(id);
      return NextResponse.json(await loadShowBuilderProject());
    }

    if (op === "exportSave") {
      const name = sanitizeExportName(payload.exportName ?? "Show");
      const outPath = await writeVdjPlaylistExport(name);
      return NextResponse.json({
        ...(await loadShowBuilderProject()),
        exportedPath: outPath,
      });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    console.error("[show-builder PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
