export const MAGAZINE_BENCHMARK_RVTR = "RVTR478078";

export function isMagazineHomepageBenchmark(rvtr: string): boolean {
  return rvtr.toUpperCase() === MAGAZINE_BENCHMARK_RVTR;
}
