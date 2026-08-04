import "server-only";

import { execFile } from "child_process";
import { access, copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { assignVdjLabelByFilePath } from "@/lib/ops/browser-plus/vdj-label-write";
import { findYtDlp, runYtDlp } from "@/lib/ops/media-collections/ytdlp";

import { checkLocalVideoOwnership, isSongBlockInVdjDatabase, removePartialDownloads } from "./check-local-video";
import { checkDuplicateConflicts } from "./duplicate-check";
import { resolveAvailableProductionPath } from "./destination-path";
import { productionVideoFilename } from "./filenames";
import {
  loadAcquisitionManifest,
  saveAcquisitionManifest,
  updateManifestState,
  writeFailureLog,
} from "./manifest-store";
import {
  assertProductionVideoPath,
  isAllowedYoutubeUrl,
  manifestPathForRvtr,
  productionFolderForYear,
  stagingDirForRvtr,
} from "./paths";
import { isVirtualDjCompatible, probeVideoFile } from "./probe-video";
import type {
  AcquisitionCompletion,
  AcquisitionFailure,
  AcquisitionManifest,
  GenreSource,
  VideoCandidate,
} from "./types";

const execFileAsync = promisify(execFile);

const VIDEO_EXT = /\.(mp4|mkv|webm|mov|m4v)$/i;

const FFMPEG_CANDIDATES = ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findFfmpeg(): Promise<string | null> {
  for (const bin of FFMPEG_CANDIDATES) {
    try {
      await execFileAsync(bin, ["-version"]);
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

async function findDownloadedVideo(stagingDir: string): Promise<string | null> {
  let files: string[] = [];
  try {
    files = await readdir(stagingDir);
  } catch {
    return null;
  }
  const candidates = files.filter((f) => VIDEO_EXT.test(f) && !f.endsWith(".part"));
  if (!candidates.length) return null;
  let best: { path: string; size: number } | null = null;
  for (const name of candidates) {
    const full = join(stagingDir, name);
    try {
      const info = await stat(full);
      if (!best || info.size > best.size) best = { path: full, size: info.size };
    } catch {
      // skip
    }
  }
  return best?.path ?? null;
}

async function remuxToMp4(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) {
    throw new Error("ffmpeg not found — cannot remux incompatible download to MP4.");
  }
  await execFileAsync(
    ffmpeg,
    [
      "-y",
      "-i",
      inputPath,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { timeout: 600_000, maxBuffer: 4 * 1024 * 1024 },
  );
}

async function embedContainerMetadata(input: {
  sourcePath: string;
  outputPath: string;
  artist: string;
  title: string;
  year: number | null;
  genre: string | null;
  grouping: string;
}): Promise<void> {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg) return;
  const args = [
    "-y",
    "-i",
    input.sourcePath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "-metadata",
    `artist=${input.artist}`,
    "-metadata",
    `title=${input.title}`,
    "-metadata",
    `grouping=${input.grouping}`,
  ];
  if (input.year != null) {
    args.push("-metadata", `year=${input.year}`, "-metadata", `date=${input.year}`);
  }
  if (input.genre?.trim()) {
    args.push("-metadata", `genre=${input.genre.trim()}`);
  }
  args.push(input.outputPath);
  await execFileAsync(ffmpeg, args, { timeout: 600_000, maxBuffer: 4 * 1024 * 1024 });
}

export async function applyVdjLabelForAcquisitionFile(input: {
  filePath: string;
  rvtr: string;
}): Promise<{
  vdjLabelStatus: NonNullable<AcquisitionManifest["vdjLabelStatus"]>;
  vdjLabelMessage: string;
  vdjBackupPath: string | null;
  manualRescanRequired: boolean;
}> {
  const rvtr = input.rvtr.trim().toUpperCase();
  const inDatabase = await isSongBlockInVdjDatabase(input.filePath);
  if (!inDatabase) {
    return {
      vdjLabelStatus: "not_in_database",
      vdjLabelMessage:
        "VirtualDJ has not scanned this filepath yet. Rescan the production video folder, then confirm Label=RVTR.",
      vdjBackupPath: null,
      manualRescanRequired: true,
    };
  }

  const labelResult = await assignVdjLabelByFilePath(input.filePath, rvtr);
  if (labelResult.ok && labelResult.changed) {
    return {
      vdjLabelStatus: "written",
      vdjLabelMessage: labelResult.message,
      vdjBackupPath: labelResult.backupPath,
      manualRescanRequired: false,
    };
  }
  if (labelResult.skipped) {
    return {
      vdjLabelStatus: "skipped",
      vdjLabelMessage: labelResult.message,
      vdjBackupPath: labelResult.backupPath,
      manualRescanRequired: false,
    };
  }
  if (labelResult.ok) {
    return {
      vdjLabelStatus: "written",
      vdjLabelMessage: labelResult.message,
      vdjBackupPath: labelResult.backupPath,
      manualRescanRequired: false,
    };
  }
  return {
    vdjLabelStatus: "failed",
    vdjLabelMessage: labelResult.message,
    vdjBackupPath: labelResult.backupPath,
    manualRescanRequired: true,
  };
}

function candidateTypeGrouping(candidateType: VideoCandidate["candidateType"]): string {
  switch (candidateType) {
    case "official_music_video":
      return "Official Video";
    case "official_live_performance":
      return "Performance";
    case "television_performance":
      return "Performance";
    case "concert_footage":
      return "Performance";
    case "lyric_video":
      return "Lyric Video";
    case "visualizer":
      return "Visualizer";
    default:
      return "Video";
  }
}

function fail(stage: string, message: string, recoverableAction: string): AcquisitionFailure {
  return { state: "failed", stage, message, recoverableAction };
}

export async function approveAcquisitionCandidate(input: {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  vdjFilePath?: string | null;
  candidate: VideoCandidate;
  genre?: string | null;
  genreSource?: GenreSource;
}): Promise<{ ok: true; manifest: AcquisitionManifest } | { ok: false; failure: AcquisitionFailure; conflicts?: string[] }> {
  const rvtr = input.rvtr.trim().toUpperCase();
  if (!isAllowedYoutubeUrl(input.candidate.webpageUrl)) {
    return {
      ok: false,
      failure: fail("approve", "Source URL is not an allowed YouTube URL.", "Select a different candidate."),
    };
  }

  const stagingDir = stagingDirForRvtr(rvtr);
  const conflicts = await checkDuplicateConflicts({
    rvtr,
    artist: input.artist,
    title: input.title,
    year: input.year,
    candidate: input.candidate,
    stagingDir,
  });
  if (conflicts.length > 0) {
    return {
      ok: false,
      failure: fail(
        "approve",
        conflicts[0]!.message,
        conflicts[0]!.kind === "rvtr_already_owned"
          ? "This song is already owned. Reset only if you intend a separate Replace sprint."
          : "Resolve the conflict or choose another candidate.",
      ),
      conflicts: conflicts.map((c) => c.message),
    };
  }

  const destinationDir = productionFolderForYear(input.year);
  const destinationPath = await resolveAvailableProductionPath({
    destinationDir,
    artist: input.artist,
    title: input.title,
    ext: "mp4",
  });

  const manifest = await updateManifestState(rvtr, {
    state: "approved",
    artist: input.artist,
    title: input.title,
    year: input.year,
    genre: input.genre?.trim() || null,
    genreSource: input.genre?.trim() ? (input.genreSource ?? "none") : "none",
    vdjFilePath: input.vdjFilePath ?? null,
    selectedCandidate: input.candidate,
    approvedCandidate: {
      videoId: input.candidate.videoId,
      title: input.candidate.title,
      webpageUrl: input.candidate.webpageUrl,
      channel: input.candidate.channel,
      durationSeconds: input.candidate.durationSeconds,
      candidateType: input.candidate.candidateType,
      approvedAt: new Date().toISOString(),
    },
    destinationPath,
    sourceUrl: input.candidate.webpageUrl,
    youtubeId: input.candidate.videoId,
    failureStage: null,
    failureMessage: null,
  });

  return { ok: true, manifest };
}

export async function executeApprovedAcquisition(rvtrInput: string): Promise<
  | { ok: true; completion: AcquisitionCompletion; manifest: AcquisitionManifest }
  | { ok: false; failure: AcquisitionFailure; manifest?: AcquisitionManifest }
> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const manifest = await loadAcquisitionManifest(rvtr);
  if (!manifest?.approvedCandidate) {
    return {
      ok: false,
      failure: fail("execute", "No approved candidate for this RVTR.", "Approve a candidate first."),
    };
  }
  if (manifest.state !== "approved" && manifest.state !== "failed") {
    return {
      ok: false,
      failure: fail("execute", `Acquisition is in state ${manifest.state}, not approved.`, "Reset or approve again."),
      manifest,
    };
  }

  const candidate = manifest.selectedCandidate ?? {
    videoId: manifest.approvedCandidate.videoId,
    title: manifest.approvedCandidate.title,
    webpageUrl: manifest.approvedCandidate.webpageUrl,
    channel: manifest.approvedCandidate.channel,
    durationSeconds: manifest.approvedCandidate.durationSeconds,
    thumbnailUrl: "",
    uploadDate: null,
    viewCount: null,
    availability: null,
    liveStatus: null,
    candidateType: manifest.approvedCandidate.candidateType,
  };

  const stagingDir = stagingDirForRvtr(rvtr);
  await mkdir(stagingDir, { recursive: true });

  const conflicts = await checkDuplicateConflicts({
    rvtr,
    artist: manifest.artist,
    title: manifest.title,
    year: manifest.year,
    candidate,
    stagingDir,
  });
  if (conflicts.length > 0) {
    const failure = fail("duplicate-check", conflicts[0]!.message, "Resolve conflict before downloading.");
    await updateManifestState(rvtr, {
      state: "failed",
      failureStage: failure.stage,
      failureMessage: failure.message,
    });
    await writeFailureLog(rvtr, failure.stage, failure.message);
    return { ok: false, failure, manifest };
  }

  const owned = await checkLocalVideoOwnership({
    rvtr,
    artist: manifest.artist,
    title: manifest.title,
    vdjFilePath: manifest.vdjFilePath,
  });
  if (owned.owned) {
    const failure = fail(
      "local-check",
      "Local video already exists for this song.",
      "Skip acquisition or wait for a Replace sprint.",
    );
    await updateManifestState(rvtr, {
      state: "failed",
      failureStage: failure.stage,
      failureMessage: failure.message,
    });
    return { ok: false, failure, manifest };
  }

  await updateManifestState(rvtr, { state: "downloading" });
  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    const failure = fail("download", "yt-dlp not found on PATH.", "Install yt-dlp and retry.");
    await updateManifestState(rvtr, { state: "failed", failureStage: failure.stage, failureMessage: failure.message });
    await writeFailureLog(rvtr, failure.stage, failure.message);
    return { ok: false, failure };
  }

  const outputTemplate = join(stagingDir, "%(id)s.%(ext)s");
  const args = [
    "--extractor-args",
    "youtube:player_client=android,web",
    "-f",
    "bv*[height<=1080][ext=mp4][vcodec^=avc1]+ba[ext=m4a]/bv*[height<=1080][ext=mp4]+ba/b[ext=mp4]/18",
    "--merge-output-format",
    "mp4",
    "--write-info-json",
    "--embed-thumbnail",
    "--continue",
    "--no-overwrites",
    "--no-playlist",
    "--no-warnings",
    "-o",
    outputTemplate,
    candidate.webpageUrl,
  ];

  const { code, stderr } = await runYtDlp(ytdlp, args);
  let downloadedPath = await findDownloadedVideo(stagingDir);
  if (!downloadedPath) {
    await removePartialDownloads(stagingDir);
    const detail = stderr.trim().slice(-400) || `yt-dlp exited with code ${code}`;
    const failure = fail("download", detail, "Try another candidate or edit the search query.");
    await updateManifestState(rvtr, { state: "failed", failureStage: failure.stage, failureMessage: failure.message });
    await writeFailureLog(rvtr, failure.stage, failure.message);
    return { ok: false, failure };
  }

  const infoJsonPath = downloadedPath.replace(/\.[^.]+$/, ".info.json");
  if (await fileExists(infoJsonPath)) {
    const raw = await readFile(infoJsonPath, "utf8");
    await writeFile(join(stagingDir, "metadata.info.json"), `${raw.trim()}\n`, "utf8");
  }

  await updateManifestState(rvtr, { state: "validating", downloadedFormat: downloadedPath.split(".").pop() ?? "mp4" });
  let probe = await probeVideoFile(downloadedPath);
  if (!probe.valid) {
    await removePartialDownloads(stagingDir);
    const failure = fail("validate", probe.reason ?? "Download failed validation.", "Try another candidate.");
    await updateManifestState(rvtr, { state: "failed", failureStage: failure.stage, failureMessage: failure.message, validation: probe });
    await writeFailureLog(rvtr, failure.stage, failure.message);
    return { ok: false, failure };
  }

  let workingPath = downloadedPath;
  if (!isVirtualDjCompatible(probe)) {
    const remuxPath = join(stagingDir, `${candidate.videoId}.remux.mp4`);
    try {
      await remuxToMp4(downloadedPath, remuxPath);
      workingPath = remuxPath;
      probe = await probeVideoFile(workingPath);
      if (!probe.valid || !isVirtualDjCompatible(probe)) {
        const failure = fail(
          "validate",
          "Downloaded media is not VirtualDJ-compatible and remux did not fix it.",
          "Choose another candidate.",
        );
        await updateManifestState(rvtr, { state: "failed", failureStage: failure.stage, failureMessage: failure.message, validation: probe });
        await writeFailureLog(rvtr, failure.stage, failure.message);
        return { ok: false, failure };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failure = fail("validate", message, "Choose another candidate.");
      await updateManifestState(rvtr, { state: "failed", failureStage: failure.stage, failureMessage: failure.message, validation: probe });
      await writeFailureLog(rvtr, failure.stage, failure.message);
      return { ok: false, failure };
    }
  }

  const destinationDir = productionFolderForYear(manifest.year);
  await mkdir(destinationDir, { recursive: true });
  let destinationPath = manifest.destinationPath;
  if (!destinationPath || (await fileExists(destinationPath))) {
    destinationPath = await resolveAvailableProductionPath({
      destinationDir,
      artist: manifest.artist,
      title: manifest.title,
      ext: manifest.downloadedFormat ?? "mp4",
    });
  }
  assertProductionVideoPath(destinationPath);

  await updateManifestState(rvtr, { state: "moving", destinationPath });
  const destinationFilename = destinationPath.split("/").pop() ?? productionVideoFilename(manifest.artist, manifest.title);
  const preparedPath = join(stagingDir, destinationFilename);
  await embedContainerMetadata({
    sourcePath: workingPath,
    outputPath: preparedPath,
    artist: manifest.artist,
    title: manifest.title,
    year: manifest.year,
    genre: manifest.genre,
    grouping: candidateTypeGrouping(candidate.candidateType),
  });
  if (!(await fileExists(preparedPath))) {
    await copyFile(workingPath, preparedPath);
  }

  await rename(preparedPath, destinationPath);

  await updateManifestState(rvtr, { state: "writing-vdj-label", finalPath: destinationPath, validation: probe });

  const labelOutcome = await applyVdjLabelForAcquisitionFile({
    filePath: destinationPath,
    rvtr,
  });
  const vdjLabelStatus = labelOutcome.vdjLabelStatus;
  const vdjLabelMessage = labelOutcome.vdjLabelMessage;
  const vdjBackupPath = labelOutcome.vdjBackupPath;
  const manualRescanRequired = labelOutcome.manualRescanRequired;

  const completed = await updateManifestState(rvtr, {
    state: "complete",
    finalPath: destinationPath,
    vdjLabelStatus,
    vdjLabelMessage,
    vdjBackupPath,
    failureStage: null,
    failureMessage: null,
  });
  await saveAcquisitionManifest(completed);

  return {
    ok: true,
    manifest: completed,
    completion: {
      state: "complete",
      finalPath: destinationPath,
      fileSizeBytes: probe.fileSizeBytes,
      durationSeconds: probe.durationSeconds,
      width: probe.width,
      height: probe.height,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      sourceUrl: candidate.webpageUrl,
      youtubeId: candidate.videoId,
      rvtr,
      vdjLabelStatus: vdjLabelStatus ?? "not_in_database",
      vdjLabelMessage,
      vdjBackupPath,
      manualRescanRequired,
      manifestPath: manifestPathForRvtr(rvtr),
    },
  };
}

export async function resetAcquisition(rvtrInput: string): Promise<AcquisitionManifest> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const existing = await loadAcquisitionManifest(rvtr);
  return updateManifestState(rvtr, {
    state: "idle",
    artist: existing?.artist ?? "",
    title: existing?.title ?? "",
    year: existing?.year ?? null,
    searchQuery: null,
    selectedCandidate: null,
    approvedCandidate: null,
    candidates: [],
    destinationPath: null,
    finalPath: null,
    sourceUrl: null,
    youtubeId: null,
    downloadedFormat: null,
    validation: null,
    vdjLabelStatus: null,
    vdjLabelMessage: null,
    vdjBackupPath: null,
    failureStage: null,
    failureMessage: null,
  });
}
