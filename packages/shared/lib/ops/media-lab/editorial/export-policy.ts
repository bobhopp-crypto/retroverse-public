import { resolve, sep } from "node:path";
import type { EditorialSegment, EditorialSegmentManifest } from "./segment-manifest";

export function sanitizeExportPart(value: string, fallback = "UNKNOWN") {
  const clean = value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return clean || fallback;
}

export function exportPathFor(segment: EditorialSegment, root: string, sequence: number) {
  const group = segment.primaryClass === "performance" ? "PERFORMANCES" : segment.primaryClass === "documentary_scene" ? "DOCUMENTARY_SCENES" : "UNKNOWN";
  const subtype = sanitizeExportPart(segment.secondaryClass ?? "unknown", "UNKNOWN").toUpperCase();
  const label = sanitizeExportPart([segment.artistPeople, segment.song, segment.title].filter(Boolean).join(" "));
  return resolve(root, group, subtype, `${String(sequence).padStart(4, "0")}_${segment.primaryClass.toUpperCase()}_${label}_${sanitizeExportPart(segment.id)}.mp4`);
}

export function eligibleForQueue(segment: EditorialSegment) {
  return segment.reviewStatus === "approved" && (segment.exportStatus === "not_queued" || segment.exportStatus === "failed");
}
export function eligibleForExport(segment: EditorialSegment, manifest: EditorialSegmentManifest, currentFingerprint: string, sourcePath: string, root: string) {
  const errors = [...(segment.reviewStatus !== "approved" ? ["segment is not approved"] : []), ...(segment.exportStatus !== "queued" ? ["segment is not queued"] : []), ...(segment.sourceFingerprint !== currentFingerprint || manifest.sourceFingerprint !== currentFingerprint ? ["source fingerprint mismatch"] : [])];
  if (!sourcePath) errors.push("source is missing");
  if (!Number.isFinite(segment.startSeconds) || !Number.isFinite(segment.endSeconds) || segment.endSeconds <= segment.startSeconds) errors.push("invalid segment bounds");
  if (!Number.isFinite(manifest.sourceDurationSeconds) || segment.endSeconds > manifest.sourceDurationSeconds + 0.05) errors.push("segment exceeds source duration");
  const output = segment.outputFilepath ?? exportPathFor(segment, root, 1);
  const resolvedRoot = resolve(root); const resolvedOutput = resolve(output);
  if (resolvedOutput !== resolvedRoot && !resolvedOutput.startsWith(`${resolvedRoot}${sep}`)) errors.push("output path escapes approved root");
  if (resolve(sourcePath) === resolvedOutput) errors.push("output would overwrite source");
  return { errors, output };
}

export function ffmpegArgs(method: "stream_copy" | "transcode", start: number, duration: number, source: string, output: string) {
  return method === "stream_copy" ? ["-hide_banner", "-y", "-ss", String(start), "-i", source, "-t", String(duration), "-map", "0", "-c", "copy", output] : ["-hide_banner", "-y", "-ss", String(start), "-i", source, "-t", String(duration), "-map", "0:v:0?", "-map", "0:a:0?", "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", output];
}
