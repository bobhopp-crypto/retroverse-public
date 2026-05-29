import { opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";

/**
 * VirtualDJ performance-year filter for Year Workspace.
 * `year_text` is Bob's performance classification (authoritative here).
 * Requires decade-folder path alignment (same rules as ops path parsing).
 */
export function vdjPerformanceYearSql(year: number, alias = "ma"): string {
  const decade = Math.floor(year / 10) * 10;
  const a = alias;
  return `
    AND (
      trim(coalesce(${a}.year_text, '')) = '${year}'
      OR (
        coalesce(${a}.year_text, '') ~ '^[0-9]{4}'
        AND substring(trim(coalesce(${a}.year_text, '')) from 1 for 4)::int = ${year}
      )
    )
    AND (
      coalesce(${a}.source_path, ${a}.directory_path, '') ~* '/${decade}s(/|$)'
      OR coalesce(${a}.source_path, ${a}.directory_path, '') ~* '/${decade}''s(/|$)'
      OR coalesce(${a}.source_path, ${a}.directory_path, '') ~* '/${year}(/|$)'
    )
    ${opsVideoMediaAndClause(a)}
  `;
}
