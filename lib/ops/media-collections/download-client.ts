import type { DownloadRunState } from "./download-state";

export type StartBackgroundDownloadResult = {
  ok: boolean;
  started?: boolean;
  error?: string;
  progress?: DownloadRunState;
  httpStatus: number;
};

export async function fetchDownloadProgress(
  slug: string,
): Promise<DownloadRunState | null> {
  const res = await fetch(`/api/ops/media-collections/${slug}/download`);
  if (!res.ok) return null;
  const json = (await res.json()) as { progress?: DownloadRunState };
  return json.progress ?? null;
}

export async function startBackgroundDownload(
  slug: string,
): Promise<StartBackgroundDownloadResult> {
  const res = await fetch(`/api/ops/media-collections/${slug}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ background: true }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    started?: boolean;
    error?: string;
    progress?: DownloadRunState;
  };
  return {
    ok: Boolean(res.ok && json.ok),
    started: json.started,
    error: json.error,
    progress: json.progress,
    httpStatus: res.status,
  };
}

export const DOWNLOAD_STARTED_NOTICE =
  "Download started — resuming missing episodes in background.";

export function downloadStartErrorMessage(
  result: StartBackgroundDownloadResult,
): string {
  if (result.httpStatus === 409) {
    return result.error || "Download already running";
  }
  return result.error || "Download failed to start";
}
