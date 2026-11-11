export type ChartNote = { track: string; title: string; artist: string; year: number; peak: number; weeks: number; first: string; last: string };
export type PublicLiveNotes = { source: "vdj-public-v1"; comment: string; tags: string[]; chart: ChartNote | null };
type Identity = { artist?: string; title?: string; rvtr?: string | null };
const norm=(v:string)=>v.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase();
const cleanText=(v:unknown):v is string=>typeof v==="string"&&v.length>0&&v.length<=240&&!/[\u0000-\u001f<>]/.test(v)&&!/(?:\/Users\/|\/home\/|https?:|User[12]|DMX|password|secret)/i.test(v);
function date(v:unknown):v is string {if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(`${v}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
export function validChartNote(raw:unknown,identity?:Identity):ChartNote|null {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;const c=raw as ChartNote;
 if(!/^RVTR\d{6}$/.test(c.track)||!cleanText(c.title)||!cleanText(c.artist)||!Number.isInteger(c.year)||c.year<1900||c.year>2100||!Number.isInteger(c.peak)||c.peak<1||c.peak>100||!Number.isInteger(c.weeks)||c.weeks<1||c.weeks>1040||!date(c.first)||!date(c.last)||c.first>c.last)return null;
 if(c.weeks>Math.floor((Date.parse(c.last)-Date.parse(c.first))/604800000)+1)return null;
 if(identity&&((identity.artist&&norm(identity.artist)!==norm(c.artist))||(identity.title&&norm(identity.title)!==norm(c.title))||(identity.rvtr&&identity.rvtr.toUpperCase()!==c.track)))return null;
 return {track:c.track,title:c.title,artist:c.artist,year:c.year,peak:c.peak,weeks:c.weeks,first:c.first,last:c.last};
}
/** Only structured RVWEB chart notes and Genre. Raw comments/operational fields never pass. */
export function normalizePublicNotes(raw:unknown,identity?:Identity):PublicLiveNotes {
 const empty:PublicLiveNotes={source:"vdj-public-v1",comment:"",tags:[],chart:null};
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return empty;const obj=raw as Record<string,unknown>;
 if(obj.source!=="vdj-public-v1")return empty;
 const tags=(Array.isArray(obj.tags)?obj.tags:[]).filter((v):v is string=>typeof v==="string").map(v=>v.trim()).filter(v=>v.length>0&&v.length<=64&&/^[\p{L}\p{N} &/().,+'-]+$/u.test(v)&&!/RVTR|User[12]|DMX|lighting|\/Users\/|\/home\//i.test(v)).slice(0,3);
 const chart=validChartNote(obj.chart,identity);
 const comment=chart?`VDJ chart notes · ${chart.year} · Hot 100 peak #${chart.peak} · ${chart.weeks} chart weeks · ${chart.first} to ${chart.last}`:"";
 return {source:"vdj-public-v1",comment,tags:[...new Set(tags)],chart};
}
/** Grammar observed in 11 bounded XML samples. Unknown keys/duplicates/ambiguous blocks fail closed. */
export function parseRvwebComment(comment:string,identity?:Identity):ChartNote|null {
 if(comment.length>2400)return null;const lines=comment.split("\n");if(lines.length!==9||lines[0]!=="RVWEB/3")return null;
 const keys=["track","title","artist","year","hot100_peak","hot100_weeks","hot100_first","hot100_last"];
 const values:Record<string,string>={};
 for(let i=1;i<lines.length;i++){const at=lines[i].indexOf("=");if(at<1)return null;const key=lines[i].slice(0,at);if(key!==keys[i-1]||Object.hasOwn(values,key))return null;values[key]=lines[i].slice(at+1);}
 for(const k of ["year","hot100_peak","hot100_weeks"])if(!/^\d+$/.test(values[k]))return null;
 return validChartNote({track:values.track,title:values.title,artist:values.artist,year:Number(values.year),peak:Number(values.hot100_peak),weeks:Number(values.hot100_weeks),first:values.hot100_first,last:values.hot100_last},identity);
}

/** Saved VDJ Tags Year only; no date/prose coercion. */
export function normalizeVdjYear(value:unknown):number|null {
 return typeof value==="number"&&Number.isInteger(value)&&value>=1900&&value<=2100?value:null;
}
