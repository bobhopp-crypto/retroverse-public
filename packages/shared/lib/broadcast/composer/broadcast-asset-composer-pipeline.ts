import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";

import { composeBroadcastAsset } from "./compose";
import { extractBroadcastInputFromPackage } from "./extract-input";
import type { ComposedBroadcastAsset } from "./types";

const LOG_PREFIX = "[BroadcastAssetComposer]";

export type BroadcastAssetPackagePhase = "idle" | "loading" | "ready" | "error";

export type BroadcastAssetPackageState = {
  phase: BroadcastAssetPackagePhase;
  requestedRvtr: string | null;
  packageLookupUrl: string | null;
  fetchStatus: number | null;
  responseBody: string | null;
  packageFound: boolean;
  errorReason: string | null;
  pkg: UniversalPackagePayload | null;
};

export function initialBroadcastAssetPackageState(
  requestedRvtr: string | null,
): BroadcastAssetPackageState {
  return {
    phase: requestedRvtr ? "loading" : "idle",
    requestedRvtr,
    packageLookupUrl: null,
    fetchStatus: null,
    responseBody: null,
    packageFound: false,
    errorReason: null,
    pkg: null,
  };
}

export function logBroadcastAssetComposer(
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (typeof console === "undefined" || typeof console.info !== "function") return;
  if (detail) {
    console.info(LOG_PREFIX, message, detail);
    return;
  }
  console.info(LOG_PREFIX, message);
}

export function packageLookupUrlForRvtr(rvtr: string): string {
  return `/api/retroverse-live/now-playing-package?rvtr=${encodeURIComponent(rvtr)}`;
}

export async function loadBroadcastAssetPackage(
  requestedRvtr: string,
  fallbackAsset: ComposedBroadcastAsset,
): Promise<BroadcastAssetPackageState> {
  const url = packageLookupUrlForRvtr(requestedRvtr);

  logBroadcastAssetComposer("package lookup start", {
    requestedRvtr,
    packageLookupUrl: url,
    fallbackTitle: fallbackAsset.input.title,
    fallbackArtist: fallbackAsset.input.artist,
  });

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const bodyPreview = text.slice(0, 400);

    logBroadcastAssetComposer("package lookup response", {
      requestedRvtr,
      fetchStatus: res.status,
      responseBody: bodyPreview,
    });

    if (!res.ok) {
      const reason = `HTTP ${res.status} from now-playing-package`;
      logBroadcastAssetComposer("package lookup failed — using fallback asset", {
        requestedRvtr,
        reason,
        earlyReturn: "fetch-not-ok",
      });
      return {
        phase: "error",
        requestedRvtr,
        packageLookupUrl: url,
        fetchStatus: res.status,
        responseBody: bodyPreview,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      };
    }

    let parsed: { package: UniversalPackagePayload | null } | null = null;
    try {
      parsed = JSON.parse(text) as { package: UniversalPackagePayload | null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invalid JSON";
      logBroadcastAssetComposer("package lookup failed — JSON parse", {
        requestedRvtr,
        reason,
        earlyReturn: "json-parse-error",
      });
      return {
        phase: "error",
        requestedRvtr,
        packageLookupUrl: url,
        fetchStatus: res.status,
        responseBody: bodyPreview,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      };
    }

    const pkg = parsed?.package ?? null;
    const packageFound = Boolean(pkg?.rvtr && pkg.rvtr.toUpperCase() === requestedRvtr.toUpperCase());

    logBroadcastAssetComposer("package lookup parsed", {
      requestedRvtr,
      packageFound,
      packageRvtr: pkg?.rvtr ?? null,
      packageTitle: pkg?.title ?? null,
    });

    if (!packageFound) {
      const reason = "package field null or RVTR mismatch";
      logBroadcastAssetComposer("package not found — using fallback asset", {
        requestedRvtr,
        reason,
        earlyReturn: "package-null",
      });
      return {
        phase: "error",
        requestedRvtr,
        packageLookupUrl: url,
        fetchStatus: res.status,
        responseBody: bodyPreview,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      };
    }

    return {
      phase: "ready",
      requestedRvtr,
      packageLookupUrl: url,
      fetchStatus: res.status,
      responseBody: bodyPreview,
      packageFound: true,
      errorReason: null,
      pkg,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "fetch failed";
    logBroadcastAssetComposer("package lookup threw — using fallback asset", {
      requestedRvtr,
      reason,
      earlyReturn: "fetch-threw",
    });
    return {
      phase: "error",
      requestedRvtr,
      packageLookupUrl: url,
      fetchStatus: null,
      responseBody: null,
      packageFound: false,
      errorReason: reason,
      pkg: null,
    };
  }
}

export function composeBroadcastAssetFromPackageState(
  fallbackAsset: ComposedBroadcastAsset,
  packageState: BroadcastAssetPackageState,
): ComposedBroadcastAsset {
  if (packageState.phase === "ready" && packageState.pkg) {
    const input = extractBroadcastInputFromPackage(packageState.pkg);
    if (input.title || input.artist) {
      logBroadcastAssetComposer("render using package", {
        requestedRvtr: packageState.requestedRvtr,
        title: input.title,
        artist: input.artist,
      });
      return composeBroadcastAsset(input);
    }
    logBroadcastAssetComposer("package missing title/artist — fallback asset", {
      requestedRvtr: packageState.requestedRvtr,
      earlyReturn: "package-empty-meta",
    });
  }

  logBroadcastAssetComposer("render using fallback asset", {
    requestedRvtr: packageState.requestedRvtr ?? fallbackAsset.input.rvtr,
    phase: packageState.phase,
    title: fallbackAsset.input.title,
    artist: fallbackAsset.input.artist,
  });
  return fallbackAsset;
}
