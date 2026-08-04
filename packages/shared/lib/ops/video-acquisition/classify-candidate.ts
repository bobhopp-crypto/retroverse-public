import type { CandidateType } from "./types";

export function classifyYouTubeCandidate(
  title: string,
  channel: string,
  durationSeconds: number | null,
): CandidateType {
  const hay = `${title} ${channel}`.toLowerCase();

  if (/audio only|official audio\b/.test(hay) && !/video/.test(hay)) {
    return "audio_only_upload";
  }
  if (/\blyric video\b|\blyrics\b/.test(hay) && !/official music video/.test(hay)) {
    return "lyric_video";
  }
  if (/visualizer|visualiser|spectrum|waveform|audio spectrum/.test(hay)) {
    return "visualizer";
  }
  if (typeof durationSeconds === "number" && durationSeconds > 0 && durationSeconds < 30) {
    if (!/shorts?/i.test(hay)) return "audio_only_upload";
  }
  if (/\bvevo\b/.test(hay) || /\bofficial music video\b/.test(hay)) {
    return "official_music_video";
  }
  if (/\bofficial video\b|\bmusic video\b|\bpromo\b/.test(hay)) {
    return "official_music_video";
  }
  if (/letterman|snl|top of the pops|ed sullivan|tonight show|\btv\b|mtv\b|bbc\b|nbc\b|abc\b|cbs\b/.test(hay)) {
    return "television_performance";
  }
  if (/live at|live from|unplugged|concert|festival|tour\b|wembley|glastonbury/.test(hay)) {
    return "concert_footage";
  }
  if (/\blive\b/.test(hay)) {
    return "official_live_performance";
  }
  if (/\s-\s*topic$/i.test(channel.trim()) || channel.trim().toLowerCase().endsWith(" - topic")) {
    return "official_music_video";
  }
  if (!/vevo|official|records|music|topic/i.test(channel)) {
    return "fan_upload";
  }
  return "unknown";
}

export function candidateTypeLabel(type: CandidateType): string {
  switch (type) {
    case "official_music_video":
      return "Official music video";
    case "official_live_performance":
      return "Official live performance";
    case "television_performance":
      return "Television performance";
    case "concert_footage":
      return "Concert footage";
    case "lyric_video":
      return "Lyric video";
    case "visualizer":
      return "Visualizer";
    case "fan_upload":
      return "Fan upload";
    case "audio_only_upload":
      return "Audio-only upload";
    default:
      return "Unknown";
  }
}
