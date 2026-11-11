import "server-only";
import { songChatPost } from "../../../../lib/song-research/chat-http";

export const maxDuration = 10;
// This endpoint exposes validation and disabled/unavailable states, not paid AI.
export const POST = songChatPost;
