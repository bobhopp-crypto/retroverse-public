import "server-only";
import { songChatPost } from "../../../../lib/song-research/chat-http";

export const maxDuration = 35;
// Runtime opt-in and approved project policy remain mandatory for paid AI.
export const POST = songChatPost;
