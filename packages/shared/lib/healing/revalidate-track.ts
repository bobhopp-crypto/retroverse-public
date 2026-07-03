import { revalidatePath } from "next/cache";

import { SONG_EXPERIENCE_PREFIX } from "@/lib/search/entity-routes";

export function revalidateTrackPage(rvtr: string): void {
  const id = rvtr.trim().toUpperCase();
  revalidatePath(`${SONG_EXPERIENCE_PREFIX}/${id}`);
  revalidatePath(`/track/${id}`);
}
