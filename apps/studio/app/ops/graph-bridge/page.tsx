import { readFile } from "node:fs/promises";
import path from "node:path";
import { RV_CATEGORY_BY_ID } from "@/lib/bobos/rv-registry";
import GraphBridgeWorkspace from "./workspace";
import { loadIntegrityDashboard } from "@/lib/ops/integrity/load-integrity-dashboard";
import { loadTrackPage } from "@/lib/track/load-track-page";
import "./graph-bridge.css";

export const dynamic = "force-dynamic";

async function readReport(file: string) {
  try { return await readFile(path.join(process.cwd(), "../../reports/billboard-bridge", file), "utf8"); } catch { return "Report unavailable in this environment."; }
}

function metrics(markdown: string) {
  return [...markdown.matchAll(/^\|\s*([^|]+?)\s*\|\s*([\d,]+)\s*\|$/gm)].map((match) => ({ label: match[1]!.trim(), value: match[2]! })).filter((item) => item.label !== "Metric");
}

export default async function GraphBridgePage(props: { searchParams?: Promise<{ q?: string; trace?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q ?? "";
  const initialDashboard = await loadIntegrityDashboard({ query, traceRvtr: searchParams?.trace });
  const dashboard = query && !searchParams?.trace && initialDashboard.searchResults[0]?.rvtr
    ? await loadIntegrityDashboard({ query, traceRvtr: initialDashboard.searchResults[0].rvtr })
    : initialDashboard;
  const rvtr = query || searchParams?.trace ? searchParams?.trace ?? dashboard.searchResults[0]?.rvtr : undefined;
  const [bridge, policy, track] = await Promise.all([readReport("bridge-summary.md"), readReport("hot100-chronological-policy/summary.md"), rvtr ? loadTrackPage(rvtr).catch(() => null) : Promise.resolve(null)]);
  return <GraphBridgeWorkspace accent={RV_CATEGORY_BY_ID.RV06.accent} bridgeMetrics={metrics(bridge)} policyMetrics={metrics(policy)} dashboard={dashboard} track={track} reports={[{ title: "Bridge Summary", href: "/reports/billboard-bridge/bridge-summary.md", format: "Open Markdown" }, { title: "Integrity Reports", href: "/reports/billboard-bridge/bridge-missing-albums.csv", format: "Open CSV" }, { title: "Duplicate Reports", href: "/reports/billboard-bridge/bridge-multiple-albums.csv", format: "Open CSV" }, { title: "Coverage Reports", href: "/reports/billboard-bridge/bridge-artwork-fallback.csv", format: "Open CSV" }]} />;
}
