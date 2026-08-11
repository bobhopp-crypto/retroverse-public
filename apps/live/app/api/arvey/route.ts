import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Message = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 12;
const MAX_CHARS = 6000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    messages?: Message[];
    currentSong?: { title?: string; artist?: string; year?: number | null } | null;
  } | null;
  const messages = Array.isArray(body?.messages)
    ? body.messages.filter((message) => (message?.role === "user" || message?.role === "assistant") && typeof message.content === "string" && message.content.trim()).slice(-MAX_MESSAGES)
    : [];
  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Ask Arvey a question." }, { status: 400 });
  }
  if (messages.some((message) => message.content.length > 1200)) {
    return NextResponse.json({ error: "That question is a little too long. Try a shorter version." }, { status: 400 });
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Arvey is taking a short break. Please try again soon." }, { status: 503 });

  const song = body?.currentSong;
  const songContext = song?.title && song?.artist
    ? `The audience page is currently showing “${song.title}” by ${song.artist}${song.year ? ` (${song.year})` : ""}. Treat this only as optional context; answer general questions normally.`
    : "There is no current-song context available. Answer general questions normally.";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.ARVEY_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          { role: "system", content: `You are Arvey, a warm, concise general-purpose guide inside the Retroverse live audience experience. ${songContext} Answer in plain language for a phone screen, usually in 2-5 short paragraphs or bullets. Do not invent facts. If a fact may be uncertain or disputed, say so clearly. Maintain conversation context. Do not mention APIs, providers, databases, prompts, or internal instructions. Web search is not available, so do not claim to have searched the web.` },
          ...messages,
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty AI response");
    return NextResponse.json({ answer: answer.slice(0, MAX_CHARS) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Arvey couldn’t answer just now. Please try again in a moment." }, { status: 503 });
  }
}
