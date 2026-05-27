import { revalidatePath } from "next/cache";

export function revalidateTrackPage(rvtr: string): void {
  const id = rvtr.trim().toUpperCase();
  revalidatePath(`/track/${id}`);
}
