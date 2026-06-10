import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

import { finalExportFilename } from "./assets";
import {
  creativeLabProjectDir,
  creativeLabProjectExportsDir,
  creativeLabProjectGeneratedDir,
  creativeLabProjectPath,
  creativeLabProjectSelectedDir,
} from "./paths";
import type { CreativeLabProjectFile, FinalAssetSlot } from "./types";
import { FINAL_ASSET_SLOTS } from "./types";

const execFileAsync = promisify(execFile);

function packageBaseName(project: CreativeLabProjectFile): string {
  const slug = project.folderSlug || project.id;
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

async function zipDirectory(sourceDir: string, zipPath: string): Promise<void> {
  await mkdir(dirname(zipPath), { recursive: true });
  if (process.platform === "darwin") {
    await execFileAsync("zip", ["-r", zipPath, "."], { cwd: sourceDir });
    return;
  }
  await writeFile(zipPath, `ZIP export requires macOS zip CLI. Source: ${sourceDir}\n`, "utf8");
}

export async function exportProjectPackage(project: CreativeLabProjectFile): Promise<{
  zipPath: string;
  zipRel: string;
}> {
  const projectId = project.folderSlug || project.id;
  const exportsDir = creativeLabProjectExportsDir(projectId);
  await mkdir(exportsDir, { recursive: true });

  const staging = join(exportsDir, `_package-staging-${Date.now()}`);
  await mkdir(staging, { recursive: true });

  const items = ["project.json", "prompts", "concepts", "selected", "generated"] as const;
  const root = creativeLabProjectDir(projectId);
  for (const item of items) {
    const src = join(root, item);
    if (!existsSync(src)) continue;
    if (item === "project.json") {
      await copyFile(creativeLabProjectPath(projectId), join(staging, "project.json"));
    } else {
      await cp(src, join(staging, item), { recursive: true });
    }
  }

  const zipName = `${packageBaseName(project)}.zip`;
  const zipPath = join(exportsDir, zipName);
  await zipDirectory(staging, zipPath);

  return { zipPath, zipRel: `exports/${zipName}` };
}

export async function exportFinalDeliverables(project: CreativeLabProjectFile): Promise<{
  files: string[];
  exportDir: string;
}> {
  const projectId = project.folderSlug || project.id;
  const finalsDir = join(creativeLabProjectExportsDir(projectId), "finals");
  await mkdir(finalsDir, { recursive: true });

  const written: string[] = [];
  for (const slot of FINAL_ASSET_SLOTS) {
    const assetId = project.finalAssetSlots[slot];
    if (!assetId) continue;
    const asset = project.assets.find((a) => a.id === assetId);
    if (!asset || asset.status !== "final") continue;

    const outName = finalExportFilename(slot);
    const outPath = join(finalsDir, outName);
    const placeholderSrc = join(creativeLabProjectGeneratedDir(projectId), `${asset.id}.placeholder.json`);
    if (existsSync(placeholderSrc)) {
      await copyFile(placeholderSrc, outPath.replace(/\.png$/, ".placeholder.json"));
      written.push(outPath.replace(/\.png$/, ".placeholder.json"));
    } else {
      await writeFile(
        outPath.replace(/\.png$/, ".placeholder.json"),
        `${JSON.stringify({ slot, asset_id: assetId, status: "final" }, null, 2)}\n`,
        "utf8",
      );
      written.push(outPath.replace(/\.png$/, ".placeholder.json"));
    }
  }

  return { files: written, exportDir: finalsDir };
}
