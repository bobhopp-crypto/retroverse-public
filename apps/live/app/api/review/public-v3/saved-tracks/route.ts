import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
type SavedTrack = { rvtr: string; artist: string; title: string; savedAt: string };
const filePath = () => join(process.cwd(), "data/ops/review/public-v3-saved-tracks.json");
async function load(): Promise<SavedTrack[]> { try { return JSON.parse(await readFile(filePath(), "utf8")) as SavedTrack[]; } catch { return []; } }
export async function GET() { return NextResponse.json({ ok: true, tracks: await load() }); }
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SavedTrack>;
  if (!/^RVTR\d{6}$/.test(body.rvtr ?? "") || !body.artist?.trim() || !body.title?.trim()) return NextResponse.json({ ok: false, error: "A complete canonical track is required." }, { status: 400 });
  const rvtr = body.rvtr as string;
  const tracks = await load();
  if (!tracks.some((track) => track.rvtr === rvtr)) { tracks.unshift({ rvtr, artist: body.artist.trim(), title: body.title.trim(), savedAt: new Date().toISOString() }); await mkdir(join(process.cwd(), "data/ops/review"), { recursive: true }); await writeFile(filePath(), `${JSON.stringify(tracks, null, 2)}\n`, "utf8"); }
  return NextResponse.json({ ok: true, tracks });
}
export async function DELETE(request: Request) {
  const rvtr = new URL(request.url).searchParams.get("rvtr")?.toUpperCase();
  const tracks = (await load()).filter((track) => track.rvtr !== rvtr);
  await mkdir(join(process.cwd(), "data/ops/review"), { recursive: true }); await writeFile(filePath(), `${JSON.stringify(tracks, null, 2)}\n`, "utf8");
  return NextResponse.json({ ok: true, tracks });
}
