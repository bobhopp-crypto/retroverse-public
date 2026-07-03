export function directorWorkspacePath(rvtr: string): string {
  return `/ops/studio/director/workspace/${rvtr.trim().toUpperCase()}`;
}
