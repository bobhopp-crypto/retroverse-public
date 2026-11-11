import "server-only";
import { BUDGET_SCRIPT, createRedisAtomicStore, createSharedBudgetGate, type BudgetConfig } from "./shared-budget";
import { createOpenAITransport } from "./openai-transport";
import { createSongResearchService } from "./service";
import type { Config, Dependencies } from "./openai-adapter";

const unavailable = () => new Error("Research service unavailable");
const nameValid = (name: string) => /^[A-Z][A-Z0-9_]{0,79}$/.test(name);
function bounded<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve,reject) => {
    if(signal.aborted){reject(unavailable());return;}
    const abort=()=>reject(unavailable());signal.addEventListener("abort",abort,{once:true});
    Promise.resolve().then(()=>{if(signal.aborted)throw unavailable();return work();}).then(resolve,reject).finally(()=>signal.removeEventListener("abort",abort));
  });
}
/** No process.env reference or default variable names. Caller must supply ONLY an
 * explicitly approved map. No enumeration, cached secrets, fallback names, or logs.
 */
export function createApprovedSecretLoader(getApprovedEnvironment: () => Readonly<Record<string,string|undefined>>, name: string) {
  return async (signal: AbortSignal): Promise<string> => {
    try {
      if(signal.aborted || !nameValid(name))throw unavailable();
      const value=getApprovedEnvironment()[name];
      if(signal.aborted || typeof value!=="string" || !value || value.length>4096 || /[\s\u0000-\u001f\u007f]/.test(value))throw unavailable();
      return value;
    } catch { throw unavailable(); }
  };
}

export function createBudgetRedisCommand(config: { endpoint: string; scope: string }, dependencies: {
  loadCredential(signal: AbortSignal): Promise<string>;
  fetch(url: string, init: RequestInit): Promise<Response>;
}) {
  // Exact approved HTTPS origin, without URL credential/query/path leakage. Explicit
  // endpoint approval is still required; syntactic validation grants no permission.
  let endpoint: string | null=null;
  try {const u=new URL(config.endpoint);if(u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==="/"&&!u.port&&/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(u.hostname)&&!u.hostname.endsWith(".localhost")&&config.endpoint.length<2048)endpoint=u.origin;}catch{}
  const key=/^[a-z0-9-]{1,60}$/.test(config.scope)?`rv:research:budget:{${config.scope}}:v1`:null;
  const load=dependencies.loadCredential,fetchResponse=dependencies.fetch;
  return async (args: (string|number)[],signal: AbortSignal): Promise<unknown> => {
    let reader: ReadableStreamDefaultReader<Uint8Array>|undefined;
    try {
      if(!endpoint||!key||signal.aborted||args.length!==14||args[0]!=="EVAL"||args[1]!==BUDGET_SCRIPT||args[2]!==1||args[3]!==key||!["reserve","check","finish"].includes(String(args[4])))throw unavailable();
      if(args.slice(4).some(v=>typeof v!=="string"||v.length>200))throw unavailable();
      const credential=await bounded(()=>load(signal),signal);
      if(signal.aborted||typeof credential!=="string"||!credential||credential.length>4096||/[\s\u0000-\u001f\u007f]/.test(credential))throw unavailable();
      const response=await bounded(()=>fetchResponse(endpoint!,{method:"POST",redirect:"error",credentials:"omit",cache:"no-store",signal,headers:{Authorization:`Bearer ${credential}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(args)}),signal);
      if(!response.ok||response.redirected||!response.body){void response.body?.cancel().catch(()=>{});throw unavailable();}
      const length=response.headers.get("content-length");if(length!==null&&(!/^\d+$/.test(length)||Number(length)>65536)){void response.body.cancel().catch(()=>{});throw unavailable();}
      reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
      for(;;){const part=await bounded(()=>reader!.read(),signal);if(part.done)break;size+=part.value.byteLength;if(size>65536)throw unavailable();chunks.push(part.value);}
      if(signal.aborted)throw unavailable();const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
      const parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||parsed.error!=null||(parsed.result!==0&&parsed.result!==1))throw unavailable();
      return parsed.result;
    } catch {throw unavailable();}finally{if(reader)void reader.cancel().catch(()=>{});}
  };
}

/** Explicit server-only opt-in composition; never imported by the disabled default.
 * Names/endpoints are supplied by approved deployment configuration, not guessed.
 * This factory makes no calls. An enabled invocation can spend money: activation
 * and credential permissions plus a verified cost bound are prerequisites.
 */
export function createConfiguredResearchService(config: {
  adapter: Config; budget: BudgetConfig; redisEndpoint: string; openAIProjectId?: string;
  openAISecretName: string; redisSecretName: string;
}, dependencies: {
  getApprovedEnvironment(): Readonly<Record<string,string|undefined>>;
  fetch(url: string,init: RequestInit): Promise<Response>;
  readVerifiedCurrent: Dependencies["readVerifiedCurrent"];
  now?: () => number;
}) {
  const redisCommand=createBudgetRedisCommand({endpoint:config.redisEndpoint,scope:config.budget.scope},{loadCredential:createApprovedSecretLoader(dependencies.getApprovedEnvironment,config.redisSecretName),fetch:dependencies.fetch});
  const sameModel=config.adapter.model===config.budget.model;
  return createSongResearchService(config.adapter,{
    readVerifiedCurrent:dependencies.readVerifiedCurrent,now:dependencies.now,
    approveShared:createSharedBudgetGate(sameModel?config.budget:null,createRedisAtomicStore(redisCommand)),
    transport:createOpenAITransport({projectId:config.openAIProjectId,loadCredential:createApprovedSecretLoader(dependencies.getApprovedEnvironment,config.openAISecretName),fetch:dependencies.fetch}),
  });
}
