/**
 * Audit production + local live channel state.
 * Usage: node tools/audit-live-channel.mjs [baseUrl]
 */
const BASE = process.argv[2]?.trim() || "https://retroverse.live";

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text), headers: res.headers };
  } catch {
    return { status: res.status, data: text, headers: res.headers };
  }
}

async function fetchHead(path) {
  const res = await fetch(`${BASE}${path}`, { method: "HEAD", redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function main() {
  console.log(`# Live Channel Audit — ${BASE}\n`);

  const current = await fetchJson("/api/sunday-nights/current");
  console.log("## API /api/sunday-nights/current");
  console.log(`status: ${current.status}`);
  if (current.data && typeof current.data === "object") {
    const d = current.data;
    console.log(`channel.running: ${d.channel?.running ?? "n/a"}`);
    console.log(`currentTrackId: ${d.currentTrackId ?? "null"}`);
    console.log(`live.rvtr: ${d.live?.rvtr ?? "null"}`);
    console.log(`live.source: ${d.live?.source ?? "null"}`);
    console.log(`live.title: ${d.live?.title ?? "null"}`);
    console.log(`updatedAt: ${d.updatedAt ?? "null"}`);
    console.log(`destination: ${JSON.stringify(d.destination ?? null)}`);
  } else {
    console.log(current.data);
  }

  console.log("\n## Route headers");
  for (const path of ["/", "/live", "/sunday-nights", "/retroverse-2/live"]) {
    const head = await fetchHead(path);
    console.log(`${path} -> ${head.status}${head.location ? ` location=${head.location}` : ""}`);
  }

  console.log("\n## Pass criteria");
  const d = current.data;
  const okRunning = d?.channel?.running === true;
  const rvtr = d?.currentTrackId || d?.live?.rvtr;
  const okRvtr = typeof rvtr === "string" && /^RVTR\d{6}$/i.test(rvtr);
  console.log(`channel.running=true: ${okRunning ? "PASS" : "FAIL"}`);
  console.log(`live RVTR populated: ${okRvtr ? `PASS (${rvtr})` : "FAIL"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
