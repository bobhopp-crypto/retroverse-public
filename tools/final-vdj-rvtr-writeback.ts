require("./finance/preload-server-only.cjs");
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery } from "../packages/shared/lib/inspect/pg";

const ROOT = join(import.meta.dirname, "..");
const LIVE = "/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml";
const OUT = join(ROOT, "reports/vdj-rvtr-rematch/final");
const PHASE1 = join(ROOT, "reports/vdj-rvtr-rematch/database-rvtr-rematched-2026-07-16T20-27-49-731Z.xml");
const PHASE1_ORIGINAL = join(ROOT, "reports/vdj-rvtr-rematch/database-original-2026-07-16T20-27-49-731Z.xml");
const SAFE = [join(ROOT, "reports/vdj-rvtr-rematch-phase3/safe-title-noise.csv"), join(ROOT, "reports/vdj-rvtr-rematch-phase3/same-song-alternate-media.csv")];
const dec = (s:string) => s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const enc = (s:string) => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const attr = (s:string,n:string) => dec(s.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1] ?? "");
const setAttr = (s:string,n:string,v:string) => { const re=new RegExp(`\\s${n}="[^"]*"`); return re.test(s)?s.replace(re,` ${n}="${enc(v)}"`):s.replace(/(\s*\/? >|\s*\/?>)$/,' '+n+'="'+enc(v)+'"$1'); };
function parseCsv(t:string){const out:string[][]=[];let row:string[]=[],c="",q=false;for(let i=0;i<t.length;i++){const x=t[i];if(q){if(x==='"'&&t[i+1]==='"'){c+='"';i++;}else if(x==='"')q=false;else c+=x;}else if(x==='"')q=true;else if(x===','){row.push(c);c='';}else if(x==='\n'){row.push(c);out.push(row);row=[];c='';}else if(x!=='\r')c+=x;}if(c||row.length){row.push(c);out.push(row);}return out.slice(1);}
async function main(){
  await mkdir(OUT,{recursive:true}); const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=join(OUT,`database-original-${stamp}.xml`), candidate=join(OUT,`database-final-candidate-${stamp}.xml`), installed=join(OUT,`database-final-installed-${stamp}.xml`);
  const original=await readFile(LIVE,'utf8'); await copyFile(LIVE,backup); const phase1=await readFile(PHASE1,'utf8'); const phase1Original=await readFile(PHASE1_ORIGINAL,'utf8');
  const safe=new Map<string,string>(); for(const f of SAFE) for(const r of parseCsv(await readFile(f,'utf8'))) if(r[7]==='true') safe.set(r[0],r[3]);
  const phase1Before=new Map<string,{label:string;rating:string}>(); phase1Original.replace(/<Song\s+FilePath="([^"]*)"[^>]*>[\s\S]*?<\/Song>/g,(song,fp)=>{const tags=song.match(/<Tags\b[^>]*\/?\s*>/)?.[0]??"",infos=song.match(/<Infos\b[^>]*\/?\s*>/)?.[0]??"";phase1Before.set(dec(fp).replace(/\\/g,'/'),{label:attr(tags,'Label'),rating:attr(infos,'Rating')});return song;});
  const phase1Map=new Map<string,string>(); phase1.replace(/<Song\s+FilePath="([^"]*)"[^>]*>[\s\S]*?<\/Song>/g,(song,fp)=>{const path=dec(fp).replace(/\\/g,'/');const tags=song.match(/<Tags\b[^>]*\/?\s*>/)?.[0]??"",infos=song.match(/<Infos\b[^>]*\/?\s*>/)?.[0]??"";const label=attr(tags,'Label'), before=phase1Before.get(path);if(/^RVTR\d{6}$/.test(label)&&before&&(before.label!==label||before.rating!==attr(infos,'Rating')))phase1Map.set(path,label);return song;});
  const map=new Map(phase1Map); for(const [p,v] of safe)map.set(p,v); if(map.size!==5458)throw new Error(`Expected 5458 safe mappings, found ${map.size}`);
  const valid=new Set((await inspectQuery<{rvtr:string}>(`SELECT upper(trim(coalesce(retroverse_track_id,track_id))) rvtr FROM canonical_tracks WHERE coalesce(retroverse_track_id,track_id) ~* '^RVTR[0-9]{6}$'`,[])).map(x=>x.rvtr));
  for(const v of map.values())if(!valid.has(v))throw new Error(`RVTR not canonical: ${v}`);
  let seen=0,labels=0,ratings=0,video=0,audioChanged=0; const beforeRatings=new Map<string,string>();
  const updated=original.replace(/<Song\s+FilePath="[^"]*"[^>]*>[\s\S]*?<\/Song>/g,(song)=>{const head=song.match(/^<Song[^>]*>/)?.[0]??"",fp=dec(attr(head,'FilePath')).replace(/\\/g,'/');const tagsM=song.match(/<Tags\b[^>]*\/?\s*>/), infosM=song.match(/<Infos\b[^>]*\/?\s*>/);const path=fp;const rv=map.get(path);if(!tagsM||!infosM)return song;const rating=attr(infosM[0],'Rating');beforeRatings.set(path,rating);const isVideo=/\/VIDEO\//i.test(path);if(!isVideo)return song;video++;if(!rv)return song;seen++;let next=song;const oldLabel=attr(tagsM[0],'Label');if(oldLabel!==rv){next=next.replace(tagsM[0],setAttr(tagsM[0],'Label',rv));labels++;}if(rating==='0'){next=next.replace(infosM[0],setAttr(infosM[0],'Rating','1'));ratings++;}return next;});
  if(seen!==5458||labels>5458)throw new Error(`Write count mismatch: seen=${seen}, labels=${labels}`); await writeFile(candidate,updated,'utf8');
  const parsed=await readFile(candidate,'utf8'); if((parsed.match(/<Song\s+FilePath=/g)??[]).length!==(original.match(/<Song\s+FilePath=/g)??[]).length)throw new Error('Song count changed');
  const parsedLabels=new Map<string,string>(); parsed.replace(/<Song\s+FilePath="([^"]*)"[^>]*>[\s\S]*?<\/Song>/g,(song,fp)=>{const tags=song.match(/<Tags\b[^>]*\/?\s*>/)?.[0]??"";parsedLabels.set(dec(fp).replace(/\\/g,'/'),attr(tags,'Label'));return song;});
  for(const [p,rv] of map)if(parsedLabels.get(p)!==rv)throw new Error(`Missing installed label for ${p}`);
  await copyFile(candidate,LIVE); await copyFile(LIVE,installed); if(await readFile(LIVE,'utf8')!==parsed)throw new Error('Installed XML differs from candidate');
  const allPaths=new Set<string>(); original.replace(/<Song\s+FilePath="([^"]*)"/g,(_,p)=>{allPaths.add(dec(p).replace(/\\/g,'/'));return _;}); const remaining=[...allPaths].filter(p=>/\/VIDEO\//i.test(p)&&!map.has(p));
  await writeFile(join(OUT,'installed-matches.csv'),['File path,RVTR',...map].map(x=>Array.isArray(x)?x.join(','):x).join('\n')+'\n'); await writeFile(join(OUT,'remaining-review.csv'),'File path\n'+remaining.join('\n')+'\n'); await writeFile(join(OUT,'remaining-no-match.csv'),'File path\n\n'); await writeFile(join(OUT,'FINAL-SUMMARY.md'),`# Final VirtualDJ → RVTR Write-back\n\nSafe mappings written: ${seen}\nLabels changed: ${labels}\nRatings changed 0 → 1: ${ratings}\nExisting ratings preserved: ${seen-ratings}\nRemaining VIDEO records: ${remaining.length}\nXML parsed and installed candidate matched exactly.\n`);
  console.log(JSON.stringify({backup,candidate,installed,safeMappings:seen,labelsChanged:labels,ratingsChanged:ratings,existingRatingsPreserved:seen-ratings,remainingReview:remaining.length},null,2));
} main().catch(e=>{console.error(e);process.exit(1);});
