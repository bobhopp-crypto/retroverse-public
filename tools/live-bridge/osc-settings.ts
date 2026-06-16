import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type VdjOscSettings = {
  oscPort: number;
  oscPortBack: number;
  settingsPath: string | null;
};

function settingsPaths(): string[] {
  const home = homedir();
  return [
    join(home, "Library/Application Support/VirtualDJ/settings.xml"),
    join(home, "Documents/VirtualDJ/settings.xml"),
  ];
}

function parsePort(xml: string, name: string): number | null {
  const tagM = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`, "i"));
  if (tagM?.[1]) {
    const n = Number(tagM[1].trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Read oscPort / oscPortBack from VirtualDJ settings.xml when env is unset. */
export function readVdjOscSettings(): VdjOscSettings {
  for (const path of settingsPaths()) {
    if (!existsSync(path)) continue;
    try {
      const xml = readFileSync(path, "utf8");
      const oscPort = parsePort(xml, "oscPort");
      const oscPortBack = parsePort(xml, "oscPortBack");
      return {
        oscPort: oscPort ?? 9000,
        oscPortBack: oscPortBack ?? 9001,
        settingsPath: path,
      };
    } catch {
      /* try next */
    }
  }
  return { oscPort: 9000, oscPortBack: 9001, settingsPath: null };
}
