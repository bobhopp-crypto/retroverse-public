import { songResearchSelectionToken } from "./song-research-selection";
import { isFreshBridgeLiveSelection } from "../sunday-nights/live-freshness";
import { normalizePublicNotes, normalizeVdjYear } from "../sunday-nights/public-notes";
import type { SundayNightsState } from "../sunday-nights/types";
/** Pure allowlisted identity snapshot; never performs catalog/package/disk enrichment. */
export function publicLiveIdentity(state:SundayNightsState,now=Date.now()) {
 if(!isFreshBridgeLiveSelection(state,now)||!state.live)return null;
 const live=state.live;const rvtr=live.rvtr&&/^RVTR\d{6}$/i.test(live.rvtr)?live.rvtr.toUpperCase():null;
 const publicNotes=normalizePublicNotes(live.publicNotes,{title:live.title,artist:live.artist,rvtr});
 return {...(Object.hasOwn(live,"vdjYear")?{vdjYear:normalizeVdjYear(live.vdjYear)}:{}),rvtr,source:"bridge" as const,playing:true,title:live.title,artist:live.artist,year:normalizeVdjYear(live.vdjYear)??live.year??publicNotes.chart?.year??null,
  researchSelectionToken:songResearchSelectionToken(live),bridgeTimestamp:live.bridgeTimestamp,startedAt:live.startedAt,durationSeconds:live.durationSeconds,
  publicNotes};
}
