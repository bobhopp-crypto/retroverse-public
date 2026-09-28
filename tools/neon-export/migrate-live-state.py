#!/usr/bin/env python3
"""One-time transfer of four small live records from Neon to existing Upstash."""
import argparse
import json
import os
import subprocess
import tempfile
import urllib.request
from pathlib import Path

MAPPING = {
    "live": "rv:live:sunday-nights:v2",
    "live-control": "rv:live:live-control:v1",
    "experience-selector": "rv:live:experience-selector:v1",
    "retroverse-live-broadcast": "rv:live:broadcast-snapshot:v1",
}


def parse_env(path: Path) -> dict[str, str]:
    values = {}
    for line in path.read_text().splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment", choices=["preview", "production"], required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    pgvars = parse_env(Path("/Users/bobhopp/RETROVERSE_PUBLIC/.env.local"))
    pg_env = os.environ.copy()
    for suffix in ("HOST", "PORT", "DATABASE", "USER", "PASSWORD"):
        pg_env["PG" + suffix] = pgvars["RETROVERSE_PASS_PG_" + suffix]
    pg_env["PGSSLMODE"] = "require" if pgvars.get("RETROVERSE_PASS_PG_SSL") != "0" else "disable"
    with tempfile.TemporaryDirectory(prefix="retroverse-live-transfer-") as directory:
        path = Path(directory) / "env"
        result = subprocess.run(
            ["vercel", "env", "pull", str(path), f"--environment={args.environment}", "--yes"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=45,
        )
        if result.returncode:
            raise RuntimeError("Unable to read connected Redis environment")
        kvvars = parse_env(path)
        url = kvvars.get("LIVE_KV_REST_API_URL")
        token = kvvars.get("LIVE_KV_REST_API_TOKEN")
        if not url or not token:
            raise RuntimeError("Connected Redis credentials are missing")
        for source, target in MAPPING.items():
            result = subprocess.run(
                ["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c",
                 "SELECT value::text FROM sunday_nights_state WHERE key = '" + source + "'"],
                env=pg_env,
                capture_output=True,
                text=True,
                timeout=45,
            )
            if result.returncode:
                raise RuntimeError(f"Unable to export {source}")
            raw = result.stdout.strip()
            if not raw:
                print(f"{source}: absent")
                continue
            value = json.loads(raw)
            encoded = json.dumps(value, separators=(",", ":"))
            def command(parts: list[str]) -> object:
                request = urllib.request.Request(
                    url,
                    data=json.dumps(parts).encode(),
                    headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(request, timeout=20) as response:
                    answer = json.load(response)
                if "error" in answer:
                    raise RuntimeError("Redis command failed")
                return answer.get("result")
            if command(["SET", target, encoded]) != "OK":
                raise RuntimeError(f"Redis did not acknowledge {source}")
            if command(["GET", target]) != encoded:
                raise RuntimeError(f"Redis readback failed for {source}")
            print(f"{source}: transferred and verified")


if __name__ == "__main__":
    main()
