import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "./route";

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const song = { title: "Dreams", artist: "Fleetwood Mac", year: 1977 };
const messages = [{ role: "user" as const, content: "Who plays on this recording?" }];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

function request(body: unknown) {
  return new Request("https://retroverse.test/api/arvey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("requires a selected song and a bounded latest user message", async () => {
  const noSong = await POST(request({ messages }));
  assert.equal(noSong.status, 400);
  const tooLong = await POST(request({ currentSong: song, messages: [{ role: "user", content: "x".repeat(1401) }] }));
  assert.equal(tooLong.status, 400);
});

test("uses gpt-6-luna with bounded Responses input and sanitizes structured output", async () => {
  process.env.OPENAI_API_KEY = "test-only-key";
  let captured: { url: string; body: Record<string, unknown> } | undefined;
  globalThis.fetch = async (input, init) => {
    captured = { url: String(input), body: JSON.parse(String(init?.body)) };
    return new Response(JSON.stringify({ output_text: JSON.stringify({
      explanation: { title: "Session players", text: "A concise answer." },
      timeline: [{ date: "1977", title: "Album release", detail: "The song appeared on Rumours." }],
      facts: [{ label: "Album", value: "Rumours" }],
      media_card: { title: "Listening note", description: "A recognizable bass part anchors the arrangement." },
      sources: [{ title: "Unsafe source", url: "javascript:alert(1)" }, { title: "Official site", url: "https://example.org/music" }],
    }) }), { headers: { "content-type": "application/json" } });
  };
  const response = await POST(request({ currentSong: song, messages }));
  assert.equal(response.status, 200);
  assert.equal(captured?.url, "https://api.openai.com/v1/responses");
  assert.equal(captured?.body.model, "gpt-6-luna");
  assert.equal(captured?.body.max_output_tokens, 950);
  assert.equal(captured?.body.store, false);
  const data = await response.json() as { answer: string; components: { explanation: { text: string }; timeline: unknown[]; facts: unknown[]; media_card: { description: string }; sources: Array<{ url: string }> } };
  assert.match(data.answer, /A concise answer\./);
  assert.equal(data.components.explanation.text, "A concise answer.");
  assert.equal(data.components.timeline.length, 1);
  assert.equal(data.components.facts.length, 1);
  assert.ok(data.components.media_card.description);
  assert.deepEqual(data.components.sources.map((item) => item.url), ["https://example.org/music"]);
});

test("does not call the model when server credentials are unavailable", async () => {
  delete process.env.OPENAI_API_KEY;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("should not call fetch"); };
  const response = await POST(request({ currentSong: song, messages }));
  assert.equal(response.status, 503);
  assert.equal(called, false);
});
