#!/usr/bin/env python3
"""Save the public hosted video/YouTube playback links without local media paths."""
import gzip
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
values = {}
for line in Path('/Users/bobhopp/RETROVERSE_PUBLIC/.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key, value = line.split('=', 1)
        values[key] = value.strip().strip('"').strip("'")
env = os.environ.copy()
for suffix in ('HOST', 'PORT', 'DATABASE', 'USER', 'PASSWORD'):
    env['PG' + suffix] = values['RETROVERSE_PASS_PG_' + suffix]
env['PGSSLMODE'] = 'require' if values.get('RETROVERSE_PASS_PG_SSL') != '0' else 'disable'

def rows(sql):
    result = subprocess.run(['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql],
                            env=env, capture_output=True, check=True, timeout=300)
    return [json.loads(line) for line in result.stdout.splitlines() if line]

video_sql = """
SELECT row_to_json(x) FROM (
  SELECT DISTINCT ON (upper(trim(ctd.track_id)))
    upper(trim(ctd.track_id)) AS rvtr, ma.id AS media_id, ma.r2_media_key AS media_key
  FROM media_track_links mtl
  JOIN media_assets ma ON ma.id = mtl.media_asset_id
  JOIN canonical_track_display ctd ON ctd.graph_track_id::text = mtl.track_id::text
  WHERE upper(trim(ctd.track_id)) ~ '^RVTR[0-9]{6}$'
    AND coalesce(ma.source_path, ma.directory_path, '') ILIKE '%/VIDEO/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/MUSIC/%'
    AND coalesce(ma.source_path, ma.directory_path, '') NOT ILIKE '%/VIDEO VAULT/%'
    AND (lower(coalesce(ma.file_extension, '')) IN ('mp4','mkv','mov','avi','m4v')
      OR lower(coalesce(ma.filename, '')) ~ '\\.(mp4|mkv|mov|avi|m4v)$')
  ORDER BY upper(trim(ctd.track_id)), mtl.confidence_score DESC NULLS LAST, ma.id ASC
) x
"""
youtube_sql = """
SELECT row_to_json(x) FROM (
  SELECT DISTINCT ON (upper(trim(yvt.rvtr)))
    upper(trim(yvt.rvtr)) AS rvtr, yv.youtube_id
  FROM youtube_video_tracks yvt
  JOIN youtube_videos yv ON yv.youtube_id = yvt.youtube_video_id
  WHERE upper(trim(yvt.rvtr)) ~ '^RVTR[0-9]{6}$'
    AND yvt.review_flag IN ('approved', 'pending')
    AND yvt.confidence IN ('exact', 'high')
  ORDER BY upper(trim(yvt.rvtr)),
    CASE yvt.confidence WHEN 'exact' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
    yvt.id ASC
) x
"""
videos = rows(video_sql)
youtube = rows(youtube_sql)
catalog = {}
for row in videos:
    catalog[row['rvtr']] = {'mediaId': row['media_id'], 'mediaKey': row['media_key'], 'youtubeId': None}
for row in youtube:
    catalog.setdefault(row['rvtr'], {'mediaId': None, 'mediaKey': None, 'youtubeId': None})['youtubeId'] = row['youtube_id']
target = root / 'data/static-graph/playback-map.json.gz'
target.write_bytes(gzip.compress(json.dumps(catalog, separators=(',', ':')).encode(), compresslevel=9, mtime=0))
if len(json.loads(gzip.decompress(target.read_bytes()))) != len(catalog):
    raise RuntimeError('Playback map round-trip failed')
print(f'playback links: {len(videos)} video rows, {len(youtube)} YouTube rows, {len(catalog)} identities')
