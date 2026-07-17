import "server-only";

export type OllamaConfig = { baseUrl: string; model: string; temperature: number; context: number; threads: number };
export function getOllamaConfig(): OllamaConfig { return { baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434", model: process.env.OLLAMA_MODEL ?? "", temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0), context: Number(process.env.OLLAMA_CONTEXT ?? 8192), threads: Number(process.env.OLLAMA_THREADS ?? 4) }; }
export async function getOllamaStatus(): Promise<{ configured: boolean; connected: boolean; config: OllamaConfig }> { const config = getOllamaConfig(); if (!config.model) return { configured: false, connected: false, config }; try { const response = await fetch(`${config.baseUrl}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(700) }); return { configured: true, connected: response.ok, config }; } catch { return { configured: true, connected: false, config }; } }
// Recommendation calls are intentionally not implemented in this sprint. Database writes never belong here.
