#!/usr/bin/env python3
import json, os, subprocess, time
from pathlib import Path

INV=Path('/Users/bobhopp/RETROVERSE_DATA/generated/production-video-inventory.json'); OUT=Path('/Users/bobhopp/RETROVERSE_DATA/generated/production-readiness-snapshot.json')
def main():
    started=time.time(); inv=json.loads(INV.read_text()); rows=inv['records']; pkg_set={x.get('rvtr') for x in json.loads(Path('data/ops/intelligence/package-index.json').read_text()).get('packages',[])}
    if len(rows)!=8807 or any('/Users/bobhopp/DJ MEDIA/VIDEO/' not in r['activePath'] for r in rows): raise SystemExit('invalid inventory input')
    rv=sorted({e['rvtr'] for r in rows for e in r.get('xmlEvidence',[]) if e.get('rvtr')}); vals=','.join("('%s')"%x for x in rv)
    sql=f"WITH r(rvtr) AS (VALUES {vals}), c AS (SELECT r.rvtr,ctd.id track_id,ctd.artist_id,ar.canonical_name artist,ctd.first_chart_date::text chart_date,ctd.has_hot100,ctd.track_family_id FROM r LEFT JOIN canonical_track_display ctd ON upper(trim(ctd.track_id::text))=r.rvtr LEFT JOIN artists ar ON ar.id=ctd.artist_id), a AS (SELECT c.rvtr,al.id album_id,al.title album_title,al.release_year,ek.external_key rval,al.canonical_cover_path cover_path FROM c JOIN canonical_album_tracks cat ON upper(trim(cat.canonical_track_key))=c.rvtr JOIN albums al ON al.id=cat.album_id LEFT JOIN album_external_keys ek ON ek.album_id=al.id AND ek.source='rval' WHERE c.track_id IS NOT NULL), best AS (SELECT DISTINCT ON (rvtr) * FROM a ORDER BY rvtr, (album_title ILIKE '%greatest hits%')::int, (album_title ILIKE '%compilation%')::int, (album_title ILIKE '%live%')::int, album_id) SELECT c.rvtr,c.track_id,c.artist_id,c.artist,c.chart_date,c.has_hot100,b.album_id,b.rval,b.album_title,b.release_year,b.cover_path FROM c LEFT JOIN best b USING(rvtr);"
    q=subprocess.run(['psql','-h','::1','-p','5432','-d','retroverse','-Atc',sql],capture_output=True,text=True)
    if q.returncode: raise SystemExit(q.stderr)
    canon={}
    for line in q.stdout.splitlines():
        p=line.split('|');
        if len(p)>=11: canon[p[0]]={'track':p[1] or None,'artistId':p[2] or None,'artist':p[3] or None,'year':p[4][:4] if p[4] else None,'chart':p[5]=='t','albumId':p[6] or None,'rval':p[7] or None,'album':p[8] or None,'releaseYear':p[9] or None,'cover':p[10] or None}
    out=[]
    for r in rows:
        ev=r.get('xmlEvidence',[]); rvtr=next((e.get('rvtr') for e in ev if e.get('rvtr')),None); c=canon.get(rvtr,{}) if rvtr else {}
        gates=[]
        if not c.get('track') or not c.get('artistId'): gates += ['canonical_identity']
        elif not c.get('chart'): gates += ['chart']
        if not c.get('albumId') or not c.get('rval'): gates.append('album')
        if not c.get('cover'): gates.append('cover')
        navigation=bool(c.get('track') and c.get('artistId') and c.get('albumId') and c.get('rval') and c.get('year'))
        if not navigation: gates.append('navigation')
        discovery=bool(c.get('track') and c.get('artistId'))
        if not discovery: gates.append('discovery')
        package=bool(rvtr and rvtr in pkg_set)
        if not package: gates.append('package')
        star='★★★★' if c.get('track') and c.get('artistId') and c.get('chart') and not gates else '★★★' if c.get('track') and c.get('artistId') and c.get('chart') else '★★' if c.get('track') and c.get('artistId') else '★'
        e=ev[0] if ev else {}
        out.append({**r,'vdjArtist':e.get('artist'),'vdjTitle':e.get('title'),'vdjAlbum':e.get('album'),'vdjYear':e.get('year'),'rvtrLabel':rvtr,'canonicalRvtr':rvtr if c else None,'canonicalTrackId':c.get('track'),'canonicalArtistId':c.get('artistId'),'canonicalArtistName':c.get('artist'),'primaryAlbumId':c.get('albumId'),'primaryRval':c.get('rval'),'primaryAlbumTitle':c.get('album'),'primaryAlbumType':None,'canonicalYear':c.get('year'),'chartRelationship':c.get('chart',False),'verifiedCoverSource':c.get('cover'),'songRoute':f'/retroverse-2/song/{rvtr}' if c.get('track') else None,'artistRoute':f"/artist/{c['artistId']}" if c.get('artistId') else None,'albumRoute':f"/album/{c['rval']}" if c.get('rval') else None,'yearRoute':f"/rv/{c['year']}" if c.get('year') else None,'discovery':discovery,'navigationValid':navigation,'packageAvailable':package,'resolverWarnings':[],'failedFourStarGates':gates,'highestEarnedStar':star})
    generated=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()); [x.update(generatedAt=generated) for x in out]
    star_media={s:sum(x['highestEarnedStar']==s for x in out) for s in ['★','★★','★★★','★★★★','★★★★★']}; star_rv={s:len({x['canonicalRvtr'] for x in out if x['highestEarnedStar']==s and x['canonicalRvtr']}) for s in star_media}; failed={g:sum(g in x['failedFourStarGates'] for x in out) for g in ['canonical_identity','chart','album','cover','discovery','navigation','package']}
    snap={'schema':'retroverse.production-readiness.v1','generatedAt':generated,'sourceInventoryGeneratedAt':inv.get('generatedAt'),'generationDurationMs':round((time.time()-started)*1000,2),'rowCount':len(out),'distinctCanonicalRvtr':len({x['canonicalRvtr'] for x in out if x['canonicalRvtr']}),'starCountsByMedia':star_media,'starCountsByRvtr':star_rv,'failedFourStarGates':failed,'records':out}
    OUT.parent.mkdir(parents=True,exist_ok=True); tmp=OUT.with_suffix('.tmp'); tmp.write_text(json.dumps(snap)); os.replace(tmp,OUT); print(json.dumps({k:snap[k] for k in ['generatedAt','generationDurationMs','rowCount','distinctCanonicalRvtr','starCountsByMedia','starCountsByRvtr','failedFourStarGates']},indent=2))
if __name__=='__main__': main()
