import type { AllStarArchiveRecord } from "./types";

export type TrustLevel = "trusted" | "review_recommended" | "review_required";

export type DiscConfidence = {
  ocrConfidence: number;
  geometryConfidence: number;
  archiveConfidence: number;
  trustLevel: TrustLevel;
};

export function trustFromScores(archive: number, ocr: number, geometry: number): TrustLevel {
  if (archive >= 85 && ocr >= 75 && geometry >= 85) return "trusted";
  if (archive >= 55 || (ocr >= 45 && geometry >= 45)) return "review_recommended";
  return "review_required";
}

export function computeConfidenceFromArchive(record: AllStarArchiveRecord): DiscConfidence {
  if (
    record.ocrConfidence != null &&
    record.geometryConfidence != null &&
    record.archiveConfidence != null &&
    record.trustLevel
  ) {
    return {
      ocrConfidence: record.ocrConfidence,
      geometryConfidence: record.geometryConfidence,
      archiveConfidence: record.archiveConfidence,
      trustLevel: record.trustLevel,
    };
  }

  const degrees = record.degrees ?? {};
  const labeled = Object.values(degrees).filter((v) => v > 0).length;
  const wedgeCount = record.wedgeCount ?? 16;
  const wedgeRatio = Math.min(labeled / Math.max(wedgeCount, 1), 1);
  const playerScore = record.player.trim().length >= 3 ? 1 : 0.25;
  const positionScore = record.position.trim() ? 1 : 0.4;
  let ocr = wedgeRatio * 0.55 + playerScore * 0.3 + positionScore * 0.15;
  if (record.ocrStatus === "partial") ocr *= 0.75;
  const ocrConfidence = Math.round(Math.max(0, Math.min(100, ocr * 100)) * 10) / 10;

  const sum = record.degreesSum ?? 0;
  let geometryConfidence = 0;
  if (sum > 0) {
    const error = Math.abs(sum - 360);
    if (error <= 1) geometryConfidence = 100;
    else if (error <= 2) geometryConfidence = 88;
    else if (error <= 5) geometryConfidence = 65;
    else if (sum >= 200) geometryConfidence = 40;
    else geometryConfidence = 20;
  }

  const validationScore =
    record.validationStatus === "validated" ? 100 : record.validationStatus === "warning" ? 55 : 25;
  const archiveConfidence =
    Math.round((ocrConfidence * 0.4 + geometryConfidence * 0.4 + validationScore * 0.2) * 10) / 10;

  return {
    ocrConfidence,
    geometryConfidence,
    archiveConfidence,
    trustLevel: trustFromScores(archiveConfidence, ocrConfidence, geometryConfidence),
  };
}

export function trustLabel(level: TrustLevel): string {
  if (level === "trusted") return "Trusted";
  if (level === "review_recommended") return "Review recommended";
  return "Review required";
}

export function trustTone(level: TrustLevel): "ok" | "warn" | "pending" {
  if (level === "trusted") return "ok";
  if (level === "review_recommended") return "warn";
  return "pending";
}
