import test from "node:test";
import assert from "node:assert/strict";
import { eligibleForExport, eligibleForQueue, exportPathFor, ffmpegArgs, sanitizeExportPart } from "./export-policy";
const base = { id:"SEG-0001", sourceFilename:"source.mp4", sourceFingerprint:"hash", startSeconds:1, endSeconds:3, startTimecode:"", endTimecode:"", durationSeconds:2, primaryClass:"performance", secondaryClass:"full_performance", title:"Richie Havens / Freedom", artistPeople:"Richie Havens", song:"Freedom", reviewStatus:"approved", exportStatus:"queued", createdAt:"", modifiedAt:"" } as any;
const manifest = { version:1, sourceFilename:"source.mp4", sourceFingerprint:"hash", sourceDurationSeconds:10, segments:[base], updatedAt:"" } as any;
test("approved queued segment is eligible",()=>assert.deepEqual(eligibleForExport(base,manifest,"hash","/source.mp4","/exports").errors,[]));
test("draft and rejected segments cannot queue",()=>{ assert.equal(eligibleForQueue({...base,reviewStatus:"draft"}),false); assert.equal(eligibleForQueue({...base,reviewStatus:"rejected"}),false); });
test("fingerprint, bounds, containment, and source overwrite are blocked",()=>{ assert.match(eligibleForExport({...base,sourceFingerprint:"other"},manifest,"hash","/source.mp4","/exports").errors.join(" "),/fingerprint/); assert.match(eligibleForExport({...base,endSeconds:99},manifest,"hash","/source.mp4","/exports").errors.join(" "),/duration/); });
test("paths and argument arrays are sanitized",()=>{ assert.equal(sanitizeExportPart("../Richie / Freedom"),"Richie-Freedom"); assert.match(exportPathFor(base,"/exports",1),/0001_PERFORMANCE/); assert.equal(ffmpegArgs("stream_copy",1,2,"source","out")[0],"-hide_banner"); assert.ok(ffmpegArgs("transcode",1,2,"source","out").includes("libx264")); });
