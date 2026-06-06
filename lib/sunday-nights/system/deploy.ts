const DEFAULT_REPO = "bobhopp-crypto/retroverse-public";
const DEFAULT_BRANCH = "main";

export type DeployPreview = {
  branch: string;
  commit: string;
  message: string;
  repo: string;
};

export type DeployResult = {
  ok: boolean;
  branch: string;
  commit: string;
  url: string;
  status: "PASS" | "FAIL";
  detail: string;
};

export async function fetchDeployPreview(): Promise<DeployPreview> {
  const repo = process.env.GITHUB_REPO?.trim() || DEFAULT_REPO;
  const branch = process.env.GITHUB_DEPLOY_BRANCH?.trim() || DEFAULT_BRANCH;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits/${branch}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) {
      return {
        branch,
        commit: "unknown",
        message: `Could not fetch commit (${res.status})`,
        repo,
      };
    }
    const data = (await res.json()) as { sha?: string; commit?: { message?: string } };
    return {
      branch,
      commit: data.sha?.slice(0, 7) ?? "unknown",
      message: data.commit?.message?.split("\n")[0] ?? "",
      repo,
    };
  } catch (err) {
    return {
      branch,
      commit: "unknown",
      message: err instanceof Error ? err.message : "fetch failed",
      repo,
    };
  }
}

/** Trigger Vercel production deploy via deploy hook URL. */
export async function triggerProductionDeploy(): Promise<DeployResult> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  const preview = await fetchDeployPreview();

  if (!hook) {
    return {
      ok: false,
      branch: preview.branch,
      commit: preview.commit,
      url: "https://retroverse.live",
      status: "FAIL",
      detail: "VERCEL_DEPLOY_HOOK_URL not configured",
    };
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        branch: preview.branch,
        commit: preview.commit,
        url: "https://retroverse.live",
        status: "FAIL",
        detail: `Deploy hook returned ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`,
      };
    }

    return {
      ok: true,
      branch: preview.branch,
      commit: preview.commit,
      url: "https://retroverse.live",
      status: "PASS",
      detail: "Production deploy triggered. Allow 2–3 minutes for retroverse.live to update.",
    };
  } catch (err) {
    return {
      ok: false,
      branch: preview.branch,
      commit: preview.commit,
      url: "https://retroverse.live",
      status: "FAIL",
      detail: err instanceof Error ? err.message : "Deploy request failed",
    };
  }
}
