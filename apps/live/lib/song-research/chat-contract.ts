import "server-only";

// Offline contract only. It does not expose a route, activate a provider, or
// establish that the selection token authorizes access to any recording.
export type ChatTurn = { role: "user" | "assistant"; text: string };
export type ChatRequest = { requestId: string; selectionToken: string; mode: "current" | "query" | "followup"; query: string; history: ChatTurn[] };
const inputLimit = 300, answerLimit = 6000, historyLimit = 12, totalLimit = 37800;
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v,k));
const clean = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max && v.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v);

// Call only after bounding raw HTTP body bytes and parsing JSON. All client text,
// including prior assistant messages, is untrusted input, not a source or instruction.
export function parseChatRequest(value: unknown): ChatRequest | null {
  if (!object(value) || !exactKeys(value,["requestId","selectionToken","mode","query","history"])) return null;
  const {requestId,selectionToken,mode,query,history}=value;
  if (typeof requestId !== "string" || !/^[1-9][0-9]{0,15}$/.test(requestId) || typeof selectionToken !== "string" || !/^[a-f0-9]{64}$/.test(selectionToken) || typeof mode !== "string" || !["current","query","followup"].includes(mode) || !clean(query,inputLimit) || !Array.isArray(history) || history.length > historyLimit || history.length % 2 !== 0) return null;
  if ((mode === "current" || mode === "query") && history.length !== 0) return null;
  if (mode === "followup" && history.length === 0) return null;
  const turns: ChatTurn[]=[]; let total=query.length;
  for (let i=0;i<history.length;i++) {
    const v=history[i]; if (!object(v) || !exactKeys(v,["role","text"])) return null;
    const role=i%2 === 0 ? "user" : "assistant";
    if (v.role !== role || !clean(v.text,role === "user" ? inputLimit : answerLimit)) return null;
    total+=v.text.length; if (total>totalLimit) return null;
    turns.push({role,text:v.text});
  }
  return {requestId,selectionToken,mode:mode as ChatRequest["mode"],query,history:turns};
}
