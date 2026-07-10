import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";

import { composeBroadcastAsset } from "./compose";
import { extractBroadcastInputFromPackage } from "./extract-input";
import type { ComposedBroadcastAsset } from "./types";

const LOG_PREFIX = "[BroadcastAssetComposer]";
const RVTR_RE = /^RVTR\d{6}$/i;

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
  const normalizedRvtr = requestedRvtr.trim().toUpperCase();

  if (!RVTR_RE.test(normalizedRvtr)) {
    logBroadcastAssetComposer("package lookup skipped — requested id is not a canonical RVTR", {
      requestedRvtr: normalizedRvtr,
      earlyReturn: "invalid-rvtr-format",
      fallbackTitle: fallbackAsset.input.title,
      fallbackArtist: fallbackAsset.input.artist,
    });
    return {
      phase: "idle",
      requestedRvtr: normalizedRvtr,
      packageLookupUrl: null,
      fetchStatus: null,
      responseBody: null,
      packageFound: false,
      errorReason: null,
      pkg: null,
    };
  }

  const url = packageLookupUrlForRvtr(normalizedRvtr);

  logBroadcastAssetComposer("package lookup start", {
    requestedRvtr: normalizedRvtr,
    packageLookupUrl: url,
    fallbackTitle: fallbackAsset.input.title,
    fallbackArtist: fallbackAsset.input.artist,
  });

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const bodyPreview = text.slice(0, 400);

    logBroadcastAssetComposer("package lookup response", {
      requestedRvtr: normalizedRvtr,
      fetchStatus: res.status,
      responseOk: res.ok,
      rawResponseText: bodyPreview,
    });

    if (!res.ok) {
      const reason = `HTTP ${res.status} from now-playing-package`;
      logBroadcastAssetComposer("package lookup failed — using fallback asset", {
        requestedRvtr: normalizedRvtr,
        reason,
        earlyReturn: "fetch-not-ok",
      });
      return {
        phase: "error",
        requestedRvtr: normalizedRvtr,
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
        requestedRvtr: normalizedRvtr,
        reason,
        rawResponseText: bodyPreview,
        earlyReturn: "json-parse-error",
      });
      return {
        phase: "error",
        requestedRvtr: normalizedRvtr,
        packageLookupUrl: url,
        fetchStatus: res.status,
        responseBody: bodyPreview,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      };
    }

    logBroadcastAssetComposer("package lookup json parsed", {
      requestedRvtr: normalizedRvtr,
      parsedTopLevelKeys: parsed ? Object.keys(parsed) : [],
      jsonPackage: parsed?.package ?? null,
      jsonPackageType: typeof parsed?.package,
      jsonPackageKeys:
        parsed?.package && typeof parsed.package === "object"
          ? Object.keys(parsed.package)
          : [],
    });

    const pkg = parsed?.package ?? null;
    const packageRvtr = pkg?.rvtr?.trim().toUpperCase() ?? null;
    const packageFound = Boolean(packageRvtr && packageRvtr === normalizedRvtr);

    logBroadcastAssetComposer("package lookup parsed", {
      requestedRvtr: normalizedRvtr,
      packageFound,
      packageRvtr,
      packageTitle: pkg?.title ?? null,
      typeofPackage: typeof pkg,
    });

    if (!packageFound) {
      const reason = "package field null or RVTR mismatch";
      logBroadcastAssetComposer("package not found — using fallback asset", {
        requestedRvtr: normalizedRvtr,
        reason,
        packageRvtr,
        earlyReturn: "package-null",
      });
      return {
        phase: "error",
        requestedRvtr: normalizedRvtr,
        packageLookupUrl: url,
        fetchStatus: res.status,
        responseBody: bodyPreview,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      };
    }

    logBroadcastAssetComposer("package state will be ready", {
      requestedRvtr: normalizedRvtr,
      packageFound: true,
      packageKeys: Object.keys(pkg as object),
    });

    return {
      phase: "ready",
      requestedRvtr: normalizedRvtr,
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
      requestedRvtr: normalizedRvtr,
      reason,
      earlyReturn: "fetch-threw",
    });
    return {
      phase: "error",
      requestedRvtr: normalizedRvtr,
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
