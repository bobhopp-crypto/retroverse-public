import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { creativeLabProjectExportsDir } from "./paths";
import type { PassExportReport } from "./pass-export-composite";
import { emptyQrZoneAudit } from "./qr-zone-render";

export type ProjectExportStatus = {
  exportDir: string;
  zipFilename: string | null;
  zipRel: string | null;
  frontFilename: string;
  backFilename: string;
  report: PassExportReport | null;
};

export async function getProjectExportStatus(
  projectFolder: string,
  projectId: string,
): Promise<ProjectExportStatus | null> {
  const exportDir = creativeLabProjectExportsDir(projectFolder);
  if (!existsSync(exportDir)) return null;

  const entries = await readdir(exportDir, { withFileTypes: true });
  const zips = entries
    .filter((e) => e.isFile() && e.name.endsWith(".zip"))
    .map((e) => e.name)
    .sort();
  const zipFilename = zips.at(-1) ?? null;
  const zipRel = zipFilename ? `exports/${zipFilename}` : null;

  const finalsDir = join(exportDir, "finals");
  const frontFilename = "final-front.png";
  const backFilename = "final-back.png";
  const hasFinals =
    existsSync(join(finalsDir, frontFilename)) && existsSync(join(finalsDir, backFilename));
  if (!zipFilename && !hasFinals) return null;

  let report: PassExportReport | null = null;
  const reportPath = join(exportDir, "export-report.json");
  if (existsSync(reportPath)) {
    try {
      report = JSON.parse(await readFile(reportPath, "utf8")) as PassExportReport;
    } catch {
      report = null;
    }
  }

  if (!report && hasFinals) {
    report = {
      exportedAt: "",
      projectId,
      qrUrl: "",
      front: { filename: frontFilename, path: join(finalsDir, frontFilename) },
      back: { filename: backFilename, path: join(finalsDir, backFilename) },
      package: zipFilename
        ? { filename: zipFilename, path: join(exportDir, zipFilename), rel: zipRel! }
        : { filename: "", path: "", rel: "" },
      qrVerification: {
        ok: false,
        decodedUrl: null,
        expectedUrl: "",
        notes: [],
        physicalWidthIn: 0,
        physicalHeightIn: 0,
        pixelSize: { width: 0, height: 0 },
        minSizeIn: 1.5,
        sizePass: false,
        decodePass: false,
        zoneAudit: emptyQrZoneAudit(),
      },
      textGovernance: { note: "Export report missing — files found on disk." },
    };
  }

  return {
    exportDir,
    zipFilename,
    zipRel,
    frontFilename,
    backFilename,
    report,
  };
}
