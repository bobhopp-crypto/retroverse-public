#!/usr/bin/env python3
"""Filesystem-first, read-only production inventory."""
import html, json, os, re, time
from pathlib import Path

ROOT=Path('/Users/bobhopp/DJ MEDIA/VIDEO'); XML=Path('/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml'); OUT=Path('/Users/bobhopp/RETROVERSE_DATA/generated/production-video-inventory.json')

def attrs(s): return {k:html.unescape(v) for k,v in re.findall(r'(\w+)="([^"]*)"',s)}
def main():
    now=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()); files={}
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.mp4','.mpg','.mpeg'}:
            rel=str(p.relative_to(ROOT)); st=p.stat(); files[str(p)]={'activePath':str(p),'relativeProductionPath':rel,'filename':p.name,'extension':p.suffix.lower(),'size':st.st_size,'modifiedTime':st.st_mtime,'firstFilesystemScanTime':now,'lastFilesystemScanTime':now,'xmlEvidence':[],'warnings':[]}
    if len(files)!=8807: raise SystemExit(f'filesystem inventory failed: {len(files)} files (expected 8807)')
    text=XML.read_text(errors='replace'); raw_obs=0; legacy_only=0; vault=0
    for m in re.finditer(r'FilePath="([^"]*)"',text):
        raw=html.unescape(m.group(1)); active=raw if raw.startswith(str(ROOT)+'/') else None; legacy=raw if raw.startswith('/Volumes/DJ  MAIN/DJ MEDIA/VIDEO/') else None
        if '/VIDEO VAULT/' in raw: vault+=1
        if not active and not legacy: continue
        raw_obs+=1; rel=(active or legacy).split('/DJ MEDIA/VIDEO/',1)[1]; ap=str(ROOT/rel); end=text.find('</Song>',m.end()); block=text[m.start():end if end>=0 else m.end()+3000]; tag=re.search(r'<Tags\b([^>]*)',block); t=attrs(tag.group(1)) if tag else {}; labels=re.findall(r'RVTR\d{6}',t.get('Label',''))
        evidence={'rawFilepath':raw,'provenance':'active' if active else 'legacy','artist':t.get('Author'),'title':t.get('Title'),'album':t.get('Album'),'year':t.get('Year'),'label':t.get('Label'),'rvtr':labels[0] if labels else None,'warning':'duplicate/conflicting path observation' if len(re.findall(r'FilePath="',block))>1 else None}
        if ap in files: files[ap]['xmlEvidence'].append(evidence)
        elif legacy: legacy_only+=1
    labeled=sum(bool({e['rvtr'] for e in x['xmlEvidence'] if e['rvtr']}) for x in files.values()); rvtrs={e['rvtr'] for x in files.values() for e in x['xmlEvidence'] if e['rvtr']}; evidence_files=sum(bool(x['xmlEvidence']) for x in files.values())
    report={'schema':'retroverse.production-video-inventory.v2','generatedAt':now,'scope':str(ROOT)+'/','filesystem':{'count':len(files)},'xmlEvidence':{'rawObservations':raw_obs,'filesWithEvidence':evidence_files,'filesWithoutEvidence':len(files)-evidence_files,'legacyOnlyObservations':legacy_only,'videoVaultExcluded':vault,'historicalReportedObservations':9163,'historicalReportedMissing':356,'historicalReportedLabeled':8477,'historicalReportedDistinctRvtr':8026},'labelReconciliation':{'existingLabeledFiles':labeled,'existingUnlabeledFiles':len(files)-labeled,'distinctRvtr':len(rvtrs)},'records':list(files.values())}
    OUT.parent.mkdir(parents=True,exist_ok=True); tmp=OUT.with_suffix('.tmp'); tmp.write_text(json.dumps(report)); os.replace(tmp,OUT); print(json.dumps({'filesystemCount':len(files),'xmlObservations':raw_obs,'filesWithEvidence':evidence_files,'labeled':labeled,'distinctRvtr':len(rvtrs),'videoVaultExcluded':vault},indent=2))
if __name__=='__main__': main()
